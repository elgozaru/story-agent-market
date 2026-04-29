// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgentRegistry {
    struct Agent {
        address controller;
        string ensName;
        string metadataURI;
        bytes32 policyHash;
        bool active;
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

    function registerAgent(
        address controller,
        string calldata ensName,
        string calldata metadataURI,
        bytes32 policyHash
    ) external returns (uint256 agentId) {
        agentId = nextAgentId++;

        agents[agentId] = Agent({
            controller: controller,
            ensName: ensName,
            metadataURI: metadataURI,
            policyHash: policyHash,
            active: true
        });

        emit AgentRegistered(agentId, controller, ensName, metadataURI, policyHash);
    }

    function setActive(uint256 agentId, bool active) external {
        require(msg.sender == agents[agentId].controller, "not controller");
        agents[agentId].active = active;
    }
}

