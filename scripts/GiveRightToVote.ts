import { viem } from "hardhat";
import { createPublicClient, http, createWalletClient, formatEther } from "viem";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { abi, bytecode } from "../artifacts/contracts/Ballot.sol/Ballot.json";
import { toHex, hexToString, parseEther } from "viem";
import * as readline from 'readline';

// npx ts-node --files ./scripts/CastVote.ts ADDRESS_GIVING_RIGHT ADDRESS_RECEIVING_RIGHT
dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const chairpersonPrivateKey = process.env.PRIVATE_KEY || "";

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

	// Creating CHAIRPERSON wallet client
  const account = privateKeyToAccount(`0x${chairpersonPrivateKey}`);
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