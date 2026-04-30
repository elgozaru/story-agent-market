export const ENS_REGISTRY_ADDRESS =
  "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as const;

export const ensRegistryAbi = [
  {
    type: "function",
    name: "setSubnodeRecord",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "label", type: "bytes32" },
      { name: "owner", type: "address" },
      { name: "resolver", type: "address" },
      { name: "ttl", type: "uint64" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "resolver",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }]
  }
] as const;

export const publicResolverAbi = [
  {
    type: "function",
    name: "setAddr",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "addr", type: "address" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "setText",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
      { name: "value", type: "string" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "addr",
    stateMutability: "view",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "text",
    stateMutability: "view",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" }
    ],
    outputs: [{ name: "", type: "string" }]
  }
] as const;

