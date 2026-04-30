import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient
} from "viem";
import { mainnet, sepolia } from "viem/chains";
import { labelhash, namehash, normalize } from "viem/ens";
import { privateKeyToAccount } from "viem/accounts";

import {
  ENS_REGISTRY_ADDRESS,
  ensRegistryAbi,
  publicResolverAbi
} from "./abi";

export type EnsChainId = 1 | 11155111;

export type EnsTextRecord = {
  key: string;
  value: string;
};

export type AgentIdentityRecordsInput = {
  ensName: string;
  agentAddress: Address;
  agentRegistryAddress: Address;
  agentRegistryInteroperableAddress?: string;
  agentId: string | number | bigint;
  campaignRegistryAddress: Address;
  campaignId?: string | number | bigint;
  manifestUri: string;
  zeroGStorageUri?: string;
  zeroGContentRootHash?: Hex;
  x402UnlockEndpoint?: string;
  keeperHubExecutionId?: string;
  socialProfileUrl?: string;
};

export type ResolvedAgentIdentity = {
  ensName: string;
  address: Address | null;
  records: Record<string, string | null>;
  verified: {
    hasAddress: boolean;
    hasAgentManifest: boolean;
    hasAgentRegistration: boolean;
  };
};

export function getEnsChain(chainId?: number) {
  const resolved = Number(chainId ?? process.env.ENS_CHAIN_ID ?? 11155111);

  if (resolved === 1) return mainnet;
  if (resolved === 11155111) return sepolia;

  throw new Error(
    `Unsupported ENS chain ${resolved}. Use 1 for mainnet or 11155111 for Sepolia in this PoC.`
  );
}

export function createEnsPublicClient(input?: {
  chainId?: EnsChainId;
  rpcUrl?: string;
}): PublicClient {
  const chain = getEnsChain(input?.chainId);
  const rpcUrl = input?.rpcUrl ?? process.env.ENS_RPC_URL;

  if (!rpcUrl) {
    throw new Error("Missing ENS_RPC_URL");
  }

  return createPublicClient({
    chain,
    transport: http(rpcUrl)
  });
}

export function createEnsWalletClient(input?: {
  chainId?: EnsChainId;
  rpcUrl?: string;
  privateKey?: Hex;
}): WalletClient {
  const chain = getEnsChain(input?.chainId);
  const rpcUrl = input?.rpcUrl ?? process.env.ENS_RPC_URL;
  const privateKey = input?.privateKey ?? (process.env.ENS_PRIVATE_KEY as Hex);

  if (!rpcUrl) throw new Error("Missing ENS_RPC_URL");
  if (!privateKey) throw new Error("Missing ENS_PRIVATE_KEY");

  const account = privateKeyToAccount(privateKey);

  return createWalletClient({
    account,
    chain,
    transport: http(rpcUrl)
  });
}

/**
 * ENSIP-25 key builder.
 *
 * The strict standard expects an interoperable registry identifier.
 * For the PoC, pass AGENT_REGISTRY_INTEROPERABLE_ADDRESS when available.
 * Otherwise we fall back to the raw registry address so the demo remains functional.
 */
export function buildAgentRegistrationRecordKey(input: {
  agentRegistryAddress: Address;
  agentRegistryInteroperableAddress?: string;
  agentId: string | number | bigint;
}): string {
  const registryId =
    input.agentRegistryInteroperableAddress ?? input.agentRegistryAddress;

  return `agent-registration[${registryId}][${input.agentId.toString()}]`;
}

export function buildAgentIdentityTextRecords(
  input: AgentIdentityRecordsInput
): EnsTextRecord[] {
  const agentRegistrationKey = buildAgentRegistrationRecordKey({
    agentRegistryAddress: input.agentRegistryAddress,
    agentRegistryInteroperableAddress: input.agentRegistryInteroperableAddress,
    agentId: input.agentId
  });

  const records: EnsTextRecord[] = [
    ["agent-version", "story-agent-market/v0.1"],
    ["agent-controller", input.agentAddress],
    ["agent-manifest", input.manifestUri],
    ["agent-context", input.manifestUri],
    [agentRegistrationKey, "1"],
    ["campaign-registry", input.campaignRegistryAddress],
    ["agent-registry", input.agentRegistryAddress],
    ["agent-id", input.agentId.toString()]
  ].map(([key, value]) => ({ key, value }));

  if (input.campaignId !== undefined) {
    records.push({
      key: "campaign-id",
      value: input.campaignId.toString()
    });
  }

  if (input.zeroGStorageUri) {
    records.push({
      key: "0g-storage-uri",
      value: input.zeroGStorageUri
    });
  }

  if (input.zeroGContentRootHash) {
    records.push({
      key: "0g-content-root-hash",
      value: input.zeroGContentRootHash
    });
  }

  if (input.x402UnlockEndpoint) {
    records.push({
      key: "x402-unlock-endpoint",
      value: input.x402UnlockEndpoint
    });
  }

  if (input.keeperHubExecutionId) {
    records.push({
      key: "keeperhub-execution-id",
      value: input.keeperHubExecutionId
    });
  }

  if (input.socialProfileUrl) {
    records.push({
      key: "social-profile",
      value: input.socialProfileUrl
    });
  }

  return records;
}

