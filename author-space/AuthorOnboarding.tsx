// src/components/AuthorOnboarding.tsx
// 5-step author onboarding: connect wallet → profile → upload → rights → ENS identity

import React, { useState, useRef } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'
import { useSmartAccount } from '@/hooks/useSmartAccount'
import type { AuthorProfile } from '@/types'

type Step = 1 | 2 | 3 | 4 | 5

type ProfileForm = {
  penName: string
  genre: string[]
  audience: string
  forbiddenTopics: string[]
  pricePerFragment: number
  agentInstructions: string
  autoApprove: boolean
  analyticsEnabled: boolean
}

type UploadState = 'idle' | 'encrypting' | 'uploading' | 'done' | 'error'

type Props = {
  onComplete: (profile: AuthorProfile) => void
}

const GENRES  = ['Magical Realism','Historical Fiction','Thriller','Romance','Sci-Fi','Fantasy','Literary Fiction','Non-Fiction','Horror','Mystery']
const PRICES  = [0.05, 0.10, 0.25]
const PRICE_LABELS = ['Micro — max reach', 'Standard — recommended', 'Premium — max margin']

export function AuthorOnboarding({ onComplete }: Props) {
  const [step, setStep]           = useState<Step>(1)
  const [connectLoading, setConnectLoading] = useState(false)
  const [uploadState, setUploadState]       = useState<UploadState>('idle')
  const [uploadedCid, setUploadedCid]       = useState<string | null>(null)
  const [signingPolicy, setSigningPolicy]   = useState(false)
  const [policySigned, setPolicySigned]     = useState(false)
  const [tagInput, setTagInput]             = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<ProfileForm>({
    penName: '',
    genre: [],
    audience: '',
    forbiddenTopics: [],
    pricePerFragment: 0.10,
    agentInstructions: '',
    autoApprove: false,
    analyticsEnabled: true,
  })

  const { login, authenticated, user } = usePrivy()
  const { wallets }                     = useWallets()
  const { smartAddress, isLoading: walletLoading } = useSmartAccount()

  const embeddedWallet = wallets.find(w => w.walletClientType === 'privy')
  const displayAddress = smartAddress ?? embeddedWallet?.address
  const shortAddress   = displayAddress
    ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}`
    : null

  // ── STEP HANDLERS ─────────────────────────────────────
  const handleConnect = async () => {
    setConnectLoading(true)
    try { await login() }
    finally { setConnectLoading(false) }
  }

  const handleUpload = async (file: File) => {
    setUploadState('encrypting')
    try {
      // Simulate client-side encryption (1.5s)
      await delay(1500)
      setUploadState('uploading')
      // Simulate 0G Storage upload (1.5s)
      await delay(1500)
      // In production: encrypt with Web Crypto API, then POST to 0G Storage
      const fakeCid = 'Qm' + Math.random().toString(36).slice(2, 14) + '...' + Math.random().toString(36).slice(2, 6)
      setUploadedCid(fakeCid)
      setUploadState('done')
    } catch {
      setUploadState('error')
    }
  }

  const handleSignPolicy = async () => {
    if (!embeddedWallet) return
    setSigningPolicy(true)
    try {
      // Sign the rights policy JSON with the embedded wallet
      const provider = await embeddedWallet.getEthereumProvider()
      const policy   = JSON.stringify({
        priceUsdc:     form.pricePerFragment,
        autoApprove:   form.autoApprove,
        analytics:     form.analyticsEnabled,
        instructions:  form.agentInstructions,
        manuscriptCid: uploadedCid,
        timestamp:     Date.now(),
      })
      await provider.request({
        method: 'personal_sign',
        params: [policy, displayAddress],
      })
      await delay(1000) // simulate on-chain registration
      setPolicySigned(true)
      await delay(500)
      setStep(5)
    } catch (err) {
      console.error('Sign failed', err)
    } finally {
      setSigningPolicy(false)
    }
  }

  const toggleGenre = (g: string) =>
    setForm(f => ({
      ...f,
      genre: f.genre.includes(g) ? f.genre.filter(x => x !== g) : [...f.genre, g],
    }))

  const addTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      setForm(f => ({ ...f, forbiddenTopics: [...f.forbiddenTopics, tagInput.trim()] }))
      setTagInput('')
    }
  }

  const removeTag = (t: string) =>
    setForm(f => ({ ...f, forbiddenTopics: f.forbiddenTopics.filter(x => x !== t) }))

  const handleComplete = () => {
    if (!smartAddress) return
    onComplete({
      address:             (embeddedWallet?.address ?? '0x') as `0x${string}`,
      smartAccountAddress: smartAddress,
      ensName:             `${form.penName.toLowerCase().replace(/\s+/g, '')}.kymacast.eth`,
      penName:             form.penName,
      genre:               form.genre,
      audience:            form.audience,
      pricePerFragment:    form.pricePerFragment,
      autoApprove:         form.autoApprove,
    })
  }

  // ── RENDER ────────────────────────────────────────────
  return (
    <div style={s.page}>
      <div style={s.card}>
        <ProgressDots current={step} total={5} />

        {/* ── STEP 1: CONNECT WALLET ── */}
        {step === 1 && (
          <div style={s.body}>
            <div style={s.eyebrow}>Author Onboarding · Step 1 of 5</div>
            <h1 style={s.title}>Welcome to KymaCast</h1>
            <p style={s.sub}>
              Connect your wallet to start monetizing your manuscript with AI-powered teasers
              and x402 micropayments. No crypto knowledge required.
            </p>

            {!authenticated ? (
              <>
                <button style={s.connectBtn} onClick={handleConnect} disabled={connectLoading}>
                  {connectLoading ? <Spinner /> : '🦊'}
                  {connectLoading ? 'Connecting...' : 'Connect with MetaMask'}
                </button>
                <button style={s.connectBtnSecondary} onClick={login}>
                  Continue with Google or Apple instead
                </button>
              </>
            ) : (
              <>
                <div style={s.walletConnected}>
                  <div style={s.walletAvatar}>
                    {form.penName ? form.penName[0].toUpperCase() : '🦊'}
                  </div>
                  <div>
                    <div style={s.walletConnectedLabel}>✓ Wallet connected</div>
                    <div style={s.walletAddress}>{shortAddress} · Base</div>
                  </div>
                  {walletLoading && <Spinner />}
                </div>
                <button
                  style={{ ...s.primaryBtn, marginTop: 8 }}
                  onClick={() => setStep(2)}
                  disabled={walletLoading}
                >
                  Continue →
                </button>
              </>
            )}

            <p style={s.footnote}>
              A Safe smart account is created automatically · ENS identity included
            </p>
          </div>
        )}

        {/* ── STEP 2: PROFILE ── */}
        {step === 2 && (
          <div style={s.body}>
            <div style={s.eyebrow}>Step 2 of 5 · Author Profile</div>
            <h1 style={s.title}>Tell us about you</h1>

            <Field label="Pen name">
              <input
                style={s.input}
                placeholder="e.g. Simon Victor"
                value={form.penName}
                onChange={e => setForm(f => ({ ...f, penName: e.target.value }))}
              />
            </Field>

            <div>
              <div style={s.fieldLabel}>Genre</div>
              <div style={s.chipGrid}>
                {GENRES.map(g => (
                  <button
                    key={g}
                    style={{ ...s.chip, ...(form.genre.includes(g) ? s.chipActive : {}) }}
                    onClick={() => toggleGenre(g)}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <Field label="Target audience">
              <input
                style={s.input}
                placeholder="e.g. Literary adults 25-45"
                value={form.audience}
                onChange={e => setForm(f => ({ ...f, audience: e.target.value }))}
              />
            </Field>

            <div>
              <div style={s.fieldLabel}>Forbidden topics (press Enter to add)</div>
              <input
                style={s.input}
                placeholder="e.g. spoilers, graphic violence..."
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={addTag}
              />
              {form.forbiddenTopics.length > 0 && (
                <div style={s.tagRow}>
                  {form.forbiddenTopics.map(t => (
                    <span key={t} style={s.tag}>
                      {t}
                      <button style={s.tagRemove} onClick={() => removeTag(t)}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              style={s.primaryBtn}
              onClick={() => setStep(3)}
              disabled={!form.penName || form.genre.length === 0}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 3: UPLOAD ── */}
        {step === 3 && (
          <div style={s.body}>
            <div style={s.eyebrow}>Step 3 of 5 · Upload Manuscript</div>
            <h1 style={s.title}>Upload your manuscript</h1>
            <p style={s.sub}>Encrypted on your device before upload. We never see your raw content.</p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.epub,.docx"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) handleUpload(e.target.files[0]) }}
            />

            <div
              style={{
                ...s.uploadZone,
                ...(uploadState === 'encrypting' ? s.uploadZoneAmber : {}),
                ...(uploadState === 'done'       ? s.uploadZoneGreen : {}),
              }}
              onClick={() => uploadState === 'idle' && fileInputRef.current?.click()}
            >
              {uploadState === 'idle'       && <><div style={s.uploadIcon}>📄</div><div style={s.uploadTitle}>Drop your manuscript here</div><div style={s.uploadSub}>PDF, EPUB, DOCX · Encrypted before upload</div></>}
              {uploadState === 'encrypting' && <><Spinner /><div style={s.uploadTitle}>Encrypting locally...</div><div style={s.uploadSub}>AES-256 · Never leaves your device unencrypted</div></>}
              {uploadState === 'uploading'  && <><Spinner /><div style={s.uploadTitle}>Uploading to 0G Storage...</div><div style={s.uploadSub}>Decentralised · Private · Permanent</div></>}
              {uploadState === 'done'       && <><div style={{ fontSize: 28 }}>✓</div><div style={s.uploadTitle}>Uploaded successfully</div><div style={{ ...s.uploadSub, display: 'flex', alignItems: 'center', gap: 6 }}>CID: {uploadedCid}<button style={s.copyBtn} onClick={() => navigator.clipboard.writeText(uploadedCid!)}>Copy</button></div></>}
              {uploadState === 'error'      && <><div style={{ fontSize: 28, color: '#E74C5C' }}>✗</div><div style={s.uploadTitle}>Upload failed</div><div style={s.uploadSub}>Click to retry</div></>}
            </div>

            <button
              style={s.primaryBtn}
              onClick={() => setStep(4)}
              disabled={uploadState !== 'done'}
            >
              Continue →
            </button>
          </div>
        )}

        {/* ── STEP 4: RIGHTS & PRICING ── */}
        {step === 4 && (
          <div style={s.body}>
            <div style={s.eyebrow}>Step 4 of 5 · Rights & Pricing</div>
            <h1 style={s.title}>Set your price</h1>
            <p style={s.sub}>You earn 85% of every unlock. Choose how much readers pay per fragment.</p>

            <div style={s.priceGrid}>
              {PRICES.map((p, i) => (
                <button
                  key={p}
                  style={{ ...s.priceOption, ...(form.pricePerFragment === p ? s.priceOptionActive : {}) }}
                  onClick={() => setForm(f => ({ ...f, pricePerFragment: p }))}
                >
                  <div style={s.priceValue}>${p.toFixed(2)}</div>
                  <div style={s.priceLabel}>{PRICE_LABELS[i]}</div>
                </button>
              ))}
            </div>

            <Toggle
              label="Auto-approve agent proposals"
              sub="Agent publishes highest-scoring teaser automatically"
              value={form.autoApprove}
              onChange={v => setForm(f => ({ ...f, autoApprove: v }))}
            />

            <Toggle
              label="Audience analytics"
              sub="Track unlock funnel and reader ENS addresses"
              value={form.analyticsEnabled}
              onChange={v => setForm(f => ({ ...f, analyticsEnabled: v }))}
            />

            <Field label="Style instructions for agent (optional)">
              <textarea
                style={{ ...s.input, minHeight: 72, resize: 'vertical' }}
                placeholder="e.g. Focus on atmosphere. Avoid spoilers. Use literary tone."
                value={form.agentInstructions}
                onChange={e => setForm(f => ({ ...f, agentInstructions: e.target.value }))}
              />
            </Field>

            <button
              style={{ ...s.primaryBtn, background: signingPolicy ? 'rgba(107,92,231,0.5)' : 'linear-gradient(135deg,#6B5CE7,#4A3DB5)' }}
              onClick={handleSignPolicy}
              disabled={signingPolicy || policySigned}
            >
              {signingPolicy ? <><Spinner />Signing with MetaMask...</> : policySigned ? '✓ Policy signed' : '🔏 Sign Rights Policy'}
            </button>
            {policySigned && <div style={s.txBadge}>✓ campaign-42.{form.penName.toLowerCase()}.kymacast.eth registered</div>}
          </div>
        )}

        {/* ── STEP 5: ENS IDENTITY ── */}
        {step === 5 && (
          <div style={s.body}>
            <div style={s.eyebrow}>Step 5 of 5 · Your Identity</div>
            <h1 style={s.title}>Your KymaCast identity</h1>
            <p style={s.sub}>Two ENS names have been created automatically for you and your campaign.</p>

            <EnsRow name={`agent.${form.penName.toLowerCase().replace(/\s+/g,'')}.kymacast.eth`} label="Your AI agent" />
            <EnsRow name={`campaign-42.${form.penName.toLowerCase().replace(/\s+/g,'')}.kymacast.eth`} label="Current campaign" />
            {smartAddress && <EnsRow name={`${smartAddress.slice(0,8)}...${smartAddress.slice(-6)}`} label="Smart account · Base" />}

            <div style={s.readySummary}>
              <div style={s.readyItem}><span style={{ color: '#00C9A7' }}>✓</span> Wallet connected</div>
              <div style={s.readyItem}><span style={{ color: '#00C9A7' }}>✓</span> Manuscript encrypted & stored</div>
              <div style={s.readyItem}><span style={{ color: '#00C9A7' }}>✓</span> Rights policy signed on-chain</div>
              <div style={s.readyItem}><span style={{ color: '#00C9A7' }}>✓</span> AI agent ready to select teasers</div>
            </div>

            <button style={s.primaryBtn} onClick={handleComplete}>
              Launch Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SUB-COMPONENTS ──────────────────────────────────────
function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 5, padding: '20px 24px 0', justifyContent: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          height: 3, borderRadius: 2,
          width: i + 1 === current ? 24 : 10,
          background: i + 1 <= current ? '#6B5CE7' : 'rgba(107,92,231,0.2)',
          transition: 'all 0.3s',
        }} />
      ))}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={s.fieldLabel}>{label}</div>
      {children}
    </div>
  )
}

function Toggle({ label, sub, value, onChange }: { label: string; sub: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={s.toggleRow} onClick={() => onChange(!value)}>
      <div>
        <div style={s.toggleLabel}>{label}</div>
        <div style={s.toggleSub}>{sub}</div>
      </div>
      <div style={{ ...s.toggleTrack, background: value ? '#6B5CE7' : 'rgba(255,255,255,0.15)' }}>
        <div style={{ ...s.toggleThumb, transform: value ? 'translateX(16px)' : 'translateX(0)' }} />
      </div>
    </div>
  )
}

function EnsRow({ name, label }: { name: string; label: string }) {
  return (
    <div style={s.ensRow}>
      <div>
        <div style={s.ensName}>{name}</div>
        <div style={s.ensLabel}>{label}</div>
      </div>
      <button style={s.copyBtn} onClick={() => navigator.clipboard.writeText(name)}>Copy</button>
    </div>
  )
}

function Spinner() {
  return (
    <span style={{
      display: 'inline-block', width: 14, height: 14,
      border: '2px solid rgba(255,255,255,0.3)',
      borderTopColor: '#fff', borderRadius: '50%',
      animation: 'spin 0.8s linear infinite', marginRight: 8,
    }} />
  )
}

// ─── UTILS ───────────────────────────────────────────────
const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

// ─── STYLES ──────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#08061A', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { background: '#0E0C28', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 16, width: '100%', maxWidth: 520, paddingBottom: 28 },
  body: { display: 'flex', flexDirection: 'column', gap: 16, padding: '20px 24px 0' },
  eyebrow: { fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#00C9A7', fontFamily: 'monospace' },
  title: { fontSize: 22, fontWeight: 700, color: '#F0EEF8', margin: 0 },
  sub: { fontSize: 13, color: 'rgba(240,238,248,0.55)', lineHeight: 1.65, margin: 0 },
  connectBtn: { padding: '13px 20px', background: 'linear-gradient(135deg,#F6851B,#E2761B)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 },
  connectBtnSecondary: { padding: '11px', background: 'transparent', border: '1px solid rgba(107,92,231,0.3)', borderRadius: 10, color: '#A89EF5', fontSize: 13, cursor: 'pointer' },
  walletConnected: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: 'rgba(0,201,167,0.08)', border: '1px solid rgba(0,201,167,0.25)', borderRadius: 10 },
  walletAvatar: { width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6B5CE7,#00C9A7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 },
  walletConnectedLabel: { fontSize: 12, fontWeight: 600, color: '#00C9A7' },
  walletAddress: { fontSize: 11, color: 'rgba(240,238,248,0.45)', fontFamily: 'monospace' },
  primaryBtn: { padding: '13px', background: 'linear-gradient(135deg,#6B5CE7,#4A3DB5)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  footnote: { fontSize: 11, color: 'rgba(240,238,248,0.25)', textAlign: 'center' as const, margin: 0, fontFamily: 'monospace' },
  fieldLabel: { fontSize: 10, fontWeight: 600, letterSpacing: 1.5, textTransform: 'uppercase' as const, color: 'rgba(240,238,248,0.4)', marginBottom: 6, fontFamily: 'monospace' },
  input: { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 8, color: '#F0EEF8', fontSize: 13, fontFamily: 'monospace', outline: 'none' },
  chipGrid: { display: 'flex', flexWrap: 'wrap' as const, gap: 6 },
  chip: { padding: '5px 12px', background: 'rgba(107,92,231,0.08)', border: '1px solid rgba(107,92,231,0.2)', borderRadius: 20, color: 'rgba(240,238,248,0.55)', fontSize: 12, cursor: 'pointer' },
  chipActive: { background: 'rgba(107,92,231,0.25)', borderColor: '#6B5CE7', color: '#A89EF5' },
  tagRow: { display: 'flex', flexWrap: 'wrap' as const, gap: 5, marginTop: 8 },
  tag: { display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', background: 'rgba(107,92,231,0.15)', border: '1px solid rgba(107,92,231,0.3)', borderRadius: 12, fontSize: 11, color: '#A89EF5' },
  tagRemove: { background: 'none', border: 'none', color: '#A89EF5', cursor: 'pointer', fontSize: 12, padding: '0 0 0 2px' },
  uploadZone: { border: '1.5px dashed rgba(107,92,231,0.35)', borderRadius: 10, padding: 24, textAlign: 'center' as const, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'rgba(107,92,231,0.03)', transition: 'all 0.3s' },
  uploadZoneAmber: { borderColor: '#F0A500', background: 'rgba(240,165,0,0.05)' },
  uploadZoneGreen: { borderColor: '#00C9A7', background: 'rgba(0,201,167,0.05)', cursor: 'default' },
  uploadIcon: { fontSize: 28 },
  uploadTitle: { fontSize: 13, fontWeight: 600, color: '#F0EEF8' },
  uploadSub: { fontSize: 11, color: 'rgba(240,238,248,0.4)', fontFamily: 'monospace' },
  copyBtn: { padding: '3px 8px', background: 'rgba(107,92,231,0.15)', border: '1px solid rgba(107,92,231,0.3)', borderRadius: 5, color: '#A89EF5', fontSize: 10, cursor: 'pointer', fontFamily: 'monospace' },
  priceGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 },
  priceOption: { padding: '12px 6px', background: 'rgba(107,92,231,0.06)', border: '1px solid rgba(107,92,231,0.15)', borderRadius: 9, cursor: 'pointer', textAlign: 'center' as const },
  priceOptionActive: { background: 'rgba(107,92,231,0.18)', borderColor: '#6B5CE7' },
  priceValue: { fontSize: 18, fontWeight: 700, color: '#F0EEF8' },
  priceLabel: { fontSize: 9, color: 'rgba(240,238,248,0.4)', marginTop: 3, fontFamily: 'monospace' },
  toggleRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(107,92,231,0.1)', borderRadius: 8, cursor: 'pointer' },
  toggleLabel: { fontSize: 13, color: '#F0EEF8' },
  toggleSub: { fontSize: 11, color: 'rgba(240,238,248,0.4)', marginTop: 2 },
  toggleTrack: { width: 36, height: 20, borderRadius: 10, position: 'relative', transition: 'background 0.2s', flexShrink: 0 },
  toggleThumb: { position: 'absolute', width: 14, height: 14, borderRadius: '50%', background: '#fff', top: 3, left: 3, transition: 'transform 0.2s' },
  txBadge: { padding: '8px 12px', background: 'rgba(0,201,167,0.1)', border: '1px solid rgba(0,201,167,0.25)', borderRadius: 7, fontSize: 11, color: '#00C9A7', fontFamily: 'monospace' },
  ensRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(107,92,231,0.12)', borderRadius: 8 },
  ensName: { fontSize: 12, color: '#A89EF5', fontFamily: 'monospace' },
  ensLabel: { fontSize: 10, color: 'rgba(240,238,248,0.35)', marginTop: 2 },
  readySummary: { display: 'flex', flexDirection: 'column', gap: 6, padding: '12px 14px', background: 'rgba(0,201,167,0.06)', border: '1px solid rgba(0,201,167,0.15)', borderRadius: 9 },
  readyItem: { fontSize: 12, color: 'rgba(240,238,248,0.7)', display: 'flex', gap: 8 },
}
