const { expect } = require("chai").use(require('chai-as-promised'));
const { ethers } = require("hardhat");
const { signMetaTxRequest } = require("../../src/signer");
const { relay } = require('../../action');

async function deploy(name, ...params) {
  const Contract = await ethers.getContractFactory(name);
  return await Contract.deploy(...params).then(f => f.deployed());
}

describe("action", function() {
  beforeEach(async function() {
    this.forwarder = await deploy('ERC2771Forwarder', 'ERC2771Forwarder');
    this.registry = await deploy("Registry", this.forwarder.address);    
    this.accounts = await ethers.getSigners();
    this.signer = this.accounts[2];
  });

  it("registers a name via a meta-tx", async function() {
    const { forwarder, registry, signer } = this;

    const request = await signMetaTxRequest(signer.provider, forwarder, {
      from: signer.address,
      to: registry.address,
      data: registry.interface.encodeFunctionData('register', ['meta-txs']),
    });
    
    const whitelist = [registry.address]
    await relay(forwarder, request, whitelist);

    expect(await registry.owners('meta-txs')).to.equal(signer.address);
    expect(await registry.names(signer.address)).to.equal('meta-txs');
  });

  it("refuses to send to non-whitelisted address", async function() {
    const { forwarder, registry, signer } = this;

    const request = await signMetaTxRequest(signer.provider, forwarder, {
      from: signer.address,
      to: registry.address,
      data: registry.interface.encodeFunctionData('register', ['meta-txs']),
    });
    
    const whitelist = [];
    await expect(
      relay(forwarder, request, whitelist)
    ).to.be.rejectedWith(/rejected/i);
  });

  it("refuses to send incorrect signature", async function() {
    const { forwarder, registry, signer } = this;

    const request = await signMetaTxRequest(signer.provider, forwarder, {
      from: signer.address,
      to: registry.address,
      data: registry.interface.encodeFunctionData('register', ['meta-txs']),
      nonce: 5,
    });
    
    const whitelist = [registry.address]
    await expect(
      relay(forwarder, request, whitelist)
    ).to.be.rejectedWith(/invalid/i);
  });
});
