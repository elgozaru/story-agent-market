import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { z } from "zod";

import {
  HexAddressSchema,
  SocialPostSchema,
  TeaserGenerationRequestSchema
} from "@story/shared";

import { generateTeasersWith0G } from "@story/og";
import { KeeperHubClient } from "@story/keeperhub";

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

const RegisterCampaignViaKeeperHubSchema = z.object({
  network: z.string().min(1).default(process.env.KEEPERHUB_NETWORK ?? "base-sepolia"),
  contractAddress: HexAddressSchema,
  abi: z.array(z.unknown()).default([]),
  campaignInput: z.unknown(),
  authorSignature: z.string().regex(/^0x[a-fA-F0-9]+$/)
});

/**
 * KeeperHub-backed campaign registration.
 *
 * Expected Solidity shape:
 *   createCampaignWithSig(CampaignInput campaignInput, bytes authorSignature)
 *
 * Local mode:
 *   KEEPERHUB_MOCK=true
 *
 * Real mode:
 *   KEEPERHUB_API_BASE=https://app.keeperhub.com/api
 *   KEEPERHUB_API_KEY=...
 */
app.post("/campaign/register-via-keeperhub", async (c) => {
  try {
    const body = await c.req.json();
    const input = RegisterCampaignViaKeeperHubSchema.parse(body);

    if (process.env.KEEPERHUB_MOCK === "true") {
      return c.json({
        ok: true,
        sponsor: "KeeperHub",
        step: "campaign_registration_submitted",
        mock: true,
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
      functionArgs: [input.campaignInput, input.authorSignature],
      abi: input.abi,
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

