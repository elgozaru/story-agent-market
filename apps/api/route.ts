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

