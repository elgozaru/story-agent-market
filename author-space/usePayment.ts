// src/hooks/usePayment.ts
// Orchestrates the full x402 payment flow:
// check balance → fund if needed → pay → unlock content
//
// States: idle → checking → needs-funds → paying → confirmed → error

import { useState, useCallback } from 'react'
import { parseUnits, encodeFunctionData } from 'viem'
import { createPublicClient, http } from 'viem'
import type { KernelClient } from '@zerodev/sdk'
import { CHAIN, USDC_ADDRESS, KYMACAST_ADDRESS } from '@/config'
import { ERC20_ABI, KYMACAST_ABI } from '@/config/abis'
import type { PaymentStatus, PaymentResult, Fragment } from '@/types'

const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(import.meta.env.VITE_BASE_RPC_URL),
})

type UsePaymentOptions = {
  kernelClient: KernelClient | null
  smartAddress: `0x${string}` | null
  // Called when balance is too low — triggers the on-ramp
  onNeedsFunds: () => void
}

export function usePayment({ kernelClient, smartAddress, onNeedsFunds }: UsePaymentOptions) {
  const [status, setStatus]   = useState<PaymentStatus>('idle')
  const [txHash, setTxHash]   = useState<`0x${string}` | null>(null)
  const [error, setError]     = useState<string | null>(null)

  // ── Main pay function ─────────────────────────────────
  const pay = useCallback(async (fragment: Fragment): Promise<PaymentResult> => {
    if (!kernelClient || !smartAddress) {
      return { success: false, error: 'Wallet not ready' }
    }

    setStatus('checking')
    setError(null)
    setTxHash(null)

    try {
      // ── 1. Check if reader already has access ──────────
      const alreadyUnlocked = await publicClient.readContract({
        address: KYMACAST_ADDRESS,
        abi: KYMACAST_ABI,
        functionName: 'hasAccess',
        args: [fragment.id, smartAddress],
      })

      if (alreadyUnlocked) {
        setStatus('confirmed')
        return { success: true }
      }

      // ── 2. Check USDC balance ──────────────────────────
      const priceRaw = parseUnits(fragment.priceUsdc.toString(), 6)

      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [smartAddress],
      })

      if (balance < priceRaw) {
        setStatus('needs-funds')
        onNeedsFunds()
        return { success: false, error: 'insufficient-funds' }
      }

      // ── 3. Execute the payment ─────────────────────────
      setStatus('paying')

      // Encode the USDC transfer to KymaCast contract
      const transferCalldata = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [KYMACAST_ADDRESS, priceRaw],
      })

      // Encode the content unlock call
      const unlockCalldata = encodeFunctionData({
        abi: KYMACAST_ABI,
        functionName: 'unlockFragment',
        args: [fragment.id, smartAddress],
      })

      // Send both calls as a batch (atomic) via the smart account
      // Gas is sponsored by ZeroDev paymaster — user pays $0
      const hash = await kernelClient.sendUserOperation({
        userOperation: {
          // Batch: transfer USDC + unlock fragment in a single tx
          callData: await kernelClient.account.encodeCalls([
            { to: USDC_ADDRESS,       value: 0n, data: transferCalldata },
            { to: KYMACAST_ADDRESS,   value: 0n, data: unlockCalldata   },
          ]),
        },
      })

      // ── 4. Wait for confirmation (~2s on Base) ──────────
      const receipt = await kernelClient.waitForUserOperationReceipt({ hash })

      if (!receipt.success) {
        throw new Error('Transaction reverted on-chain')
      }

      setTxHash(receipt.receipt.transactionHash)
      setStatus('confirmed')

      return {
        success: true,
        txHash: receipt.receipt.transactionHash,
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Payment failed'
      console.error('[Payment] Error:', message)
      setStatus('error')
      setError(message)
      return { success: false, error: message }
    }
  }, [kernelClient, smartAddress, onNeedsFunds])

  const reset = useCallback(() => {
    setStatus('idle')
    setTxHash(null)
    setError(null)
  }, [])

  return { status, txHash, error, pay, reset }
}
