const { expect } = require("chai");
const { ethers } = require("hardhat");

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), "ether");
};

describe("Escrow", async () => {
  let escrow, realEstate;
  let buyer, seller, inspector, lender;
  beforeEach(async () => {
    [buyer, seller, inspector, lender] = await ethers.getSigners();
    const RealEstate = await ethers.getContractFactory("RealEstate");
    realEstate = await RealEstate.deploy();
    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy(
      realEstate.address,
      seller.address,
      inspector.address,
      lender.address
    );
    let transaction = await realEstate
      .connect(seller)
      .mint(
        "https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS"
      );
    await transaction.wait();

    // Approve Property
    transaction = await realEstate.connect(seller).approve(escrow.address, 1);
    await transaction.wait();
    // List Property
    transaction = await escrow
      .connect(seller)
      .lists(1, buyer.address, tokens(10), tokens(5));
    await transaction.wait();
  });

  describe("Deployments", async () => {
    it("Should returns NFT address", async () => {
      const result = await escrow.nftAddress();
      expect(result).to.be.equal(realEstate.address);
    });

    it("Should return sellers", async () => {
      const sellerResult = await escrow.seller();
      expect(sellerResult).to.be.equal(seller.address);
    });

    it("Should return inspector", async () => {
      const inspectorResult = await escrow.inspector();
      expect(inspectorResult).to.be.equal(inspector.address);
    });

    it("Should return lender", async () => {
      const lenderResult = await escrow.lender();
      expect(lenderResult).to.be.equal(lender.address);
    });
  });

  describe("Listing", async () => {
    it("Should Update Ownership", async () => {
      expect(await realEstate.ownerOf(1)).to.be.equal(escrow.address);
    });
    it("Updates listed", async () => {
      const result = await escrow.isListed(1);
      expect(result).to.be.equal(true);
    });
    it("Should returns buyer", async () => {
      const result = await escrow.buyer(1);
      expect(result).to.be.equal(buyer.address);
    });

    it("Should returns purchase price", async () => {
      const result = await escrow.purchasePrice(1);
      expect(result).to.be.equal(tokens(10));
    });

    it("Should returns escrow amount", async () => {
      const result = await escrow.escrowAmount(1);
      expect(result).to.be.equal(tokens(5));
    });
  });

  describe("Deposites", async () => {
    it("Should updates contract balance", async () => {
      const transaction = await escrow
        .connect(buyer)
        .depositeEarnest(1, { value: tokens(5) });
      await transaction.wait();
      const result = await escrow.getBalance();
      expect(result).to.be.equal(tokens(5));
    });
  });

  describe("Inspection", async () => {
    it("Should update inspection status", async () => {
      const transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true);
      await transaction.wait();
      const result = await escrow.inspectionPassed(1);
      expect(result).to.be.equal(true);
    });
  });

  describe("Approval", async () => {
    it("Should update approval status", async () => {
      let transaction = await escrow.connect(buyer).approveSale(1);
      await transaction.wait();

      transaction = await escrow.connect(seller).approveSale(1);
      await transaction.wait();

      transaction = await escrow.connect(lender).approveSale(1);
      await transaction.wait();

      expect(await escrow.approval(1, buyer.address)).to.be.equal(true);
      expect(await escrow.approval(1, seller.address)).to.be.equal(true);
      expect(await escrow.approval(1, lender.address)).to.be.equal(true);
    });
  });

  describe("Sale", async () => {
    beforeEach(async () => {
      let transaction = await escrow
        .connect(buyer)
        .depositeEarnest(1, { value: tokens(5) });
      await transaction.wait();

      transaction = await escrow
        .connect(inspector)
        .updateInspectionStatus(1, true);
      await transaction.wait();

      transaction = await escrow.connect(buyer).approveSale(1);
      await transaction.wait();

      transaction = await escrow.connect(seller).approveSale(1);
      await transaction.wait();

      transaction = await escrow.connect(lender).approveSale(1);
      await transaction.wait();

      await lender.sendTransaction({ to: escrow.address, value: tokens(5) });

      transaction = await escrow.connect(seller).finalizeSale(1);
      await transaction.wait();
    });
    it("Updates ownership", async () => {
      expect(await realEstate.ownerOf(1)).to.be.equal(buyer.address);
    });

    it("Updates balance", async () => {
      expect(await escrow.getBalance()).to.be.equal(0);
    });
  });
});
