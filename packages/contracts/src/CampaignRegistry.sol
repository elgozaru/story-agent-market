// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract CampaignRegistry is EIP712 {
    struct Campaign {
        uint256 agentId;
        address author;
        address payTo;
        bytes32 contentRootHash;
        bytes32 rightsPolicyHash;
        bytes32 agentPolicyHash;
        string teaserURI;
        uint256 priceMicrosUsd;
        bool active;
        uint256 createdAt;
    }

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
        uint256 nonce;
    }

    bytes32 public constant CAMPAIGN_INPUT_TYPEHASH =
        keccak256(
            "CampaignInput(uint256 agentId,address author,address payTo,bytes32 contentRootHash,bytes32 rightsPolicyHash,bytes32 agentPolicyHash,string teaserURI,uint256 priceMicrosUsd,uint256 deadline,uint256 nonce)"
        );

    uint256 public nextCampaignId;

    mapping(uint256 => Campaign) public campaigns;
    mapping(address => uint256) public nonces;

    event CampaignCreated(
        uint256 indexed campaignId,
        uint256 indexed agentId,
        address indexed author,
        address payTo,
        string teaserURI,
        uint256 priceMicrosUsd
    );

    event CampaignStatusChanged(uint256 indexed campaignId, bool active);

    error InvalidAuthor();
    error InvalidPayTo();
    error InvalidPrice();
    error InvalidTeaserURI();
    error SignatureExpired();
    error InvalidNonce();
    error InvalidSignature();
    error NotAuthor();

    constructor() EIP712("CampaignRegistry", "1") {}

    function createCampaign(
        CampaignInput calldata input
    ) external returns (uint256 campaignId) {
        if (msg.sender != input.author) revert NotAuthor();

        _validateAndConsumeNonce(input);

        campaignId = _createCampaign(input);
    }

    function createCampaignWithSig(
        CampaignInput calldata input,
        bytes calldata authorSignature
    ) external returns (uint256 campaignId) {
        address signer = ECDSA.recover(
            _hashTypedDataV4(_campaignInputStructHash(input)),
            authorSignature
        );

        if (signer != input.author) revert InvalidSignature();

        _validateAndConsumeNonce(input);

        campaignId = _createCampaign(input);
    }

    function setCampaignActive(uint256 campaignId, bool active) external {
        Campaign storage campaign = campaigns[campaignId];

        if (msg.sender != campaign.author) revert NotAuthor();

        campaign.active = active;

        emit CampaignStatusChanged(campaignId, active);
    }

    function hashCampaignInput(
        CampaignInput calldata input
    ) external view returns (bytes32) {
        return _hashTypedDataV4(_campaignInputStructHash(input));
    }

    function _createCampaign(
        CampaignInput calldata input
    ) internal returns (uint256 campaignId) {
        if (input.author == address(0)) revert InvalidAuthor();
        if (input.payTo == address(0)) revert InvalidPayTo();
        if (input.priceMicrosUsd == 0) revert InvalidPrice();
        if (bytes(input.teaserURI).length == 0) revert InvalidTeaserURI();

        campaignId = nextCampaignId++;

        campaigns[campaignId] = Campaign({
            agentId: input.agentId,
            author: input.author,
            payTo: input.payTo,
            contentRootHash: input.contentRootHash,
            rightsPolicyHash: input.rightsPolicyHash,
            agentPolicyHash: input.agentPolicyHash,
            teaserURI: input.teaserURI,
            priceMicrosUsd: input.priceMicrosUsd,
            active: true,
            createdAt: block.timestamp
        });

        emit CampaignCreated(
            campaignId,
            input.agentId,
            input.author,
            input.payTo,
            input.teaserURI,
            input.priceMicrosUsd
        );
    }

    function _validateAndConsumeNonce(CampaignInput calldata input) internal {
        if (block.timestamp > input.deadline) revert SignatureExpired();

        uint256 expectedNonce = nonces[input.author];

        if (input.nonce != expectedNonce) revert InvalidNonce();

        nonces[input.author] = expectedNonce + 1;
    }

    function _campaignInputStructHash(
        CampaignInput calldata input
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    CAMPAIGN_INPUT_TYPEHASH,
                    input.agentId,
                    input.author,
                    input.payTo,
                    input.contentRootHash,
                    input.rightsPolicyHash,
                    input.agentPolicyHash,
                    keccak256(bytes(input.teaserURI)),
                    input.priceMicrosUsd,
                    input.deadline,
                    input.nonce
                )
            );
    }
}