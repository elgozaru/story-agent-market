// src/components/PaywallModal.tsx
// The paywall that readers see when they tap "Unlock" on an Instagram post.
// Handles the full flow: login → check balance → fund → pay → unlock.

import React, { useState, useEffect } from 'react'
import { usePrivy } from '@privy-io/react-auth'
import { useSmartAccount } from '@/hooks/useSmartAccount'
import { useBalance } from '@/hooks/useBalance'
import { usePayment } from '@/hooks/usePayment'
import { OnrampWidget } from './OnrampWidget'
import type { Fragment } from '@/types'

type Props = {
  fragment: Fragment
  onUnlocked: (fragmentId: string) => void
  onClose: () => void
}

type ModalView = 'paywall' | 'funding'

export function PaywallModal({ fragment, onUnlocked, onClose }: Props) {
  const [view, setView] = useState<ModalView>('paywall')

  const { login, authenticated, ready: privyReady } = usePrivy()
  const { smartAddress, kernelClient, isLoading: walletLoading, ready: walletReady } = useSmartAccount()
  const { formatted: balanceFormatted, raw: balanceRaw, refetch: refetchBalance } = useBalance(smartAddress)

  const { status: payStatus, txHash, error: payError, pay, reset: resetPay } = usePayment({
    kernelClient,
    smartAddress,
    onNeedsFunds: () => setView('funding'),
  })

  // Once confirmed, tell parent to unlock content
  useEffect(() => {
    if (payStatus === 'confirmed') {
      setTimeout(() => onUnlocked(fragment.id), 800)
    }
  }, [payStatus, fragment.id, onUnlocked])

  // After funding completes, go back to paywall and auto-pay
  const handleFundingSuccess = async () => {
    setView('paywall')
    await refetchBalance()
    // Give the blockchain a moment to settle
    setTimeout(() => pay(fragment), 1000)
  }

  // ── States ────────────────────────────────────────────
  const isChecking = payStatus === 'checking'
  const isPaying   = payStatus === 'paying'
  const isConfirmed = payStatus === 'confirmed'
  const hasFunds   = balanceRaw >= BigInt(Math.round(fragment.priceUsdc * 1e6))

  const ctaLabel = () => {
    if (!authenticated)              return `Continue with Google`
    if (walletLoading)               return 'Setting up wallet...'
    if (isChecking)                  return 'Checking balance...'
    if (isPaying)                    return 'Processing payment...'
    if (isConfirmed)                 return 'Unlocked! ✓'
    if (!hasFunds && walletReady)    return 'Add funds to unlock'
    return `Pay ${fragment.priceUsdc} USDC`
  }

  const handleCta = async () => {
    if (!authenticated) { await login(); return }
    if (!walletReady)    return
    if (!hasFunds)       { setView('funding'); return }
    await pay(fragment)
  }

  const isLoading = walletLoading || isChecking || isPaying
  const disabled  = isLoading || isConfirmed || !privyReady

  // ── Show funding widget ───────────────────────────────
  if (view === 'funding' && smartAddress) {
    return (
      <OnrampWidget
        walletAddress={smartAddress}
        requiredUsdc={fragment.priceUsdc}
        onSuccess={handleFundingSuccess}
        onBack={() => { setView('paywall'); resetPay() }}
      />
    )
  }

  // ── Main paywall ──────────────────────────────────────
  return (
    <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={styles.modal}>

        {/* Top handle */}
        <div style={styles.handle} />

        {/* Fragment info */}
        <div style={styles.fragmentInfo}>
          <span style={styles.chapterTag}>
            Chapter {fragment.chapterNumber} of {fragment.totalChapters}
          </span>
          <h2 style={styles.fragmentTitle}>{fragment.title}</h2>
          <p style={styles.authorLine}>by {fragment.authorEns}</p>
        </div>

        {/* Preview text — blurred at bottom */}
        <div style={styles.previewWrap}>
          <p style={styles.previewText}>{fragment.previewText}</p>
          <div style={styles.previewFade} />
        </div>

        {/* Lock icon + price */}
        <div style={styles.lockRow}>
          <div style={styles.lockBadge}>
            <span style={{ fontSize: 14 }}>🔒</span>
            <span style={styles.lockPrice}>{fragment.priceUsdc} USDC to continue</span>
          </div>
          <span style={styles.lockSub}>One-time · No subscription · x402</span>
        </div>

        {/* Wallet info (if logged in) */}
        {authenticated && walletReady && (
          <div style={styles.walletRow}>
            <span style={styles.walletLabel}>Your balance</span>
            <span style={styles.walletBalance}>{balanceFormatted} USDC</span>
          </div>
        )}

        {/* CTA Button */}
        <button
          style={{ ...styles.cta, ...(disabled ? styles.ctaDisabled : {}) }}
          onClick={handleCta}
          disabled={disabled}
        >
          {isLoading && <Spinner />}
          {!isLoading && !authenticated && <span style={{ marginRight: 6 }}>🔵</span>}
          {ctaLabel()}
        </button>

        {/* Social login options (when not logged in) */}
        {!authenticated && (
          <div style={styles.loginOptions}>
            <span style={styles.loginOr}>or</span>
            <div style={styles.socialRow}>
              <SocialBtn icon="🍎" label="Apple" onClick={login} />
              <SocialBtn icon="✉️" label="Email" onClick={login} />
              <SocialBtn icon="🐦" label="Twitter" onClick={login} />
            </div>
          </div>
        )}

        {/* Error */}
        {payError && payError !== 'insufficient-funds' && (
          <p style={styles.errorText}>{payError}</p>
        )}

        {/* Confirmed */}
        {isConfirmed && (
          <div style={styles.confirmedBanner}>
            ✓ Payment confirmed · {txHash?.slice(0, 10)}... · Content unlocking
          </div>
        )}

        {/* Footer */}
        <p style={styles.footer}>
          Powered by KymaCast · Gas free · Secured on Base
        </p>

      </div>
    </div>
  )
}

