import { namehash, labelhash, type Address, type WalletClient } from "viem";

const ensRegistryAbi = [
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
  }
] as const;

const publicResolverAbi = [
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
    name: "setAddr",
    stateMutability: "nonpayable",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "addr", type: "address" }
    ],
    outputs: []
  }
] as const;

export async function createAgentSubname(input: {
  walletClient: WalletClient;
  parentName: string;
  label: string;
  owner: Address;
  resolver: Address;
  ensRegistry: Address;
}) {
  const parentNode = namehash(input.parentName);
  const labelHash = labelhash(input.label);

  return input.walletClient.writeContract({
    address: input.ensRegistry,
    abi: ensRegistryAbi,
    functionName: "setSubnodeRecord",
    args: [parentNode, labelHash, input.owner, input.resolver, 0n],
    account: input.walletClient.account!
  });
}

export async function setAgentTextRecords(input: {
  walletClient: WalletClient;
  resolver: Address;
  fullName: string;
  agentAddress: Address;
  agentRegistryKey: string;
  manifestURI: string;
  campaignRegistry: Address;
}) {
  const node = namehash(input.fullName);

  await input.walletClient.writeContract({
    address: input.resolver,
    abi: publicResolverAbi,
    functionName: "setAddr",
    args: [node, input.agentAddress],
    account: input.walletClient.account!
  });

  const records = [
    ["agent-manifest", input.manifestURI],
    [input.agentRegistryKey, "1"],
    ["campaign-registry", input.campaignRegistry]
  ] as const;

  for (const [key, value] of records) {
    await input.walletClient.writeContract({
      address: input.resolver,
      abi: publicResolverAbi,
      functionName: "setText",
      args: [node, key, value],
      account: input.walletClient.account!
    });
  }
}

