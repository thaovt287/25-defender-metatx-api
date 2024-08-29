const { ethers, verifyTypedData, TypedDataEncoder } = require("ethers");
const { domainType, getDomain, getDomainHash } = require("../scripts/helpers/eip712");
const keccak256 = require("keccak256");

const buildTypedData = async (contract, data) => {
    const domain = await getDomain(contract);
    return {
        types: {
            // EIP712Domain: domainType(domain),
            MintBadgeData: [
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
            ],
        },
        domain: {
            ...domain,
            // name: ethers.encodeBytes32String(domain.name),
            // version: ethers.encodeBytes32String(domain.version),
        },
        message: data,
        // primaryType: "MintBadgeData",
    };
};
async function _signData(signer, data) {
    // If signer is a private key, use it to sign
    let signature;
    if (typeof signer === "string") {
        // const privateKey = Buffer.from(signer.replace(/^0x/, ""), "hex");
        // return ethSigUtil.signTypedMessage(privateKey, { data });
        const signerWallet = new ethers.Wallet(signer);
        // console.log(data);
        console.log(signerWallet);
        console.log("data _signData", data);
        signature = await signerWallet.signTypedData(
            data.domain,
            data.types,
            data.message,
        );
        console.log("signature", signature);
        // const typedDataEncoder = new ethers.utils. TypedDataEncoder.from(data.types);
        // console.log("typedDataEncoder", typedDataEncoder);
        // const structHash = typedDataEncoder.hash(
        //     data.domain,
        //     data.types,
        //     data.message,
        // );
        // console.log("structHash", structHash);
        const publicKey = await verifyTypedData(
            data.domain,
            data.types,
            data.message,
            signature,
        );
        console.log("publicKey", publicKey);
    } else {
        const [method, argData] = [
            "eth_signTypedData_v4",
            JSON.stringify(data),
        ];

        console.log("signer", signer);
        const from = await signer.address;
        console.log("argData", argData, [from, argData]);
        signature = await signer.provider.send(method, [from, argData]);
    }
    // console.log("signature", signature.v);

    // const { v, r, s } = ethers.utils.splitSignature(signature);

    return signature;
}

const signData = async (signer, badgeContact, data) => {
    console.log("signer", signer);
    // console.log("badgeContact", badgeContact);
    // console.log("badgeContact.provider", badgeContact.provider);
    const chainId = badgeContact.provider
        ? await badgeContact.provider.getNetwork().then((n) => n.chainId)
        : BigInt(hre.network.config.chainId);
    const dataSign = await buildTypedData(badgeContact, data);
    const signatureResultEthers = await _signData(signer, dataSign);
    // const sigBreakdown = ethers.Signature.from(data.signature);
    // console.log("signTypedDataf", signer, {
    //     version: SignTypedDataVersion.V4,
    //     data: dataSign,
    //     privateKey: BigInt(signer),
    // });
    // const signatureResult = signTypedData({
    //     version: SignTypedDataVersion.V4,
    //     data: dataSign,
    //     privateKey: BigInt(signer),
    // });
    // console.log("signatureResult", signatureResult);
    console.log("signatureResultEthers", signatureResultEthers);

    return {
        ...data,
        signature: signatureResultEthers,
    };
};

module.exports = {
    signData,
};
