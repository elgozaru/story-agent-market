// src/config/index.ts
import { base, baseSepolia } from 'viem/chains'
import type { PrivyClientConfig } from '@privy-io/react-auth'

const IS_PROD = import.meta.env.VITE_ENVIRONMENT === 'production'

// ─── CHAIN ───────────────────────────────────────────────
export const CHAIN = IS_PROD ? base : baseSepolia

// ─── CONTRACTS ───────────────────────────────────────────
export const USDC_ADDRESS = (
  IS_PROD
    ? '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'  // Base mainnet
    : '0x036CbD53842c5426634e7929541eC2318f3dCF7e'  // Base Sepolia
) as `0x${string}`

export const KYMACAST_ADDRESS = import.meta.env.VITE_KYMACAST_CONTRACT as `0x${string}`

// ─── ZERODEV ─────────────────────────────────────────────
export const ZERODEV_BUNDLER_URL  = import.meta.env.VITE_ZERODEV_BUNDLER_URL  as string
export const ZERODEV_PAYMASTER_URL = import.meta.env.VITE_ZERODEV_PAYMASTER_URL as string

// ─── PRIVY ───────────────────────────────────────────────
export const PRIVY_APP_ID = import.meta.env.VITE_PRIVY_APP_ID as string

export const PRIVY_CONFIG: PrivyClientConfig = {
  appearance: {
    theme: 'dark',
    accentColor: '#6B5CE7',
    logo: '/kymacast-logo.svg',
    landingHeader: 'Unlock this story',
    loginMessage: 'Sign in to continue reading',
    showWalletLoginFirst: false,
  },
  loginMethods: ['google', 'apple', 'email', 'twitter'],
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
    requireUserPasswordOnCreate: false,
    noPromptOnSignature: false,
  },
  defaultChain: CHAIN,
  supportedChains: [CHAIN],
  externalWallets: {
    coinbaseWallet: { connectionOptions: 'smartWalletOnly' },
  },
}

// ─── STRIPE ──────────────────────────────────────────────
export const STRIPE_PK = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string

// ─── KYMACAST ECONOMICS ──────────────────────────────────
export const AUTHOR_SHARE   = 0.85
export const PROTOCOL_SHARE = 0.15
export const SPONSORED_TX   = 5       // free gas txs per user
