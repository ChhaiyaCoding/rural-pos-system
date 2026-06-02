'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ShoppingBag, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
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

      const uid = data.user?.id as UserId | undefined
      if (!uid) { setError('មានបញ្ហា — សូម ព្យាយាម ម្ដងទៀត'); return }

      // Fetch tenant from profile table
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', uid)
        .single()

      const tenantId = (profile?.tenant_id ?? DEMO_TENANT_ID) as TenantId
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
    <div className="min-h-dvh bg-gradient-to-b from-primary-700 to-primary-500 flex flex-col items-center justify-center px-5 py-8">

      {/* App logo / header */}
      <div className="text-center mb-8 space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto shadow-lg">
          <ShoppingBag size={32} className="text-white" strokeWidth={2} />
        </div>
        <h1 className="text-[26px] font-extrabold text-white tracking-tight">
          POS ហាង
        </h1>
        <p className="text-[13px] text-primary-200">
          ប្រព័ន្ធគ្រប់គ្រងការលក់ · Offline-first
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Card header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <h2 className="text-[18px] font-bold text-slate-900">ចូលប្រើ</h2>
          <p className="text-[12px] text-slate-400 mt-0.5">
            ចូលដើម្បី ចាប់ផ្ដើម គ្រប់គ្រង ហាង
          </p>
        </div>

        <form onSubmit={handleLogin} className="px-6 py-5 space-y-4">

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2.5 bg-danger-50 border border-danger-100 rounded-xl px-4 py-3">
              <span className="text-danger-500 text-[16px] mt-0.5 shrink-0">⚠️</span>
              <p className="text-[13px] font-medium text-danger-700 leading-snug">{error}</p>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-slate-700">
              អ៊ីមែល
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              autoCapitalize="none"
              autoComplete="email"
              required={hasSupabase}
              disabled={loading || demoLoading}
              className="w-full h-12 px-4 border border-slate-200 rounded-xl text-[15px] text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:bg-slate-50 disabled:text-slate-400 transition-colors"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-slate-700">
              លេខសម្ងាត់
            </label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required={hasSupabase}
                disabled={loading || demoLoading}
                className="w-full h-12 pl-4 pr-12 border border-slate-200 rounded-xl text-[15px] text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 disabled:bg-slate-50 disabled:text-slate-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPw(v => !v)}
                className="min-h-0 min-w-0 absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 active:text-slate-600"
                tabIndex={-1}
              >
                {showPw
                  ? <EyeOff size={17} strokeWidth={2} />
                  : <Eye    size={17} strokeWidth={2} />
                }
              </button>
            </div>
          </div>

          {/* Login button — only show if Supabase configured */}
          {hasSupabase && (
            <button
              type="submit"
              disabled={loading || demoLoading || !email.trim() || !password}
              className="w-full h-12 bg-primary-600 text-white font-bold text-[15px] rounded-xl active:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'កំពុងចូល…' : 'ចូលប្រើ'}
            </button>
          )}
        </form>

        {/* Demo mode separator + button */}
        <div className="px-6 pb-6 space-y-4">
          {hasSupabase && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-[11px] text-slate-300 font-medium">ឬ</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
          )}

          <button
            type="button"
            onClick={handleDemo}
            disabled={loading || demoLoading}
            className="w-full h-12 bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-[14px] rounded-xl active:bg-slate-100 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            {demoLoading && <Loader2 size={17} className="animate-spin text-slate-400" />}
            {demoLoading ? 'កំពុងចូល Demo…' : '🏪 ចូល Demo Mode'}
          </button>

          {!hasSupabase && (
            <p className="text-center text-[11px] text-slate-300 leading-relaxed">
              Supabase មិន​ទាន់ configure — ប្រើ Demo Mode ចំពោះ​ការ test
            </p>
          )}
        </div>

      </div>

      {/* Footer */}
      <p className="mt-8 text-[11px] text-primary-300 text-center">
        Rural POS · Offline-first · Made for Cambodia 🇰🇭
      </p>
    </div>
  )
}
