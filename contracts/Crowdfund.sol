// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

/**
 * @title Crowdfund
 * @notice Multi-campaign crowdfunding platform with refund mechanism
 * @dev Supports multiple campaigns, multiple donations, refunds, and secure withdrawals
 */
contract Crowdfund {
    
    /// @notice Campaign structure
    struct Campaign {
        uint256 id;
        address payable owner;
        string title;
        string description;
        uint256 goalAmount;
        uint256 raisedAmount;
        uint256 deadline;
        string imageURI;
        string category;
        string creatorInfo;
        uint256 donorsCount;
        bool withdrawn;
        bool exists;
    }
    
    /// @notice Campaign counter
    uint256 public campaignCount;
    
    /// @notice Mapping from campaign ID to Campaign
    mapping(uint256 => Campaign) public campaigns;
    
    /// @notice Mapping from campaign ID to donor address to contribution amount
    mapping(uint256 => mapping(address => uint256)) public contributions;
    
    /// @notice Reentrancy guard
    uint256 private locked = 1;
    
    /// @notice Events
    event CampaignCreated(
        uint256 indexed campaignId,
        address indexed owner,
        string title,
        uint256 goalAmount,
        uint256 deadline
    );
    
    event DonationReceived(
        uint256 indexed campaignId,
        address indexed donor,
        uint256 amount,
        uint256 totalRaised
    );
    
    event FundsWithdrawn(
        uint256 indexed campaignId,
        address indexed owner,
        uint256 amount
    );
    
    event RefundClaimed(
        uint256 indexed campaignId,
        address indexed donor,
        uint256 amount
    );
    
    /// @notice Reentrancy guard modifier
    modifier nonReentrant() {
        require(locked == 1, "Reentrancy detected");
        locked = 2;
        _;
        locked = 1;
    }
    
    /**
     * @notice Create a new campaign
     * @param _title Campaign title
     * @param _description Campaign description
     * @param _goalAmount Goal amount in wei
     * @param _durationSeconds Duration in seconds from now
     * @param _imageURI Image URI for campaign banner
     * @param _category Campaign category
     * @param _creatorInfo Creator name or social link
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goalAmount,
        uint256 _durationSeconds,
        string memory _imageURI,
        string memory _category,
        string memory _creatorInfo
    ) external {
        require(bytes(_title).length > 0, "Title cannot be empty");
        require(_goalAmount > 0, "Goal must be greater than zero");
        require(_durationSeconds > 0, "Duration must be greater than zero");
        
        uint256 deadline = block.timestamp + _durationSeconds;
        
        campaignCount++;
        
        campaigns[campaignCount] = Campaign({
            id: campaignCount,
            owner: payable(msg.sender),
            title: _title,
            description: _description,
            goalAmount: _goalAmount,
            raisedAmount: 0,
            deadline: deadline,
            imageURI: _imageURI,
            category: _category,
            creatorInfo: _creatorInfo,
            donorsCount: 0,
            withdrawn: false,
            exists: true
        });
        
        emit CampaignCreated(campaignCount, msg.sender, _title, _goalAmount, deadline);
    }
    
    /**
     * @notice Donate to a campaign
     * @param _campaignId Campaign ID to donate to
     */
    function donate(uint256 _campaignId) external payable {
        Campaign storage campaign = campaigns[_campaignId];
        
        require(campaign.exists, "Campaign does not exist");
        require(block.timestamp < campaign.deadline, "Campaign has ended");
        require(msg.value > 0, "Donation must be greater than zero");
        require(campaign.raisedAmount < campaign.goalAmount, "Goal already reached");
        
        // Track if this is first donation from this address
        if (contributions[_campaignId][msg.sender] == 0) {
            campaign.donorsCount++;
        }
        
        // Update contribution and raised amount
        contributions[_campaignId][msg.sender] += msg.value;
        campaign.raisedAmount += msg.value;
        
        emit DonationReceived(_campaignId, msg.sender, msg.value, campaign.raisedAmount);
    }
    
    /**
     * @notice Withdraw funds from a successful campaign
     * @param _campaignId Campaign ID to withdraw from
     */
    function withdraw(uint256 _campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        
        require(campaign.exists, "Campaign does not exist");
        require(msg.sender == campaign.owner, "Only campaign owner can withdraw");
        require(!campaign.withdrawn, "Funds already withdrawn");
        require(campaign.raisedAmount >= campaign.goalAmount, "Goal not reached");
        
        campaign.withdrawn = true;
        uint256 amount = campaign.raisedAmount;
        
        (bool success, ) = campaign.owner.call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit FundsWithdrawn(_campaignId, campaign.owner, amount);
    }
    
    /**
     * @notice Claim refund if campaign failed
     * @param _campaignId Campaign ID to claim refund from
     */
    function claimRefund(uint256 _campaignId) external nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        
        require(campaign.exists, "Campaign does not exist");
        require(block.timestamp >= campaign.deadline, "Campaign still active");
        require(campaign.raisedAmount < campaign.goalAmount, "Goal was reached, no refunds");
        require(!campaign.withdrawn, "Funds already withdrawn");
        
        uint256 contribution = contributions[_campaignId][msg.sender];
        require(contribution > 0, "No contribution found");
        
        contributions[_campaignId][msg.sender] = 0;
        
        (bool success, ) = payable(msg.sender).call{value: contribution}("");
        require(success, "Refund failed");
        
        emit RefundClaimed(_campaignId, msg.sender, contribution);
    }
    
    /**
     * @notice Get campaign details
     * @param _campaignId Campaign ID
     * @return Campaign struct
     */
    function getCampaign(uint256 _campaignId) external view returns (Campaign memory) {
        require(campaigns[_campaignId].exists, "Campaign does not exist");
        return campaigns[_campaignId];
    }
    
    /**
     * @notice Get all campaigns
     * @return Array of all campaigns
     */
    function getAllCampaigns() external view returns (Campaign[] memory) {
        Campaign[] memory allCampaigns = new Campaign[](campaignCount);
        
        for (uint256 i = 1; i <= campaignCount; i++) {
            allCampaigns[i - 1] = campaigns[i];
        }
        
        return allCampaigns;
    }
    
    /**
     * @notice Get contribution amount for an address
     * @param _campaignId Campaign ID
     * @param _donor Donor address
     * @return Contribution amount in wei
     */
    function getContribution(uint256 _campaignId, address _donor) external view returns (uint256) {
        return contributions[_campaignId][_donor];
    }
    
    /**
     * @notice Get contract balance
     * @return Contract balance in wei
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
