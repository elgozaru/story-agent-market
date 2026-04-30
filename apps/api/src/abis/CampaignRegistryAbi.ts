export const CampaignRegistryAbi = [
  {
    type: "function",
    name: "createCampaignWithSig",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "input",
        type: "tuple",
        components: [
          { name: "agentId", type: "uint256" },
          { name: "author", type: "address" },
          { name: "payTo", type: "address" },
          { name: "contentRootHash", type: "bytes32" },
          { name: "rightsPolicyHash", type: "bytes32" },
          { name: "agentPolicyHash", type: "bytes32" },
          { name: "teaserURI", type: "string" },
          { name: "priceMicrosUsd", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "nonce", type: "uint256" }
        ]
      },
      { name: "authorSignature", type: "bytes" }
    ],
    outputs: [{ name: "campaignId", type: "uint256" }]
  },
  {
    type: "function",
    name: "nonces",
    stateMutability: "view",
    inputs: [{ name: "author", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "hashCampaignInput",
    stateMutability: "view",
    inputs: [
      {
        name: "input",
        type: "tuple",
        components: [
          { name: "agentId", type: "uint256" },
          { name: "author", type: "address" },
          { name: "payTo", type: "address" },
          { name: "contentRootHash", type: "bytes32" },
          { name: "rightsPolicyHash", type: "bytes32" },
          { name: "agentPolicyHash", type: "bytes32" },
          { name: "teaserURI", type: "string" },
          { name: "priceMicrosUsd", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "nonce", type: "uint256" }
        ]
      }
    ],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "event",
    name: "CampaignCreated",
    inputs: [
      { name: "campaignId", type: "uint256", indexed: true },
      { name: "agentId", type: "uint256", indexed: true },
      { name: "author", type: "address", indexed: true },
      { name: "payTo", type: "address", indexed: false },
      { name: "teaserURI", type: "string", indexed: false },
      { name: "priceMicrosUsd", type: "uint256", indexed: false }
    ]
  }
] as const;

