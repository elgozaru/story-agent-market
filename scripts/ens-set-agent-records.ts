  import "dotenv/config";
import type { Address, Hex } from "viem";

import {
  buildAgentIdentityTextRecords,
  createEnsWalletClient,
  createSubname,
  setAgentIdentityRecords
} from "../packages/ens/src";

const ensName = mustGet("ENS_AGENT_NAME");
const agentAddress = mustGet("KYMACAST_AGENT_CONTROLLER_ADDRESS") as Address;
const resolver = mustGet("ENS_PUBLIC_RESOLVER_ADDRESS") as Address;
const agentRegistryAddress = mustGet("KYMACAST_AGENT_REGISTRY_ADDRESS") as Address;
const campaignRegistryAddress = mustGet("KYMACAST_CAMPAIGN_REGISTRY_ADDRESS") as Address;
const manifestUri = mustGet("KYMACAST_AGENT_MANIFEST_URI");

const walletClient = createEnsWalletClient({
  chainId: Number(process.env.ENS_CHAIN_ID ?? 11155111) as 11155111,
  rpcUrl: process.env.ENS_RPC_URL,
  privateKey: process.env.ENS_PRIVATE_KEY as Hex
});

function mustGet(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

async function main() {
  console.log(`Setting ENS records for ${ensName}...`);

  if (process.env.ENS_CREATE_SUBNAME === "true") {
    const parentName = mustGet("ENS_PARENT_NAME");
    const label = mustGet("ENS_SUBNAME_LABEL");

    console.log(`Creating subname ${label}.${parentName}...`);

    const subnameTx = await createSubname({
      walletClient,
      parentName,
      label,
      owner: walletClient.account!.address,
      resolver
    });

    console.log(`Subname tx: ${subnameTx}`);
  }

  const records = buildAgentIdentityTextRecords({
    ensName,
    agentAddress,
    agentRegistryAddress,
    agentRegistryInteroperableAddress:
      process.env.KYMACAST_AGENT_REGISTRY_INTEROPERABLE_ADDRESS,
    agentId: process.env.KYMACAST_AGENT_ID ?? "0",
    campaignRegistryAddress,
    campaignId: process.env.KYMACAST_CAMPAIGN_ID,
    manifestUri,
    zeroGStorageUri: process.env.ZERO_G_STORAGE_URI,
    zeroGContentRootHash: process.env.ZERO_G_CONTENT_ROOT_HASH as Hex | undefined,
    x402UnlockEndpoint: process.env.KYMACAST_X402_UNLOCK_ENDPOINT,
    keeperHubExecutionId: process.env.KEEPERHUB_EXECUTION_ID,
    socialProfileUrl: process.env.SOCIAL_PROFILE_URL
  });

  console.log(`Setting ${records.length} ENS text records on ${ensName}...`);

  const txs = await setAgentIdentityRecords({
    walletClient,
    resolver,
    ensName,
    agentAddress,
    records
  });

  console.log(JSON.stringify({ ensName, records, txs }, null, 2));

}

main().catch((error) => {
  console.error("Error setting ENS records:", error);
  process.exit(1);
});