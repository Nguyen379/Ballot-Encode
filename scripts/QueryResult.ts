import { viem } from "hardhat";
import { createPublicClient, http, createWalletClient, formatEther } from "viem";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { abi, bytecode } from "../artifacts/contracts/Ballot.sol/Ballot.json";
import { toHex, hexToString, parseEther } from "viem";
import * as readline from 'readline';

// npx ts-node --files ./scripts/QueryResult.ts CONTRACT_ADDRESS
dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";

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

	// Print winning proposals
	let winner = (await publicClient.readContract({
		address: contractAddress,
		abi,
		functionName: "winnerName",
	})) as `0x${string}`;
	const winnerName = hexToString(winner, {size:32});
	console.log(`Winning Proposal is: ${winnerName}`);

  process.exit();
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
})