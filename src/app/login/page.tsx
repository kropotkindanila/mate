'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return

    setStatus('sending')
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setErrorMsg(error.message)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-16">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Mate</h1>
        <p className="text-gray-400 text-sm mb-8">Sign in to your library.</p>

        {status === 'sent' ? (
          <div className="text-sm text-gray-600">
            <p>Check your email for a magic link.</p>
            <p className="text-gray-400 mt-2">You can close this tab.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
            />
            <button
              type="submit"
              disabled={status === 'sending'}
              className="w-full bg-gray-900 text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
            {status === 'error' && (
              <p className="text-sm text-red-500">{errorMsg || 'Something went wrong.'}</p>
            )}
          </form>
        )}
      </div>
    </main>
  )
}
