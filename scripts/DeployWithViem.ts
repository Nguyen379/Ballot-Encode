import { createPublicClient, http, createWalletClient, formatEther } from "viem";
import { sepolia } from "viem/chains";
import * as dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { abi, bytecode } from "../artifacts/contracts/Ballot.sol/Ballot.json";
import { toHex, hexToString, parseEther } from "viem";

// Ballot Contract address: 0x8fda3181796ee2bbf62a508dab6db51fb2f4c69c
dotenv.config();

const providerApiKey = process.env.ALCHEMY_API_KEY || "";
const deployerPrivateKey = process.env.PRIVATE_KEY || "";

async function main() {
	const proposals = process.argv.slice(2);
	if (!proposals || proposals.length < 1)
		throw new Error("Proposals not provided");

	// Creating a public client
	const publicClient = createPublicClient({
		chain: sepolia,
		transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`),
	});
	const blockNumber = await publicClient.getBlockNumber();
	console.log("Last block number:", blockNumber);

	// Creating a wallet client
	const account = privateKeyToAccount(`0x${deployerPrivateKey}`);
	const deployer = createWalletClient({
		account,
		chain: sepolia,
		transport: http(`https://eth-sepolia.g.alchemy.com/v2/${providerApiKey}`)
	})

	console.log("Deployer address:", deployer.account.address);
	const balance = await publicClient.getBalance({
		address: deployer.account.address
	})

	console.log(
    "Deployer balance:",
    formatEther(balance),
    deployer.chain.nativeCurrency.symbol
	);

	if (balance < parseEther("0.001")) {
		throw new Error("Insufficient balance to deploy contract");
	}

	// Deploying a contract
	console.log("\nDeploying Ballot contract");
	const hash = await deployer.deployContract({
		abi,
		bytecode: bytecode as `0x${string}`, 
		args: [proposals.map((proposal) => toHex(proposal, {size:32}))]
	});

	console.log("Transaction hash:", hash);
	console.log("Waiting for transaction receipt...");
	const receipt = await publicClient.waitForTransactionReceipt({ hash });
	console.log("Ballot contract deployed to address:", receipt.contractAddress);

	// Reading information from a deployed contract
	if (!receipt.contractAddress) throw new Error("Contract address not found");
	console.log("Proposals: ");
	for (let index = 0; index < proposals.length; index++) {
		const proposal = (await publicClient.readContract({
			address: receipt.contractAddress,
			abi,
			functionName: "proposals",
			args: [BigInt(index)],
		})) as any[];
		const name = hexToString(proposal[0], { size: 32 });
		console.log({ index, name, proposal });
	}
}


main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
