import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { z } from "zod";

import {
  Bytes32Schema,
  HexAddressSchema,
  SocialPostSchema,
  TeaserGenerationRequestSchema
} from "@story/shared";

import { CampaignRegistryAbi } from "./abis/CampaignRegistryAbi";
import { generateTeasersWith0G } from "@story/og";
import { KeeperHubClient } from "@story/keeperhub";

import {
  buildAgentIdentityTextRecords,
  createEnsPublicClient,
  resolveAgentIdentity
} from "@story/ens";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"]
  })
);

app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "story-agent-api",
    timestamp: new Date().toISOString()
  });
});

/**
 * 0G-backed agent planning route.
 *
 * Local mode:
 *   OG_COMPUTE_MOCK=true
 *
 * Real 0G mode:
 *   OG_COMPUTE_BASE_URL=...
 *   OG_COMPUTE_API_KEY=...
 *   OG_COMPUTE_MODEL=...
 */
app.post("/agent/plan-campaign", async (c) => {
  try {
    const body = await c.req.json();
    const request = TeaserGenerationRequestSchema.parse(body);

    const response = await generateTeasersWith0G(request, {
      mock: process.env.OG_COMPUTE_MOCK === "true"
    });

    return c.json({
      ok: true,
      sponsor: "0G",
      step: "agent_planned",
      response
    });
  } catch (error) {
    return jsonError(c, error, 400);
  }
});

/**
 * Publishes to the local social sandbox.
 *
 * This is the fake Instagram-compatible adapter used before Meta app review.
 */
app.post("/social/publish-sandbox", async (c) => {
  try {
    const body = await c.req.json();
    const post = SocialPostSchema.parse(body);

    const sandboxBase =
      process.env.SOCIAL_SANDBOX_URL ?? "http://localhost:8787";

    const mediaRes = await fetch(`${sandboxBase}/media`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        campaignId: post.campaignId,
        caption: post.socialCaption,
        teaserText: post.teaserText,
        mediaUrl: post.mediaUri ?? null,
        unlockUrl: post.unlockUrl
      })
    });

    if (!mediaRes.ok) {
      throw new Error(
        `Social sandbox media creation failed: ${mediaRes.status} ${await mediaRes.text()}`
      );
    }

    const media = (await mediaRes.json()) as { creationId: string };

    const publishRes = await fetch(`${sandboxBase}/media_publish`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        creationId: media.creationId
      })
    });

    if (!publishRes.ok) {
      throw new Error(
        `Social sandbox publish failed: ${publishRes.status} ${await publishRes.text()}`
      );
    }

    const published = await publishRes.json();

    return c.json({
      ok: true,
      step: "social_published",
      platform: "social_sandbox",
      post,
      published
    });
  } catch (error) {
    return jsonError(c, error, 400);
  }
});


const UintStringSchema = z
  .union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)])
  .transform((value) => value.toString());


const BuildEnsRecordsSchema = z.object({
  ensName: z.string().min(3),
  agentAddress: HexAddressSchema,
  agentRegistryAddress: HexAddressSchema.default(
    process.env.KYMACAST_AGENT_REGISTRY_ADDRESS ??
      "0x0000000000000000000000000000000000000000"
  ),
  agentRegistryInteroperableAddress: z.string().optional(),
  agentId: z.union([z.string(), z.number(), z.bigint()]).default("0"),
  campaignRegistryAddress: HexAddressSchema.default(
    process.env.KYMACAST_CAMPAIGN_REGISTRY_ADDRESS ??
      "0x0000000000000000000000000000000000000000"
  ),
  campaignId: z.union([z.string(), z.number(), z.bigint()]).optional(),
  manifestUri: z.string().min(1),
  zeroGStorageUri: z.string().optional(),
  zeroGContentRootHash: Bytes32Schema.optional(),
  x402UnlockEndpoint: z.string().optional(),
  keeperHubExecutionId: z.string().optional(),
  socialProfileUrl: z.string().optional()
});

const CampaignInputSchema = z.object({
  agentId: UintStringSchema,
  author: HexAddressSchema,
  payTo: HexAddressSchema,
  contentRootHash: Bytes32Schema,
  rightsPolicyHash: Bytes32Schema,
  agentPolicyHash: Bytes32Schema,
  teaserURI: z.string().min(1),
  priceMicrosUsd: UintStringSchema,
  deadline: UintStringSchema,
  nonce: UintStringSchema
});

const RegisterCampaignViaKeeperHubSchema = z.object({
  network: z
    .string()
    .min(1)
    .default(process.env.KEEPERHUB_NETWORK ?? "base-sepolia"),
  contractAddress: HexAddressSchema.default(
    process.env.KYMACAST_CAMPAIGN_REGISTRY_ADDRESS ?? "0x0000000000000000000000000000000000000000"
  ),
  campaignInput: CampaignInputSchema,
  authorSignature: z.string().regex(/^0x[a-fA-F0-9]+$/)
});

function campaignInputToAbiTuple(
  input: z.infer<typeof CampaignInputSchema>
): unknown[] {
  return [
    input.agentId,
    input.author,
    input.payTo,
    input.contentRootHash,
    input.rightsPolicyHash,
    input.agentPolicyHash,
    input.teaserURI,
    input.priceMicrosUsd,
    input.deadline,
    input.nonce
  ];
}

