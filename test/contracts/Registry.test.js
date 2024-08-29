const { expect } = require("chai");
const { ethers } = require("hardhat");
const { signMetaTxRequest } = require("../../src/signer");

async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  const contract = await Contract.deploy(...params);
  // await contract.waitForDeployment();
  await contract.deployed();
  return contract;
}

describe("contracts/Registry", function () {
  beforeEach(async function () {
    this.forwarder = await deploy("ERC2771Forwarder", "ERC2771Forwarder");
    // this.registry = await deploy("Registry", await this.forwarder.getAddress());
    this.registry = await deploy("Registry", await this.forwarder.address);
    this.token = await deploy("MockToken");
    this.accounts = await ethers.getSigners();
  });

  it("registers a name directly", async function () {
    const sender = this.accounts[1];
    const registry = this.registry.connect(sender);

    const receipt = await registry.register("defender").then((tx) => tx.wait());
    console.log("receipt", receipt);
    expect(receipt.events[0].event).to.equal("Registered");

    expect(await registry.owners("defender")).to.equal(sender.address);
    expect(await registry.names(sender.address)).to.equal("defender");
  });

  it("registers a name via a meta-tx", async function () {
    const signer = this.accounts[2];
    const relayer = this.accounts[3];
    const forwarder = this.forwarder.connect(relayer);
    const registry = this.registry;

    // const signerPk =
    //   "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

    const request = await signMetaTxRequest(signer.provider, forwarder, {
      from: signer.address,
      to: registry.address,
      data: registry.interface.encodeFunctionData("register", ["meta-txs"]),
    });

    await forwarder.execute(request).then((tx) => tx.wait());

    expect(await registry.owners("meta-txs")).to.equal(signer.address);
    expect(await registry.names(signer.address)).to.equal("meta-txs");
  });

  it("tranfer a token", async function () {
    const signer = this.accounts[2];
    const relayer = this.accounts[3];
    const to = this.accounts[4];
    const forwarder = this.forwarder.connect(relayer);
    const registry = this.registry;
    const token = this.token;
    await token.mint(signer.address, 100);
    const a = await this.forwarder.eip712Domain();
    console.log("forwarder eip712Domain", a);

    // const signerPk = '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'
    await token.connect(signer).approve(registry.address, 100000);

    const request = await signMetaTxRequest(signer.provider, forwarder, {
      from: signer.address,
      // to: await registry.getAddress(),
      to: await registry.address,
      data: registry.interface.encodeFunctionData("transferFromToken", [
        // await token.getAddress(),
        await token.address,
        signer.address,
        to.address,
        10,
      ]),
    });
    console.log("request", request);
    // const request = await signMetaTxRequest(signer.provider, forwarder, {
    //   from: signer.address,
    //   to: token.address,
    //   data: token.interface.encodeFunctionData("transfer", [to.address, 10]),
    // });

    await forwarder.execute(request).then((tx) => tx.wait());
    expect(await token.balanceOf(signer.address)).to.be.deep.eq(90);
    expect(await token.balanceOf(to.address)).to.be.deep.eq(10);
  });
});
