'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ShoppingBag, Loader2, Store } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuthStore } from '@/store/auth.store'
import type { UserId, TenantId } from '@/types/branded'

/* ── Khmer error messages ──────────────────────────────────────── */
function toKhmerError(msg: string): string {
  const m = msg.toLowerCase()
  if (m.includes('invalid login') || m.includes('invalid credentials'))
    return 'អ៊ីមែល ឬ លេខសម្ងាត់ មិនត្រឹមត្រូវ'
  if (m.includes('email not confirmed'))
    return 'សូម confirm អ៊ីមែលរបស់អ្នក ជាមុន'
  if (m.includes('too many requests'))
    return 'ព្យាយាម ច្រើនដង — សូម រង់ចាំ ១ ភាគ'
  if (m.includes('user not found') || m.includes('no user'))
    return 'គ្មានគណនី ជាមួយ អ៊ីមែល នេះ'
  if (m.includes('network') || m.includes('fetch'))
    return 'គ្មានអ៊ីនធឺណិត — សូម ពិនិត្យ connection'
  return 'មានបញ្ហា — សូម ព្យាយាម ម្ដងទៀត'
}

/* ── Demo mode ─────────────────────────────────────────────────── */
const DEMO_USER_ID    = 'demo-user'    as UserId
const DEMO_TENANT_ID  = 'tenant-demo'  as TenantId

export default function LoginPage() {
  const router   = useRouter()
  const setAuth  = useAuthStore((s) => s.setAuth)

  const [email,       setEmail]       = useState('')
  const [password,    setPassword]    = useState('')
  const [showPw,      setShowPw]      = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  const hasSupabase =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  /* ── Login with Supabase ─────────────────────────────────────── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (authError) { setError(toKhmerError(authError.message)); return }

      const uid = data.user?.id ? (data.user.id as UserId) : undefined
      if (!uid) { setError('មានបញ្ហា — សូម ព្យាយាម ម្ដងទៀត'); return }

      // Fetch tenant from profile table (cast uid to string — Supabase eq doesn't accept branded types)
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', uid as string)
        .single()

      const tenantId = ((profile as { tenant_id?: string } | null)?.tenant_id ?? DEMO_TENANT_ID) as TenantId
      setAuth(uid, tenantId)
      router.replace('/')
    } catch {
      setError('មានបញ្ហា — សូម ព្យាយាម ម្ដងទៀត')
    } finally {
      setLoading(false)
    }
  }

  /* ── Demo mode bypass ────────────────────────────────────────── */
  const handleDemo = async () => {
    setDemoLoading(true)
    await new Promise(r => setTimeout(r, 600))
    // Set a session cookie so middleware lets demo users through
    document.cookie = 'pos-demo-session=1; path=/; max-age=86400; SameSite=Lax'
    setAuth(DEMO_USER_ID, DEMO_TENANT_ID)
    router.replace('/')
  }

  /* ──────────────────────────────────────────────────────────── */

  return (
    <div className="flex min-h-dvh flex-col bg-ink-900 md:items-center md:justify-center md:p-8">

      {/* Brand */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8 pt-[max(48px,env(safe-area-inset-top))] text-center md:flex-none md:pt-0">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-accent text-ink-900" aria-hidden="true">
          <ShoppingBag size={32} strokeWidth={2} />
        </div>
        <h1 className="mt-4 text-title-lg font-bold text-white">POS ហាង</h1>
        <p className="mt-1 text-body-sm text-ink-300">ប្រព័ន្ធគ្រប់គ្រងការលក់ · Offline-first</p>
      </div>

      {/* Panel */}
      <div className="w-full rounded-t-2xl bg-surface px-6 pt-7 pb-[max(24px,env(safe-area-inset-bottom))] md:max-w-md md:rounded-2xl md:pb-7">
        <h2 className="text-title-sm font-bold text-text">ចូលប្រើ</h2>
        <p className="mt-0.5 text-meta text-text-muted">ចូលដើម្បី ចាប់ផ្ដើម គ្រប់គ្រង ហាង</p>

        <form onSubmit={handleLogin} className="mt-5 space-y-3">

          {/* Error message */}
          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-md bg-danger-bg px-4 py-3">
              <span className="mt-0.5 shrink-0 text-body" aria-hidden="true">⚠️</span>
              <p className="text-body-sm font-semibold text-danger">{error}</p>
            </div>
          )}

          <Input
            label="អ៊ីមែល"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            autoCapitalize="none"
            autoComplete="email"
            required={hasSupabase}
            disabled={loading || demoLoading}
          />

          <Input
            label="លេខសម្ងាត់"
            type={showPw ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required={hasSupabase}
            disabled={loading || demoLoading}
            trailing={
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'លាក់លេខសម្ងាត់' : 'បង្ហាញលេខសម្ងាត់'}
                className="-mr-3 flex h-12 w-12 items-center justify-center rounded-md text-text-muted active:text-text"
                tabIndex={-1}
              >
                {showPw
                  ? <EyeOff size={20} strokeWidth={2} aria-hidden="true" />
                  : <Eye    size={20} strokeWidth={2} aria-hidden="true" />
                }
              </button>
            }
          />

          {/* Login button — only show if Supabase configured */}
          {hasSupabase && (
            <Button
              type="submit"
              variant="dark"
              size="lg"
              fullWidth
              disabled={loading || demoLoading || !email.trim() || !password}
              icon={loading ? <Loader2 size={18} className="animate-spin" /> : undefined}
            >
              {loading ? 'កំពុងចូល…' : 'ចូលប្រើ'}
            </Button>
          )}
        </form>

        {/* Demo mode separator + button */}
        <div className="mt-4 space-y-4">
          {hasSupabase && (
            <div className="flex items-center gap-3" aria-hidden="true">
              <div className="h-px flex-1 bg-line" />
              <span className="text-meta font-semibold text-text-muted">ឬ</span>
              <div className="h-px flex-1 bg-line" />
            </div>
          )}

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleDemo}
            disabled={loading || demoLoading}
            icon={demoLoading ? <Loader2 size={18} className="animate-spin" /> : <Store size={18} strokeWidth={2.25} />}
          >
            {demoLoading ? 'កំពុងចូល Demo…' : 'សាកប្រើ Demo Mode'}
          </Button>

          {!hasSupabase && (
            <p className="text-center text-meta text-text-muted">
              Supabase មិន​ទាន់ configure — ប្រើ Demo Mode ចំពោះ​ការ test
            </p>
          )}
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-caption text-text-muted">
          Rural POS · Offline-first · Made for Cambodia 🇰🇭
        </p>
      </div>
    </div>
  )
}
