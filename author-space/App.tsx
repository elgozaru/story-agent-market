// src/App.tsx
// Root app. Wraps everything with Privy and React Query providers.
// Routes between: Author Onboarding, Author Dashboard, Reader Paywall

import React, { useState } from 'react'
import { PrivyProvider } from '@privy-io/react-auth'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PRIVY_APP_ID, PRIVY_CONFIG } from '@/config'
import { AuthorOnboarding } from '@/components/AuthorOnboarding'
import { PaywallModal } from '@/components/PaywallModal'
import type { Fragment, AuthorProfile } from '@/types'

const queryClient = new QueryClient()

// ─── DEMO FRAGMENT ────────────────────────────────────────
// In production, this comes from a URL param or post metadata
const DEMO_FRAGMENT: Fragment = {
  id: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as `0x${string}`,
  title: 'The Avian Oracle',
  chapterNumber: 2,
  totalChapters: 5,
  priceUsdc: 0.10,
  previewText: `"By the time Sofía Santos reached fifty-three, she had learned that trouble seldom burst through the door. It crept in with the hush of early light, disguised as something ordinary. On that October morning, it took the shape of a solitary Trocaz pigeon at her window..."`,
  authorEns: 'simonvictor.eth',
  campaignId: 'campaign-42',
}

// ─── APP ─────────────────────────────────────────────────
function AppInner() {
  // In production: derive mode from URL params
  // e.g. ?mode=paywall&fragment=0x123  → show paywall
  //      ?mode=onboarding              → show author flow
  const params    = new URLSearchParams(window.location.search)
  const urlMode   = params.get('mode') ?? 'demo'

  const [mode, setMode]             = useState<'demo' | 'onboarding' | 'paywall' | 'unlocked'>(
    urlMode as 'demo' | 'onboarding' | 'paywall'
  )
  const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null)

  const handleAuthorComplete = (profile: AuthorProfile) => {
    setAuthorProfile(profile)
    setMode('demo')
    console.log('[KymaCast] Author onboarded:', profile)
  }

  const handleFragmentUnlocked = (fragmentId: string) => {
    console.log('[KymaCast] Fragment unlocked:', fragmentId)
    setMode('unlocked')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#08061A', color: '#F0EEF8' }}>

      {/* ── DEMO HOME ── */}
      {mode === 'demo' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 24, padding: 20 }}>
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, marginBottom: 8 }}>
              KymaCast Onboarding
            </h1>
            <p style={{ color: 'rgba(240,238,248,0.5)', fontSize: 14 }}>
              Choose a flow to demo
            </p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <DemoBtn label="Author Onboarding" sub="5-step setup flow" onClick={() => setMode('onboarding')} />
            <DemoBtn label="Reader Paywall"     sub="Instagram → unlock" onClick={() => setMode('paywall')} />
          </div>
          {authorProfile && (
            <div style={{ padding: '12px 16px', background: 'rgba(0,201,167,0.08)', border: '1px solid rgba(0,201,167,0.2)', borderRadius: 10, fontSize: 12, fontFamily: 'monospace', color: '#00C9A7' }}>
              ✓ Onboarded as {authorProfile.penName} · {authorProfile.smartAccountAddress.slice(0, 10)}...
            </div>
          )}
        </div>
      )}

      {/* ── AUTHOR ONBOARDING ── */}
      {mode === 'onboarding' && (
        <AuthorOnboarding onComplete={handleAuthorComplete} />
      )}

      {/* ── READER PAYWALL ── */}
      {mode === 'paywall' && (
        <>
          {/* Simulate an Instagram post behind the paywall */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0a0a' }}>
            <div style={{ width: 320, background: '#111', borderRadius: 12, overflow: 'hidden', border: '1px solid #222' }}>
              <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#6B5CE7,#00C9A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>SV</div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>simonvictor.eth</span>
                <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 600, padding: '2px 6px', background: '#6B5CE7', borderRadius: 4, color: '#fff' }}>KymaCast</span>
              </div>
              <div style={{ height: 320, background: '#08061A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="120" height="80" viewBox="0 0 120 80">
                  <path d="M5 50 Q20 20 35 40 Q50 60 65 30 Q80 5 95 22 Q107 36 115 28" stroke="#6B5CE7" strokeWidth="3" strokeLinecap="round" fill="none"/>
                  <path d="M5 65 Q22 38 40 54 Q58 70 76 44 Q94 18 112 38" stroke="#00C9A7" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity=".5"/>
                </svg>
              </div>
              <div style={{ padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace', marginBottom: 4 }}>FREE · CHAPTER 1 OF 5</div>
                <p style={{ fontSize: 13, color: '#fff', fontStyle: 'italic', lineHeight: 1.5, margin: '0 0 12px' }}>
                  "She knew the war had just arrived at her door."
                </p>
                <button
                  style={{ width: '100%', padding: '10px', background: '#6B5CE7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                  onClick={() => {}}
                >
                  🔒 Unlock Chapter 2 — 0.10 USDC
                </button>
              </div>
            </div>
          </div>

          <PaywallModal
            fragment={DEMO_FRAGMENT}
            onUnlocked={handleFragmentUnlocked}
            onClose={() => setMode('demo')}
          />
        </>
      )}

      {/* ── UNLOCKED ── */}
      {mode === 'unlocked' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 20, padding: 24 }}>
          <div style={{ fontSize: 48 }}>📖</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, textAlign: 'center' }}>Chapter 2 — Unlocked</h1>
          <div style={{ maxWidth: 480, background: 'rgba(107,92,231,0.08)', border: '1px solid rgba(107,92,231,0.25)', borderRadius: 12, padding: '20px 24px' }}>
            <p style={{ fontSize: 14, color: 'rgba(240,238,248,0.8)', lineHeight: 1.75, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>
              "Her hands trembled. Not from arthritis — she knew the difference. One was the body growing old. The other was the world speaking directly to her soul.
              She studied the pigeon with the same careful attention she applied to her needlework. The creature's head tilted three times, precisely, as though counting. It faced east, then west, then east again..."
            </p>
          </div>
          <button style={{ padding: '10px 24px', background: '#6B5CE7', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }} onClick={() => setMode('demo')}>
            ← Back to demo
          </button>
        </div>
      )}

      {/* Global keyframe CSS */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
        * { box-sizing: border-box; }
        input, textarea, button { font-family: inherit; }
        input:focus, textarea:focus { outline: none; border-color: rgba(107,92,231,0.6) !important; box-shadow: 0 0 0 3px rgba(107,92,231,0.1); }
      `}</style>
    </div>
  )
}

function DemoBtn({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ padding: '16px 24px', background: 'rgba(107,92,231,0.1)', border: '1px solid rgba(107,92,231,0.3)', borderRadius: 12, cursor: 'pointer', textAlign: 'center', color: '#F0EEF8' }}
    >
      <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 11, color: 'rgba(240,238,248,0.45)' }}>{sub}</div>
    </button>
  )
}

// ─── ROOT WITH PROVIDERS ──────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <PrivyProvider appId={PRIVY_APP_ID} config={PRIVY_CONFIG}>
        <AppInner />
      </PrivyProvider>
    </QueryClientProvider>
  )
}