app.post("/campaign/register-via-keeperhub", async (c) => {
  try {
    const body = await c.req.json();
    const input = RegisterCampaignViaKeeperHubSchema.parse(body);

    const functionArgs = [
      campaignInputToAbiTuple(input.campaignInput),
      input.authorSignature
    ];

    if (process.env.KEEPERHUB_MOCK === "true") {
      return c.json({
        ok: true,
        sponsor: "KeeperHub",
        step: "campaign_registration_submitted",
        mock: true,
        keeperhubRequest: {
          network: input.network,
          contractAddress: input.contractAddress,
          functionName: "createCampaignWithSig",
          functionArgs,
          abi: CampaignRegistryAbi
        },
        execution: {
          executionId: `mock-exec-${crypto.randomUUID()}`,
          status: "completed",
          transactionHash: `0x${"1".repeat(64)}`,
          transactionLink: "https://example.com/mock-tx"
        }
      });
    }

    const keeperhub = new KeeperHubClient();

    const execution = await keeperhub.executeContractCall({
      network: input.network,
      contractAddress: input.contractAddress,
      functionName: "createCampaignWithSig",
      functionArgs,
      abi: [...CampaignRegistryAbi],
      gasLimitMultiplier: "1.2"
    });

    return c.json({
      ok: true,
      sponsor: "KeeperHub",
      step: "campaign_registration_submitted",
      mock: false,
      execution
    });
  } catch (error) {
    return jsonError(c, error, 400);
  }
});

app.post("/identity/build-records", async (c) => {
  try {
    const body = await c.req.json();
    const input = BuildEnsRecordsSchema.parse(body);

    const records = buildAgentIdentityTextRecords({
      ensName: input.ensName,
      agentAddress: input.agentAddress,
      agentRegistryAddress: input.agentRegistryAddress,
      agentRegistryInteroperableAddress:
        input.agentRegistryInteroperableAddress ??
        process.env.KYMACAST_AGENT_REGISTRY_INTEROPERABLE_ADDRESS,
      agentId: input.agentId,
      campaignRegistryAddress: input.campaignRegistryAddress,
      campaignId: input.campaignId,
      manifestUri: input.manifestUri,
      zeroGStorageUri: input.zeroGStorageUri,
      zeroGContentRootHash: input.zeroGContentRootHash,
      x402UnlockEndpoint: input.x402UnlockEndpoint,
      keeperHubExecutionId: input.keeperHubExecutionId,
      socialProfileUrl: input.socialProfileUrl
    });

    return c.json({
      ok: true,
      sponsor: "ENS",
      step: "identity_records_built",
      ensName: input.ensName,
      records
    });
  } catch (error) {
    return jsonError(c, error, 400);
  }
});

app.get("/identity/resolve/:ensName", async (c) => {
  try {
    const ensName = c.req.param("ensName");

    const agentRegistryAddress =
      c.req.query("agentRegistryAddress") ??
      process.env.KYMACAST_AGENT_REGISTRY_ADDRESS;

    const agentId = c.req.query("agentId") ?? process.env.KYMACAST_AGENT_ID ?? "0";

    if (!agentRegistryAddress) {
      throw new Error(
        "Missing agentRegistryAddress query param or KYMACAST_AGENT_REGISTRY_ADDRESS env var"
      );
    }

    const publicClient = createEnsPublicClient({
      chainId: Number(process.env.ENS_CHAIN_ID ?? 11155111) as 11155111,
      rpcUrl: process.env.ENS_RPC_URL
    });

    const identity = await resolveAgentIdentity({
      publicClient,
      ensName,
      agentRegistryAddress: agentRegistryAddress as `0x${string}`,
      agentRegistryInteroperableAddress:
        process.env.KYMACAST_AGENT_REGISTRY_INTEROPERABLE_ADDRESS,
      agentId
    });

    return c.json({
      ok: true,
      sponsor: "ENS",
      step: "identity_resolved",
      identity
    });
  } catch (error) {
    return jsonError(c, error, 400);
  }
});

app.get("/campaign/execution/:executionId/status", async (c) => {
  try {
    const executionId = c.req.param("executionId");

    if (process.env.KEEPERHUB_MOCK === "true") {
      return c.json({
        ok: true,
        mock: true,
        execution: {
          executionId,
          status: "completed",
          transactionHash: `0x${"2".repeat(64)}`,
          transactionLink: "https://example.com/mock-tx"
        }
      });
    }

    const keeperhub = new KeeperHubClient();
    const execution = await keeperhub.getExecutionStatus(executionId);

    return c.json({
      ok: true,
      mock: false,
      execution
    });
  } catch (error) {
    return jsonError(c, error, 400);
  }
});

function jsonError(c: any, error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : String(error);

  return c.json(
    {
      ok: false,
      error: message
    },
    status
  );
}

const port = Number(process.env.KYMACAST_API_PORT ?? 4021);

serve({
  fetch: app.fetch,
  port
});

console.log(`Story Agent API running on http://localhost:${port}`);

