import { keeperhubContractCall } from "@story/keeperhub";

export async function registerCampaignViaKeeperHub(input: {
  contractAddress: string;
  abi: unknown[];
  campaignInput: unknown;
  authorSignature: `0x${string}`;
}) {
  return keeperhubContractCall({
    network: process.env.KEEPERHUB_NETWORK!,
    contractAddress: input.contractAddress,
    functionName: "createCampaignWithSig",
    functionArgs: [input.campaignInput, input.authorSignature],
    abi: input.abi
  });
}

