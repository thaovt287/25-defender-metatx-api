const ethSigUtil = require("eth-sig-util");
const { ethers, utils } = require("ethers");

// const EIP712Domain = [
// 	{ name: "name", type: "string" },
// 	{ name: "version", type: "string" },
// 	{ name: "chainId", type: "uint256" },
// 	{ name: "verifyingContract", type: "address" },
// ];

const ForwardRequest = [
	{ name: "from", type: "address" },
	{ name: "to", type: "address" },
	{ name: "value", type: "uint256" },
	{ name: "gas", type: "uint256" },
	{ name: "nonce", type: "uint256" },
	{ name: "deadline", type: "uint48" },
	{ name: "data", type: "bytes" },
];
const MintBadgeData = [
	{
		name: "adminWallet",
		type: "address",
	},
	{
		name: "to",
		type: "address",
	},
	{
		name: "idBadge",
		type: "uint256",
	},
	{
		name: "idToken",
		type: "uint256",
	},
]

function getMetaTxTypeData(chainId, verifyingContract) {
	return {
		types: {
			ForwardRequest,
		},
		domain: {
			name: "ERC2771Forwarder",
			version: "1",
			chainId,
			verifyingContract,
		},
		primaryType: "ForwardRequest",
	};
}

function getMetaTxTypeDataMintBadge(chainId, verifyingContract) {
	return {
		types: {
			MintBadgeData,
		},
		domain: {
			name: "BadgeV1",
			version: "1",
			chainId,
			verifyingContract,
		},
		primaryType: "MintBadgeData",
	};
}

async function signTypedData(signer, from, data) {
	// If signer is a private key, use it to sign
	if (typeof signer === "string" && utils.computeAddress(signer) === from) {
		// const privateKey = Buffer.from(signer.replace(/^0x/, ""), "hex");
		// return ethSigUtil.signTypedMessage(privateKey, { data });
		const signerWallet = new ethers.Wallet(signer);
		return await signerWallet._signTypedData(
			data.domain,
			data.types,
			data.message,
		);
	}

	// Otherwise, send the signTypedData RPC call
	// Note that hardhatvm and metamask require different EIP712 input
	// const isHardhat = data.domain.chainId == 31337;
	// const [method, argData] = isHardhat
	//   ? ["eth_signTypedData", data]
	//   : ["eth_signTypedData_v4", JSON.stringify(data)];
	const [method, argData] = ["eth_signTypedData_v4", JSON.stringify(data)];
	return await signer.send(method, [from, argData]);
}

async function buildRequest(forwarder, input) {
	console.log(
		`Building request ${forwarder.toString()} ${input.toString()}...`,
	);
	const nonce = await forwarder
		.nonces(input.from)
		.then((nonce) => nonce.toString());

	const deadline =
		(await forwarder.provider.getBlock("latest")).timestamp + 3600;
	return {
		value: 0,
		gas: 1e6,
		nonce,
		deadline,
		...input,
	};
}

async function buildTypedData(forwarder, request) {
	const chainId = await forwarder.provider
		.getNetwork()
		.then((n) => n.chainId);
	const typeData = getMetaTxTypeData(chainId, forwarder.address);
	return { ...typeData, message: request };
}

async function buildTypedDataBadge(badgeContract, request) {
	const chainId = await badgeContract.provider
		.getNetwork()
		.then((n) => n.chainId);
	const typeData = getMetaTxTypeDataMintBadge(chainId, badgeContract.address);
	return { ...typeData, message: request };
}

async function signMetaTxRequest(signer, forwarder, input) {
	const request = await buildRequest(forwarder, input);
	const toSign = await buildTypedData(forwarder, request);
	// const signature = await signTypedData(signer, input.from, toSign);
	request.signature = await signTypedData(signer, input.from, toSign);
	return request;
}

async function signMetaBadge(signer, badgeContract, input) {
	const toSign = await buildTypedDataBadge(badgeContract, input);
	// const signature = await signTypedData(signer, input.from, toSign);
	request.signature = await signTypedData(signer, input.adminAddress, toSign);
	return request;
}

module.exports = {
	signMetaTxRequest,
	buildRequest,
	buildTypedData,
	signMetaBadge,
};
