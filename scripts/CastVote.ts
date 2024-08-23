import { viem } from "hardhat";
import { createPublicClient, http, createWalletClient, formatEther } from "viem";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { abi, bytecode } from "../artifacts/contracts/Ballot.sol/Ballot.json";
import { toHex, hexToString, parseEther } from "viem";
import * as readline from 'readline';

// npx ts-node --files ./scripts/CastVote.ts ADDRESS INDEX
dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (questionText: string) =>
  new Promise<string>(resolve => rl.question(questionText, resolve));

async function main() {
  //create public client
  const publicClient = createPublicClient({
		chain: sepolia,
		transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
	});

	// Receiving parameters
	const parameters = process.argv.slice(2);
  if (!parameters || parameters.length < 2)
    throw new Error("Parameters not provided");
  const contractAddress = parameters[0] as `0x${string}`;
  if (!contractAddress) throw new Error("Contract address not provided");
  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress))
    throw new Error("Invalid contract address");
  const proposalIndex = parameters[1];
  if (isNaN(Number(proposalIndex))) throw new Error("Invalid proposal index");

	// Attaching the contract and checking the selected option
	console.log("Proposal selected: ");
  const proposal = (await publicClient.readContract({
    address: contractAddress,
    abi,
    functionName: "proposals",
    args: [BigInt(proposalIndex)],
  })) as any[];
  const name = hexToString(proposal[0], { size: 32 });
  console.log("Voting to proposal:", name);

	// Creating a wallet client
  let userPrivateKey = await question("Please enter your private key: ");
  userPrivateKey = userPrivateKey.startsWith('0x') ? userPrivateKey.slice(2) : userPrivateKey;
  const account = privateKeyToAccount(`0x${userPrivateKey}`);
  const deployer = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });

	// Sending transaction on user confirmation
  const answer = await question("Confirm? (Y/n): ");
  if (answer.toString().trim().toLowerCase() != "n") {
    const hash = await deployer.writeContract({
      address: contractAddress,
      abi,
      functionName: "vote",
      args: [BigInt(proposalIndex)],
    });
    console.log("Transaction hash:", hash);
    console.log("Waiting for confirmations...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction confirmed");
    console.log("Ballot contract deployed to:", receipt.contractAddress);
    if (!receipt.contractAddress) {
      console.log("Contract deployment failed");
    }
  } else {
    console.log("Operation cancelled");
  }

  

  rl.close();
  process.exit();
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
})