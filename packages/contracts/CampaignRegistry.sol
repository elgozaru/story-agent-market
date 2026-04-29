struct CampaignInput {
    uint256 agentId;
    address author;
    address payTo;
    bytes32 contentRootHash;
    bytes32 rightsPolicyHash;
    bytes32 agentPolicyHash;
    string teaserURI;
    uint256 priceMicrosUsd;
    uint256 deadline;
}

