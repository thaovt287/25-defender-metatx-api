const { expect } = require("chai");
const { ethers } = require("hardhat");
const { signData } = require("../src/signMintBadge");

async function deploy(name, ...params) {
    const Contract = await ethers.getContractFactory(name);
    return await Contract.deploy(...params).then((f) => f.deployed());
}

describe("contracts/BadgeV1", function () {
    beforeEach(async function () {
        this.accounts = await ethers.getSigners();
        this.contractAdmin = this.accounts[1];
        this.adminAddress = this.accounts[2];
        this.to = this.accounts[5];
        const claimBadgeV1Factory =
            await hre.ethers.getContractFactory("BadgeV1");
        console.log("contractAdmin", this.contractAdmin.address);
        console.log("adminAddress", this.adminAddress.address);
        this.claimBadgeV1Contract = await hre.upgrades.deployProxy(
            claimBadgeV1Factory,
            [
                this.contractAdmin.address,
                this.adminAddress.address,
                "BadgeV1",
                "1",
            ],
        );
        await this.claimBadgeV1Contract.waitForDeployment();
        this.claimBadgeV1ProxyAddress =
            await this.claimBadgeV1Contract.getAddress();
    });

    it("mint a NFT", async function () {
        console.log(
            "this.claimBadgeV1ProxyAddress",
            this.claimBadgeV1ProxyAddress,
        );
        const signerPk =
            "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a";

        // const request = await signData(
        //     this.adminAddress,
        //     this.claimBadgeV1Contract,
        //     {
        const request = await signData(signerPk, this.claimBadgeV1Contract, {
            adminWallet: this.adminAddress.address,
            to: this.to.address,
            idBadge: 132435,
            idToken: 123,
            // data: "",
        });
        const minter = this.accounts[3];
        console.log("request", request);
        const a = await this.claimBadgeV1Contract.eip712Domain();
        console.log("claimBadgeV1Contract", a);

        await this.claimBadgeV1Contract
            .connect(minter)
            .mint(request)
            .then((tx) => {
                tx.wait();
                console.log(tx);
            });

        expect(
            await this.claimBadgeV1Contract.balanceOf(minter.address, 123),
        ).to.be.deep.eq(0);
        expect(
            await this.claimBadgeV1Contract.balanceOf(this.to.address, 123),
        ).to.be.deep.eq(1);
    });
});
