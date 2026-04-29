/*
import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactEvmScheme } from "@x402/evm/exact/server";

const app = new Hono();

const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.X402_FACILITATOR_URL!
});

const resourceServer = new x402ResourceServer(facilitatorClient)
  .register(process.env.X402_NETWORK!, new ExactEvmScheme());

app.use(
  paymentMiddleware(
    {
      "GET /story/:campaignId/continue": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.01",
            network: process.env.X402_NETWORK!,
            payTo: process.env.AUTHOR_PAY_TO!
          }
        ],
        description: "Unlock the continuation of this teaser story",
        mimeType: "application/json"
      }
    },
    resourceServer
  )
);

app.get("/story/:campaignId/teaser", (c) => {
  return c.json({
    campaignId: c.req.param("campaignId"),
    teaser: "The lighthouse woke only when the moon forgot its name...",
    unlockPath: `/story/${c.req.param("campaignId")}/continue`
  });
});

app.get("/story/:campaignId/continue", (c) => {
  return c.json({
    campaignId: c.req.param("campaignId"),
    continuation: "Behind the iron door, a sea of letters breathed in the dark..."
  });
});

serve({ fetch: app.fetch, port: 4021 });

*/

import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";

const app = new Hono();

const createdMedia = new Map<string, any>();
const publishedMedia = new Map<string, any>();

app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "social-sandbox",
    timestamp: new Date().toISOString()
  });
});

app.post("/media", async (c) => {
  const body = await c.req.json();
  const creationId = crypto.randomUUID();

  createdMedia.set(creationId, {
    creationId,
    ...body,
    status: "created",
    createdAt: new Date().toISOString()
  });

  return c.json({
    creationId,
    status: "created"
  });
});

app.post("/media_publish", async (c) => {
  const { creationId } = await c.req.json();

  const media = createdMedia.get(creationId);

  if (!media) {
    return c.json(
      {
        ok: false,
        error: `Unknown creationId ${creationId}`
      },
      404
    );
  }

  const mediaId = crypto.randomUUID();

  const published = {
    ...media,
    mediaId,
    status: "published",
    permalink: `https://social-sandbox.local/p/${mediaId}`,
    publishedAt: new Date().toISOString()
  };

  publishedMedia.set(mediaId, published);

  return c.json({
    mediaId,
    status: "published",
    permalink: published.permalink
  });
});

app.get("/media/:mediaId", (c) => {
  const mediaId = c.req.param("mediaId");
  const media = publishedMedia.get(mediaId);

  if (!media) {
    return c.json(
      {
        ok: false,
        error: `Unknown mediaId ${mediaId}`
      },
      404
    );
  }

  return c.json(media);
});

app.get("/media/:mediaId/insights", (c) => {
  const mediaId = c.req.param("mediaId");

  if (!publishedMedia.has(mediaId)) {
    return c.json(
      {
        ok: false,
        error: `Unknown mediaId ${mediaId}`
      },
      404
    );
  }

  return c.json({
    mediaId,
    impressions: 1200,
    reach: 830,
    likes: 51,
    comments: 4,
    shares: 8,
    saves: 11,
    unlockClicks: 17,
    paidUnlocks: 5,
    revenueUsd: 0.05
  });
});

const port = Number(process.env.SOCIAL_SANDBOX_PORT ?? 8787);

serve({
  fetch: app.fetch,
  port
});

console.log(`Social sandbox running on http://localhost:${port}`);  