// ─── SUB-COMPONENTS ──────────────────────────────────────
function Spinner() {
  return (
    <span style={{
      display: 'inline-block',
      width: 14, height: 14,
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff',
      borderRadius: '50%',
      animation: 'spin 0.8s linear infinite',
      marginRight: 8,
    }} />
  )
}

function SocialBtn({ icon, label, onClick }: { icon: string; label: string; onClick: () => void }) {
  return (
    <button style={styles.socialBtn} onClick={onClick}>
      <span>{icon}</span>
      <span style={{ fontSize: 12 }}>{label}</span>
    </button>
  )
}

// ─── STYLES ──────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.72)',
    display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#0E0C28',
    border: '1px solid rgba(107,92,231,0.3)',
    borderRadius: '20px 20px 0 0',
    width: '100%', maxWidth: 480,
    padding: '0 0 32px',
    display: 'flex', flexDirection: 'column',
    animation: 'slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1)',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    background: 'rgba(240,238,248,0.2)',
    margin: '12px auto 20px',
  },
  fragmentInfo: { padding: '0 24px', marginBottom: 14 },
  chapterTag: {
    fontSize: 10, fontWeight: 600, letterSpacing: 2,
    textTransform: 'uppercase' as const,
    color: '#00C9A7', fontFamily: 'monospace',
  },
  fragmentTitle: { fontSize: 18, fontWeight: 700, color: '#F0EEF8', margin: '6px 0 4px' },
  authorLine: { fontSize: 12, color: 'rgba(240,238,248,0.45)', margin: 0, fontFamily: 'monospace' },
  previewWrap: { position: 'relative', margin: '0 24px 16px', maxHeight: 80, overflow: 'hidden' },
  previewText: {
    fontSize: 13, color: 'rgba(240,238,248,0.65)', lineHeight: 1.65,
    fontStyle: 'italic', margin: 0,
  },
  previewFade: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 40,
    background: 'linear-gradient(to top, #0E0C28, transparent)',
  },
  lockRow: {
    margin: '0 24px 10px',
    padding: '10px 14px',
    background: 'rgba(107,92,231,0.1)',
    border: '1px solid rgba(107,92,231,0.3)',
    borderRadius: 10,
    display: 'flex', flexDirection: 'column' as const, gap: 4,
  },
  lockBadge: { display: 'flex', alignItems: 'center', gap: 8 },
  lockPrice: { fontSize: 15, fontWeight: 700, color: '#F0EEF8' },
  lockSub: { fontSize: 11, color: 'rgba(240,238,248,0.4)', fontFamily: 'monospace' },
  walletRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    margin: '0 24px 10px',
    padding: '8px 12px',
    background: 'rgba(0,201,167,0.07)',
    borderRadius: 8,
    border: '1px solid rgba(0,201,167,0.2)',
  },
  walletLabel: { fontSize: 12, color: 'rgba(240,238,248,0.45)', fontFamily: 'monospace' },
  walletBalance: { fontSize: 13, fontWeight: 600, color: '#00C9A7', fontFamily: 'monospace' },
  cta: {
    margin: '4px 24px 0',
    padding: '14px',
    background: 'linear-gradient(135deg, #6B5CE7, #4A3DB5)',
    border: 'none', borderRadius: 10,
    color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'opacity 0.2s',
  },
  ctaDisabled: { opacity: 0.6, cursor: 'not-allowed' },
  loginOptions: { margin: '12px 24px 0', textAlign: 'center' },
  loginOr: { fontSize: 11, color: 'rgba(240,238,248,0.3)' },
  socialRow: { display: 'flex', gap: 8, marginTop: 8, justifyContent: 'center' },
  socialBtn: {
    flex: 1,
    padding: '8px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, color: '#F0EEF8',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    cursor: 'pointer',
  },
  errorText: {
    margin: '10px 24px 0',
    fontSize: 12, color: '#E74C5C', textAlign: 'center',
  },
  confirmedBanner: {
    margin: '10px 24px 0',
    padding: '10px 14px',
    background: 'rgba(0,201,167,0.12)',
    border: '1px solid rgba(0,201,167,0.3)',
    borderRadius: 8,
    fontSize: 12, color: '#00C9A7', textAlign: 'center',
    fontFamily: 'monospace',
  },
  footer: {
    marginTop: 16, textAlign: 'center',
    fontSize: 11, color: 'rgba(240,238,248,0.2)',
    fontFamily: 'monospace',
  },
}
