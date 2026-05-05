// src/types/index.ts

export type PaymentStatus =
  | 'idle'
  | 'checking'
  | 'needs-funds'
  | 'funding'
  | 'swapping'
  | 'paying'
  | 'confirmed'
  | 'error'

export type OnrampStatus =
  | 'idle'
  | 'initializing'
  | 'open'
  | 'processing'
  | 'complete'
  | 'error'

export type Fragment = {
  id: `0x${string}`
  title: string
  chapterNumber: number
  totalChapters: number
  priceUsdc: number
  previewText: string
  authorEns: string
  campaignId: string
}

export type PaymentResult = {
  success: boolean
  txHash?: `0x${string}`
  error?: string
}

export type AuthorProfile = {
  address: `0x${string}`
  smartAccountAddress: `0x${string}`
  ensName: string
  penName: string
  genre: string[]
  audience: string
  pricePerFragment: number
  autoApprove: boolean
}

export type OnrampConfig = {
  walletAddress: `0x${string}`
  amountUsd: number
  currency?: 'usdc'
  network?: 'base'
}
