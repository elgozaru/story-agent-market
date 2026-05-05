// src/hooks/useBalance.ts
// Polls the USDC balance of the reader's smart account on Base.

import { useState, useEffect, useCallback } from 'react'
import { createPublicClient, http, formatUnits } from 'viem'
import { CHAIN, USDC_ADDRESS } from '@/config'
import { ERC20_ABI } from '@/config/abis'

const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(import.meta.env.VITE_BASE_RPC_URL),
})

type BalanceState = {
  raw: bigint          // USDC in smallest unit (6 decimals)
  formatted: string    // human-readable e.g. "1.23"
  isLoading: boolean
  error: string | null
}

export function useBalance(address: `0x${string}` | null) {
  const [state, setState] = useState<BalanceState>({
    raw: 0n,
    formatted: '0.00',
    isLoading: false,
    error: null,
  })

  const fetchBalance = useCallback(async () => {
    if (!address) return

    setState(s => ({ ...s, isLoading: true }))
    try {
      const raw = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      })

      setState({
        raw,
        formatted: Number(formatUnits(raw, 6)).toFixed(2),
        isLoading: false,
        error: null,
      })
    } catch {
      setState(s => ({ ...s, isLoading: false, error: 'Failed to load balance' }))
    }
  }, [address])

  // Fetch on mount and whenever address changes
  useEffect(() => { fetchBalance() }, [fetchBalance])

  // Poll every 10 seconds while component is mounted
  useEffect(() => {
    if (!address) return
    const interval = setInterval(fetchBalance, 10_000)
    return () => clearInterval(interval)
  }, [address, fetchBalance])

  return { ...state, refetch: fetchBalance }
}
