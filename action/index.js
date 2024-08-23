const { Defender } = require("@openzeppelin/defender-sdk");
const { ethers } = require("ethers");

const { ForwarderAbi } = require("../src/forwarder");
const ForwarderAddress = require("../deploy.json").ERC2771Forwarder;

async function relay(forwarder, request, whitelist) {
  // Decide if we want to relay this request based on a whitelist
  const accepts = !whitelist || whitelist.includes(request.to);
  if (!accepts) throw new Error(`Rejected request to ${request.to}`);

  // Validate request on the forwarder contract

  // request.gas = ethers.BigNumber.from(request.gas);

  const valuesArray = [
    request.from,
    request.to,
    request.value,
    request.gas,
    request.deadline,
    request.data,
    request.signature,
  ];
  console.log(`befor verify`, valuesArray);
  const valid = await forwarder.verify(valuesArray);
  if (!valid) throw new Error(`Invalid request`);

  // Send meta-tx through relayer to the forwarder contract
  const gasLimit = (parseInt(request.gas) + 50000).toString();
  console.log(`relay`, { ...request, gasLimit });
  return await forwarder.execute({ ...request, gasLimit });
}

async function handler(event) {
  // Parse webhook payload
  if (!event.request || !event.request.body) throw new Error(`Missing payload`);
  const { request, signature } = event.request.body;
  // console.log(`Relaying`, request, signature);

  // Initialize Relayer provider and signer, and forwarder contract
  const creds = { ...event };
  const client = new Defender(creds);
  const provider = client.relaySigner.getProvider();
  const signer = client.relaySigner.getSigner(provider, { speed: "fast" });
  const forwarder = new ethers.Contract(ForwarderAddress, ForwarderAbi, signer);

  // Relay transaction!
  const tx = await relay(forwarder, request, signature);
  console.log(`Sent meta-tx: ${tx.hash}`);
  return { txHash: tx.hash };
}

module.exports = {
  handler,
  relay,
};
