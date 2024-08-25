import { viem } from "hardhat";
import { createPublicClient, http, createWalletClient, formatEther } from "viem";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { abi, bytecode } from "../artifacts/contracts/Ballot.sol/Ballot.json";
import { toHex, hexToString, parseEther } from "viem";
import * as readline from 'readline';

// npx ts-node --files ./scripts/GiveRightToVote.ts CONTRACT_ADDRESS
// https://sepolia.etherscan.io/tx/0x2b44e8f05d1d8364123e4db8d9f9b6692950ea6722cee9fb991cdf782a63b787
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
  if (!parameters || parameters.length < 1)
    throw new Error("Parameters not provided");
  const contractAddress = parameters[0] as `0x${string}`;
  if (!contractAddress) throw new Error("Contract address not provided");
  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress))
    throw new Error("Invalid contract address");

	// Creating CHAIRPERSON wallet client
  let chairpersonPrivateKey = await question("Chairperson, please enter your private key: ");
  chairpersonPrivateKey = chairpersonPrivateKey.startsWith('0x') ? chairpersonPrivateKey.slice(2) : chairpersonPrivateKey;
  const account = privateKeyToAccount(`0x${chairpersonPrivateKey}`);
  const deployer = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });

	// Getting address of the voter receiving right
	let voterAddress = await question("Enter the address of the voter receiving right: ");
  voterAddress = voterAddress.startsWith('0x') ? voterAddress : `0x${voterAddress}`;

	// Give voting right to voterAddress
  const answer = await question("Confirm giving right to vote? (Y/n): ");
  if (answer.toString().trim().toLowerCase() != "n") {
    const hash = await deployer.writeContract({
      address: contractAddress,
      abi,
      functionName: "giveRightToVote",
      args: [voterAddress],
    });
    console.log("Transaction hash:", hash);
    console.log("Waiting for confirmations...");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log("Transaction confirmed");
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