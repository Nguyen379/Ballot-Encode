import { viem } from "hardhat";
import { createPublicClient, http, createWalletClient, formatEther } from "viem";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { abi, bytecode } from "../artifacts/contracts/Ballot.sol/Ballot.json";
import { toHex, hexToString, parseEther } from "viem";
import * as readline from 'readline';

// npx ts-node --files ./scripts/DelegateVote.ts CONTRACT_ADDRESS
// https://sepolia.etherscan.io/tx/0xbe3171ddb9412c927bba46faafef59c66389369a1724a9192c9696c2efa5e44c
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
  if (!parameters || parameters.length < 1)
    throw new Error("Parameters not provided");
  const contractAddress = parameters[0] as `0x${string}`;
  if (!contractAddress) throw new Error("Contract address not provided");
  if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress))
    throw new Error("Invalid contract address");

	// Creating a wallet client
  let userPrivateKey = await question("Please enter your private key: ");
  userPrivateKey = userPrivateKey.startsWith('0x') ? userPrivateKey.slice(2) : userPrivateKey;
  const account = privateKeyToAccount(`0x${userPrivateKey}`);
  const deployer = createWalletClient({
    account,
    chain: sepolia,
    transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
  });

		// Getting address of the voter being delegated to
		let delegateAddress = await question("Delegate your vote to address: ");
		delegateAddress = delegateAddress.startsWith('0x') ? delegateAddress : `0x${delegateAddress}`;
	

	// Delegate vote to delegateAddress
  const answer = await question("Confirm delegating vote? (Y/n): ");
  if (answer.toString().trim().toLowerCase() != "n") {
    const hash = await deployer.writeContract({
      address: contractAddress,
      abi,
      functionName: "delegate",
      args: [delegateAddress],
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