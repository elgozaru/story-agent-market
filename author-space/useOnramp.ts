// src/hooks/useOnramp.ts
// Opens the Stripe Crypto on-ramp widget.
// Delivers USDC directly to the reader's smart account on Base.
// No swap needed — Stripe handles the fiat → USDC conversion.

import { useState, useRef, useCallback } from 'react'
import { loadStripeOnramp } from '@stripe/crypto'
import type { StripeOnrampSession } from '@stripe/crypto'
import { STRIPE_PK } from '@/config'
import type { OnrampStatus } from '@/types'

type UseOnrampOptions = {
  walletAddress: `0x${string}`
  // Called when the on-ramp completes and USDC has arrived
  onSuccess: () => void
  // Called if the user closes the widget without completing
  onCancel?: () => void
}

export function useOnramp({ walletAddress, onSuccess, onCancel }: UseOnrampOptions) {
  const [status, setStatus] = useState<OnrampStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef<StripeOnrampSession | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // ── Open the on-ramp widget ────────────────────────────
  const open = useCallback(async (amountUsd: number = 5) => {
    if (!containerRef.current) return

    setStatus('initializing')
    setError(null)

    try {
      // 1. Ask our backend to create a Stripe on-ramp session
      const res = await fetch('/api/onramp/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress,
          amountUsd,
          currency: 'usdc',
          network: 'base',
        }),
      })

      if (!res.ok) throw new Error('Failed to create on-ramp session')

      const { clientSecret } = await res.json()

      // 2. Load the Stripe Crypto SDK
      const stripeOnramp = await loadStripeOnramp(STRIPE_PK)

      // 3. Create and mount the session widget
      const session = stripeOnramp.createSession({ clientSecret })

      session.mount(containerRef.current)
      sessionRef.current = session
      setStatus('open')

      // 4. Listen for status changes
      session.addEventListener('onramp_session_updated', ({ payload }) => {
        const { status: sessionStatus } = payload.session

        if (sessionStatus === 'fulfillment_processing') {
          setStatus('processing')
        }

        if (sessionStatus === 'fulfillment_complete') {
          setStatus('complete')
          // Small delay to let the blockchain confirm
          setTimeout(onSuccess, 3000)
        }
      })

      // 5. Handle user closing the widget
      session.addEventListener('onramp_ui_loaded', () => setStatus('open'))

    } catch (err) {
      console.error('[Onramp] Error:', err)
      setError('Could not open payment widget. Please try again.')
      setStatus('error')
    }
  }, [walletAddress, onSuccess])

  // ── Dismiss / reset ───────────────────────────────────
  const dismiss = useCallback(() => {
    if (sessionRef.current && containerRef.current) {
      containerRef.current.innerHTML = ''
    }
    sessionRef.current = null
    setStatus('idle')
    setError(null)
    onCancel?.()
  }, [onCancel])

  return {
    status,
    error,
    open,
    dismiss,
    containerRef,
    isOpen: status === 'open' || status === 'processing',
    isComplete: status === 'complete',
  }
}
