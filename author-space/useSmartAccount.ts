// src/hooks/useSmartAccount.ts
// Wraps the Privy embedded wallet as a ZeroDev ERC-4337 smart account.
// Gas is sponsored by KymaCast — readers never pay gas.

import { useState, useEffect, useRef } from 'react'
import { useWallets } from '@privy-io/react-auth'
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from '@zerodev/sdk'
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator'
import { KERNEL_V3_1 } from '@zerodev/sdk/constants'
import { providerToSmartAccountSigner } from 'permissionless'
import { createPublicClient, http } from 'viem'
import { CHAIN, ZERODEV_BUNDLER_URL, ZERODEV_PAYMASTER_URL } from '@/config'

// ─── PUBLIC CLIENT ────────────────────────────────────────
const publicClient = createPublicClient({
  chain: CHAIN,
  transport: http(import.meta.env.VITE_BASE_RPC_URL),
})

const ENTRY_POINT = {
  address: '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as `0x${string}`,
  version: '0.7' as const,
}

// ─── TYPES ───────────────────────────────────────────────
type KernelClient = Awaited<ReturnType<typeof createKernelAccountClient>>

type SmartAccountState = {
  smartAddress: `0x${string}` | null
  kernelClient: KernelClient | null
  isLoading: boolean
  error: string | null
}

// ─── HOOK ────────────────────────────────────────────────
export function useSmartAccount() {
  const { wallets } = useWallets()
  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')

  const [state, setState] = useState<SmartAccountState>({
    smartAddress: null,
    kernelClient: null,
    isLoading: false,
    error: null,
  })

  // Cache the kernel client so we don't rebuild it on every render
  const clientRef = useRef<KernelClient | null>(null)

  useEffect(() => {
    if (!embeddedWallet) return
    if (clientRef.current) return  // already built

    buildSmartAccount(embeddedWallet)
  }, [embeddedWallet?.address])

  async function buildSmartAccount(wallet: typeof embeddedWallet) {
    if (!wallet) return

    setState(s => ({ ...s, isLoading: true, error: null }))

    try {
      // 1. Get the EIP-1193 provider from Privy
      const provider = await wallet.getEthereumProvider()

      // 2. Wrap it as a viem-compatible signer
      const signer = await providerToSmartAccountSigner(provider)

      // 3. Create the ECDSA validator (signing plugin for Kernel)
      const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        signer,
        kernelVersion: KERNEL_V3_1,
        entryPoint: ENTRY_POINT,
      })

      // 4. Derive the smart account address (deterministic from signer)
      const account = await createKernelAccount(publicClient, {
        plugins: { sudo: ecdsaValidator },
        kernelVersion: KERNEL_V3_1,
        entryPoint: ENTRY_POINT,
      })

      // 5. Create the paymaster — KymaCast pays gas for readers
      const paymasterClient = createZeroDevPaymasterClient({
        chain: CHAIN,
        transport: http(ZERODEV_PAYMASTER_URL),
        entryPoint: ENTRY_POINT,
      })

      // 6. Combine into the full kernel client
      const kernelClient = createKernelAccountClient({
        account,
        chain: CHAIN,
        bundlerTransport: http(ZERODEV_BUNDLER_URL),
        middleware: {
          // Every user operation gets gas sponsored
          sponsorUserOperation: ({ userOperation }) =>
            paymasterClient.sponsorUserOperation({
              userOperation,
              entryPoint: ENTRY_POINT,
            }),
        },
      })

      clientRef.current = kernelClient

      setState({
        smartAddress: account.address,
        kernelClient,
        isLoading: false,
        error: null,
      })
    } catch (err) {
      console.error('[SmartAccount] Build failed:', err)
      setState(s => ({
        ...s,
        isLoading: false,
        error: 'Could not initialize wallet. Please try again.',
      }))
    }
  }

  return {
    ...state,
    embeddedWalletAddress: embeddedWallet?.address ?? null,
    ready: !!state.kernelClient && !state.isLoading,
  }
}
