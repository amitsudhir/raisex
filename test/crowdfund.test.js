const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Crowdfund Contract", function () {
  let crowdfund;
  let owner;
  let donor1;
  let donor2;

  const GOAL_AMOUNT = ethers.parseEther("1.0");
  const DURATION = 30 * 24 * 60 * 60; // 30 days

  beforeEach(async function () {
    [owner, donor1, donor2] = await ethers.getSigners();

    const Crowdfund = await ethers.getContractFactory("Crowdfund");
    crowdfund = await Crowdfund.deploy();
    await crowdfund.waitForDeployment();
  });

  describe("Campaign Creation", function () {
    it("Should create a campaign successfully", async function () {
      await crowdfund.createCampaign(
        "Test Campaign",
        "Test Description",
        GOAL_AMOUNT,
        DURATION,
        "https://example.com/image.jpg",
        "Technology",
        "Test Creator"
      );

      const campaign = await crowdfund.getCampaign(1);
      expect(campaign.title).to.equal("Test Campaign");
      expect(campaign.goalAmount).to.equal(GOAL_AMOUNT);
      expect(campaign.owner).to.equal(owner.address);
    });

    it("Should increment campaign count", async function () {
      await crowdfund.createCampaign(
        "Campaign 1",
        "Description 1",
        GOAL_AMOUNT,
        DURATION,
        "",
        "Charity",
        ""
      );

      await crowdfund.createCampaign(
        "Campaign 2",
        "Description 2",
        GOAL_AMOUNT,
        DURATION,
        "",
        "Education",
        ""
      );

      const count = await crowdfund.campaignCount();
      expect(count).to.equal(2);
    });

    it("Should fail with empty title", async function () {
      await expect(
        crowdfund.createCampaign(
          "",
          "Description",
          GOAL_AMOUNT,
          DURATION,
          "",
          "Charity",
          ""
        )
      ).to.be.revertedWith("Title cannot be empty");
    });

    it("Should fail with zero goal", async function () {
      await expect(
        crowdfund.createCampaign(
          "Test",
          "Description",
          0,
          DURATION,
          "",
          "Charity",
          ""
        )
      ).to.be.revertedWith("Goal must be greater than zero");
    });
  });

  describe("Donations", function () {
    beforeEach(async function () {
      await crowdfund.createCampaign(
        "Test Campaign",
        "Test Description",
        GOAL_AMOUNT,
        DURATION,
        "",
        "Technology",
        "Creator"
      );
    });

    it("Should accept donations", async function () {
      const donationAmount = ethers.parseEther("0.1");

      await crowdfund.connect(donor1).donate(1, { value: donationAmount });

      const campaign = await crowdfund.getCampaign(1);
      expect(campaign.raisedAmount).to.equal(donationAmount);
      expect(campaign.donorsCount).to.equal(1);
    });

    it("Should accept multiple donations from same address", async function () {
      const donation1 = ethers.parseEther("0.1");
      const donation2 = ethers.parseEther("0.2");

      await crowdfund.connect(donor1).donate(1, { value: donation1 });
      await crowdfund.connect(donor1).donate(1, { value: donation2 });

      const campaign = await crowdfund.getCampaign(1);
      expect(campaign.raisedAmount).to.equal(donation1 + donation2);
      expect(campaign.donorsCount).to.equal(1); // Should still be 1
    });

    it("Should track contributions correctly", async function () {
      const donationAmount = ethers.parseEther("0.5");

      await crowdfund.connect(donor1).donate(1, { value: donationAmount });

      const contribution = await crowdfund.getContribution(1, donor1.address);
      expect(contribution).to.equal(donationAmount);
    });

    it("Should increment donors count for different addresses", async function () {
      await crowdfund.connect(donor1).donate(1, { value: ethers.parseEther("0.1") });
      await crowdfund.connect(donor2).donate(1, { value: ethers.parseEther("0.2") });

      const campaign = await crowdfund.getCampaign(1);
      expect(campaign.donorsCount).to.equal(2);
    });

    it("Should fail donation to non-existent campaign", async function () {
      await expect(
        crowdfund.connect(donor1).donate(999, { value: ethers.parseEther("0.1") })
      ).to.be.revertedWith("Campaign does not exist");
    });

    it("Should fail with zero donation", async function () {
      await expect(
        crowdfund.connect(donor1).donate(1, { value: 0 })
      ).to.be.revertedWith("Donation must be greater than zero");
    });
  });

  describe("Withdrawals", function () {
    beforeEach(async function () {
      await crowdfund.createCampaign(
        "Test Campaign",
        "Test Description",
        GOAL_AMOUNT,
        DURATION,
        "",
        "Technology",
        "Creator"
      );
    });

    it("Should allow owner to withdraw when goal reached", async function () {
      await crowdfund.connect(donor1).donate(1, { value: GOAL_AMOUNT });

      const initialBalance = await ethers.provider.getBalance(owner.address);
      const tx = await crowdfund.withdraw(1);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.closeTo(
        initialBalance + GOAL_AMOUNT - gasUsed,
        ethers.parseEther("0.001")
      );
    });

    it("Should fail withdrawal if not owner", async function () {
      await crowdfund.connect(donor1).donate(1, { value: GOAL_AMOUNT });

      await expect(
        crowdfund.connect(donor1).withdraw(1)
      ).to.be.revertedWith("Only campaign owner can withdraw");
    });

    it("Should fail withdrawal if goal not reached", async function () {
      await crowdfund.connect(donor1).donate(1, { value: ethers.parseEther("0.5") });

      await expect(
        crowdfund.withdraw(1)
      ).to.be.revertedWith("Goal not reached");
    });

    it("Should fail double withdrawal", async function () {
      await crowdfund.connect(donor1).donate(1, { value: GOAL_AMOUNT });

      await crowdfund.withdraw(1);

      await expect(
        crowdfund.withdraw(1)
      ).to.be.revertedWith("Funds already withdrawn");
    });
  });

  describe("Refunds", function () {
    beforeEach(async function () {
      await crowdfund.createCampaign(
        "Test Campaign",
        "Test Description",
        GOAL_AMOUNT,
        1, // 1 second duration for testing
        "",
        "Technology",
        "Creator"
      );
    });

    it("Should allow refund after deadline when goal not met", async function () {
      const donationAmount = ethers.parseEther("0.5");
      await crowdfund.connect(donor1).donate(1, { value: donationAmount });

      // Wait for deadline to pass
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine");

      const initialBalance = await ethers.provider.getBalance(donor1.address);
      const tx = await crowdfund.connect(donor1).claimRefund(1);
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      const finalBalance = await ethers.provider.getBalance(donor1.address);
      expect(finalBalance).to.be.closeTo(
        initialBalance + donationAmount - gasUsed,
        ethers.parseEther("0.001")
      );
    });

    it("Should fail refund before deadline", async function () {
      await crowdfund.connect(donor1).donate(1, { value: ethers.parseEther("0.5") });

      await expect(
        crowdfund.connect(donor1).claimRefund(1)
      ).to.be.revertedWith("Campaign still active");
    });

    it("Should fail refund if goal was reached", async function () {
      await crowdfund.connect(donor1).donate(1, { value: GOAL_AMOUNT });

      // Wait for deadline
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine");

      await expect(
        crowdfund.connect(donor1).claimRefund(1)
      ).to.be.revertedWith("Goal was reached, no refunds");
    });

    it("Should fail refund with no contribution", async function () {
      // Wait for deadline
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine");

      await expect(
        crowdfund.connect(donor1).claimRefund(1)
      ).to.be.revertedWith("No contribution found");
    });
  });

  describe("View Functions", function () {
    it("Should return all campaigns", async function () {
      await crowdfund.createCampaign("Campaign 1", "Desc 1", GOAL_AMOUNT, DURATION, "", "Charity", "");
      await crowdfund.createCampaign("Campaign 2", "Desc 2", GOAL_AMOUNT, DURATION, "", "Education", "");

      const allCampaigns = await crowdfund.getAllCampaigns();
      expect(allCampaigns.length).to.equal(2);
    });

    it("Should return contract balance", async function () {
      await crowdfund.createCampaign("Test", "Desc", GOAL_AMOUNT, DURATION, "", "Tech", "");
      await crowdfund.connect(donor1).donate(1, { value: ethers.parseEther("0.5") });

      const balance = await crowdfund.getContractBalance();
      expect(balance).to.equal(ethers.parseEther("0.5"));
    });
  });
});
