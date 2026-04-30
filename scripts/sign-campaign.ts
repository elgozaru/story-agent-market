import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import type { Address, Hex } from "viem";

const privateKey = process.env.AUTHOR_PRIVATE_KEY as Hex;
const campaignRegistry = process.env.KYMACAST_CAMPAIGN_REGISTRY_ADDRESS as Address;
const chainId = Number(process.env.BASE_SEPOLIA_CHAIN_ID ?? 84532);

if (!privateKey) throw new Error("Missing AUTHOR_PRIVATE_KEY");
if (!campaignRegistry) throw new Error("Missing KYMACAST_CAMPAIGN_REGISTRY_ADDRESS");

const account = privateKeyToAccount(privateKey);

const campaignInput = {
  agentId: 0n,
  author: account.address,
  payTo: account.address,
  contentRootHash:
    "0x1111111111111111111111111111111111111111111111111111111111111111",
  rightsPolicyHash:
    "0x2222222222222222222222222222222222222222222222222222222222222222",
  agentPolicyHash:
    "0x3333333333333333333333333333333333333333333333333333333333333333",
  teaserURI: "0g://mock/teaser.json",
  priceMicrosUsd: 10000n,
  deadline: BigInt(Math.floor(Date.now() / 1000) + 60 * 60),
  nonce: 0n
};

async function signCampaign() {

  const signature = await account.signTypedData({
    domain: {
      name: "CampaignRegistry",
      version: "1",
      chainId,
      verifyingContract: campaignRegistry
    },
    types: {
      CampaignInput: [
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
    primaryType: "CampaignInput",
    message: campaignInput
  });

  const jsonReadyInput = {
    agentId: campaignInput.agentId.toString(),
    author: campaignInput.author,
    payTo: campaignInput.payTo,
    contentRootHash: campaignInput.contentRootHash,
    rightsPolicyHash: campaignInput.rightsPolicyHash,
    agentPolicyHash: campaignInput.agentPolicyHash,
    teaserURI: campaignInput.teaserURI,
    priceMicrosUsd: campaignInput.priceMicrosUsd.toString(),
    deadline: campaignInput.deadline.toString(),
    nonce: campaignInput.nonce.toString()
  };

  console.log(
    JSON.stringify(
      {
        campaignInput: jsonReadyInput,
        authorSignature: signature
      },
      null,
      2
    )
  );
}

signCampaign().catch((error) => {
  console.error("Error signing campaign:", error);
  process.exit(1);
});