export async function createSubname(input: {
  walletClient: WalletClient;
  parentName: string;
  label: string;
  owner: Address;
  resolver: Address;
  registryAddress?: Address;
}) {
  const parentNode = namehash(normalize(input.parentName));
  const labelNode = labelhash(input.label);

  return input.walletClient.writeContract({
    address: input.registryAddress ?? ENS_REGISTRY_ADDRESS,
    abi: ensRegistryAbi,
    functionName: "setSubnodeRecord",
    args: [parentNode, labelNode, input.owner, input.resolver, 0n],
    account: input.walletClient.account!
  });
}

export async function setEnsAddressRecord(input: {
  walletClient: WalletClient;
  resolver: Address;
  ensName: string;
  address: Address;
}) {
  const node = namehash(normalize(input.ensName));

  return input.walletClient.writeContract({
    address: input.resolver,
    abi: publicResolverAbi,
    functionName: "setAddr",
    args: [node, input.address],
    account: input.walletClient.account!
  });
}

export async function setEnsTextRecord(input: {
  walletClient: WalletClient;
  resolver: Address;
  ensName: string;
  key: string;
  value: string;
}) {
  const node = namehash(normalize(input.ensName));

  return input.walletClient.writeContract({
    address: input.resolver,
    abi: publicResolverAbi,
    functionName: "setText",
    args: [node, input.key, input.value],
    account: input.walletClient.account!
  });
}

export async function setAgentIdentityRecords(input: {
  walletClient: WalletClient;
  resolver: Address;
  ensName: string;
  agentAddress: Address;
  records: EnsTextRecord[];
}) {
  const txHashes: Hex[] = [];

  const addrTx = await setEnsAddressRecord({
    walletClient: input.walletClient,
    resolver: input.resolver,
    ensName: input.ensName,
    address: input.agentAddress
  });

  txHashes.push(addrTx);

  for (const record of input.records) {
    const tx = await setEnsTextRecord({
      walletClient: input.walletClient,
      resolver: input.resolver,
      ensName: input.ensName,
      key: record.key,
      value: record.value
    });

    txHashes.push(tx);
  }

  return txHashes;
}

export async function resolveAgentIdentity(input: {
  publicClient: PublicClient;
  ensName: string;
  agentRegistryAddress: Address;
  agentRegistryInteroperableAddress?: string;
  agentId: string | number | bigint;
  extraKeys?: string[];
}): Promise<ResolvedAgentIdentity> {
  const ensName = normalize(input.ensName);

  const agentRegistrationKey = buildAgentRegistrationRecordKey({
    agentRegistryAddress: input.agentRegistryAddress,
    agentRegistryInteroperableAddress: input.agentRegistryInteroperableAddress,
    agentId: input.agentId
  });

  const keys = [
    "agent-version",
    "agent-controller",
    "agent-manifest",
    "agent-context",
    "campaign-registry",
    "agent-registry",
    "agent-id",
    "campaign-id",
    "0g-storage-uri",
    "0g-content-root-hash",
    "x402-unlock-endpoint",
    "keeperhub-execution-id",
    "social-profile",
    agentRegistrationKey,
    ...(input.extraKeys ?? [])
  ];

  const address = await input.publicClient.getEnsAddress({
    name: ensName
  });

  const records: Record<string, string | null> = {};

  for (const key of keys) {
    try {
      records[key] = await input.publicClient.getEnsText({
        name: ensName,
        key
      });
    } catch {
      records[key] = null;
    }
  }

  return {
    ensName,
    address,
    records,
    verified: {
      hasAddress: Boolean(address),
      hasAgentManifest: Boolean(records["agent-manifest"]),
      hasAgentRegistration: Boolean(records[agentRegistrationKey])
    }
  };
}

