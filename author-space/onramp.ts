// server/onramp.ts
// Express endpoint that creates Stripe Crypto on-ramp sessions.
// Call this from the React app when the user needs to fund their wallet.
// This must run server-side — never expose STRIPE_SECRET_KEY to the browser.

import express from 'express'
import Stripe from 'stripe'

const router = express.Router()
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

// POST /api/onramp/session
// Body: { walletAddress, amountUsd, currency, network }
router.post('/session', async (req, res) => {
  const { walletAddress, amountUsd = 5, currency = 'usdc', network = 'base' } = req.body

  if (!walletAddress || !/^0x[0-9a-fA-F]{40}$/.test(walletAddress)) {
    return res.status(400).json({ error: 'Invalid wallet address' })
  }

  try {
    const session = await stripe.crypto.onrampSessions.create({
      transaction_details: {
        destination_currency:  currency,           // 'usdc'
        destination_network:   network,            // 'base'
        wallet_address:        walletAddress,       // user's smart account
        source_currency:       'usd',
        source_amount:         String(amountUsd),  // e.g. '5.00'
      },
      customer_ip_address: req.ip,
    })

    // Return only the client_secret — never the full session object
    res.json({ clientSecret: session.client_secret })

  } catch (err) {
    console.error('[Onramp] Stripe error:', err)
    res.status(500).json({ error: 'Failed to create on-ramp session' })
  }
})

export default router

// ─── USAGE IN EXPRESS APP ─────────────────────────────────
// import onrampRouter from './server/onramp'
// app.use('/api/onramp', onrampRouter)
