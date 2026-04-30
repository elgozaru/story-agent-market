// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgentRegistry {
    struct Agent {
        address controller;
        string ensName;
        string metadataURI;
        bytes32 policyHash;
        bool active;
        uint256 createdAt;
    }

    uint256 public nextAgentId;
    mapping(uint256 => Agent) public agents;

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed controller,
        string ensName,
        string metadataURI,
        bytes32 policyHash
    );

    event AgentMetadataUpdated(
        uint256 indexed agentId,
        string metadataURI,
        bytes32 policyHash
    );

    event AgentStatusChanged(uint256 indexed agentId, bool active);

    error InvalidController();
    error NotController();

    function registerAgent(
        address controller,
        string calldata ensName,
        string calldata metadataURI,
        bytes32 policyHash
    ) external returns (uint256 agentId) {
        if (controller == address(0)) revert InvalidController();

        agentId = nextAgentId++;

        agents[agentId] = Agent({
            controller: controller,
            ensName: ensName,
            metadataURI: metadataURI,
            policyHash: policyHash,
            active: true,
            createdAt: block.timestamp
        });

        emit AgentRegistered(
            agentId,
            controller,
            ensName,
            metadataURI,
            policyHash
        );
    }

    function updateAgentMetadata(
        uint256 agentId,
        string calldata metadataURI,
        bytes32 policyHash
    ) external {
        Agent storage agent = agents[agentId];

        if (msg.sender != agent.controller) revert NotController();

        agent.metadataURI = metadataURI;
        agent.policyHash = policyHash;

        emit AgentMetadataUpdated(agentId, metadataURI, policyHash);
    }

    function setAgentActive(uint256 agentId, bool active) external {
        Agent storage agent = agents[agentId];

        if (msg.sender != agent.controller) revert NotController();

        agent.active = active;

        emit AgentStatusChanged(agentId, active);
    }
}