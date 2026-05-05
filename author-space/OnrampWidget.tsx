// src/components/OnrampWidget.tsx
// Stripe Crypto on-ramp widget.
// User pays with Apple Pay / Google Pay / card → receives USDC on Base.

import React from 'react'
import { useOnramp } from '@/hooks/useOnramp'

type Props = {
  walletAddress: `0x${string}`
  requiredUsdc: number
  onSuccess: () => void
  onBack: () => void
}

export function OnrampWidget({ walletAddress, requiredUsdc, onSuccess, onBack }: Props) {
  const { status, error, open, dismiss, containerRef, isOpen, isComplete } = useOnramp({
    walletAddress,
    onSuccess,
    onCancel: onBack,
  })

  // Suggest adding a bit more than required for future reads
  const suggestedAmount = Math.max(5, Math.ceil(requiredUsdc * 10))

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>

        {/* Header */}
        <div style={styles.header}>
          <button onClick={onBack} style={styles.backBtn}>← Back</button>
          <span style={styles.headerTitle}>Add funds</span>
          <div style={{ width: 48 }} />
        </div>

        {/* Not yet opened */}
        {status === 'idle' && (
          <div style={styles.body}>
            <div style={styles.iconWrap}>💳</div>
            <h2 style={styles.title}>Top up your wallet</h2>
            <p style={styles.subtitle}>
              You need <strong style={{ color: '#6B5CE7' }}>{requiredUsdc} USDC</strong> to unlock
              this chapter. Pay with Apple Pay, Google Pay, or any card.
            </p>

            <div style={styles.amountRow}>
              {[2, 5, 10, 20].map(amt => (
                <button
                  key={amt}
                  style={{
                    ...styles.amountBtn,
                    ...(amt === suggestedAmount ? styles.amountBtnActive : {}),
                  }}
                  onClick={() => open(amt)}
                >
                  ${amt}
                </button>
              ))}
            </div>

            <p style={styles.note}>
              USDC delivered directly to your wallet on Base. No account needed.
            </p>

            <div style={styles.paymentIcons}>
              <span title="Apple Pay">🍎</span>
              <span title="Google Pay">G</span>
              <span title="Visa / Mastercard">💳</span>
            </div>
          </div>
        )}

        {/* Initializing */}
        {status === 'initializing' && (
          <div style={{ ...styles.body, alignItems: 'center' }}>
            <div style={styles.spinner} />
            <p style={styles.subtitle}>Opening payment...</p>
          </div>
        )}

        {/* Stripe widget container */}
        {(isOpen || status === 'initializing') && (
          <div ref={containerRef} style={styles.stripeContainer} />
        )}

        {/* Processing */}
        {status === 'processing' && (
          <div style={{ ...styles.body, alignItems: 'center' }}>
            <div style={styles.spinner} />
            <h2 style={styles.title}>Processing payment...</h2>
            <p style={styles.subtitle}>Your USDC is on its way to Base. This takes 20–30 seconds.</p>
          </div>
        )}

        {/* Complete */}
        {isComplete && (
          <div style={{ ...styles.body, alignItems: 'center' }}>
            <div style={styles.successIcon}>✓</div>
            <h2 style={styles.title}>Funds added!</h2>
            <p style={styles.subtitle}>Your wallet has been topped up. Unlocking your chapter...</p>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div style={{ ...styles.body, alignItems: 'center' }}>
            <div style={styles.errorIcon}>!</div>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.subtitle}>{error}</p>
            <button style={styles.retryBtn} onClick={() => open(suggestedAmount)}>
              Try again
            </button>
          </div>
        )}

        {/* Powered by */}
        <div style={styles.footer}>
          <span style={styles.footerText}>Powered by Stripe · Funds arrive on Base</span>
        </div>
      </div>
    </div>
  )
}

// ─── STYLES ──────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    background: '#0E0C28',
    border: '1px solid rgba(107,92,231,0.3)',
    borderRadius: 16,
    width: '100%', maxWidth: 420,
    overflow: 'hidden',
    display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: '1px solid rgba(107,92,231,0.15)',
  },
  backBtn: {
    background: 'none', border: 'none',
    color: 'rgba(240,238,248,0.5)', cursor: 'pointer',
    fontSize: 13, padding: '4px 8px',
  },
  headerTitle: { fontSize: 14, fontWeight: 600, color: '#F0EEF8' },
  body: {
    padding: '28px 24px',
    display: 'flex', flexDirection: 'column', gap: 14,
  },
  iconWrap: { fontSize: 36, textAlign: 'center' },
  title: { fontSize: 20, fontWeight: 700, color: '#F0EEF8', textAlign: 'center', margin: 0 },
  subtitle: { fontSize: 13, color: 'rgba(240,238,248,0.6)', textAlign: 'center', lineHeight: 1.6, margin: 0 },
  amountRow: { display: 'flex', gap: 8 },
  amountBtn: {
    flex: 1, padding: '10px 0',
    background: 'rgba(107,92,231,0.1)',
    border: '1px solid rgba(107,92,231,0.25)',
    borderRadius: 8, color: '#A89EF5', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
  amountBtnActive: {
    background: '#6B5CE7', borderColor: '#6B5CE7', color: '#fff',
  },
  note: { fontSize: 11, color: 'rgba(240,238,248,0.35)', textAlign: 'center', margin: 0 },
  paymentIcons: {
    display: 'flex', justifyContent: 'center', gap: 16,
    fontSize: 22,
  },
  stripeContainer: { minHeight: 400, padding: '0 16px 16px' },
  spinner: {
    width: 40, height: 40, borderRadius: '50%',
    border: '3px solid rgba(107,92,231,0.2)',
    borderTopColor: '#6B5CE7',
    animation: 'spin 0.9s linear infinite',
    alignSelf: 'center',
  },
  successIcon: {
    width: 56, height: 56, borderRadius: '50%',
    background: 'rgba(0,201,167,0.15)',
    border: '2px solid #00C9A7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24, color: '#00C9A7', alignSelf: 'center',
  },
  errorIcon: {
    width: 56, height: 56, borderRadius: '50%',
    background: 'rgba(231,76,92,0.15)',
    border: '2px solid #E74C5C',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 24, color: '#E74C5C', alignSelf: 'center',
  },
  retryBtn: {
    padding: '10px 24px',
    background: '#6B5CE7', border: 'none', borderRadius: 8,
    color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
  },
  footer: {
    padding: '10px 16px',
    borderTop: '1px solid rgba(107,92,231,0.1)',
    textAlign: 'center',
  },
  footerText: { fontSize: 11, color: 'rgba(240,238,248,0.25)' },
}
