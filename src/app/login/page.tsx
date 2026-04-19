'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { MateLogo } from '@/components/icons'

const FS = { fontFeatureSettings: "'ss11' 1, 'calt' 0, 'liga' 0" }
const SHADOW_XS = { boxShadow: '0px 1px 2px 0px rgba(10,13,20,0.03)' }

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 15.6798 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M7.99988 6.54543V9.64362H12.3053C12.1163 10.64 11.5489 11.4836 10.698 12.0509L13.2944 14.0655C14.8071 12.6692 15.6798 10.6182 15.6798 8.18187C15.6798 7.61461 15.6289 7.06911 15.5344 6.54552L7.99988 6.54543Z" fill="#4285F4"/>
      <path d="M3.51645 9.52268L2.93088 9.97093L0.858114 11.5854C2.17447 14.1963 4.87246 16 7.9997 16C10.1596 16 11.9705 15.2873 13.2942 14.0655L10.6979 12.0509C9.98512 12.5309 9.07602 12.8219 7.9997 12.8219C5.91972 12.8219 4.15249 11.4182 3.51972 9.5273L3.51645 9.52268Z" fill="#34A853"/>
      <path d="M0.858119 4.41455C0.312695 5.49086 0 6.70543 0 7.99995C0 9.29447 0.312695 10.509 0.858119 11.5854C0.858119 11.5926 3.51998 9.5199 3.51998 9.5199C3.35998 9.03991 3.26541 8.53085 3.26541 7.99987C3.26541 7.46889 3.35998 6.95983 3.51998 6.47983L0.858119 4.41455Z" fill="#FBBC05"/>
      <path d="M7.99987 3.18545C9.17807 3.18545 10.2253 3.59271 11.0617 4.37818L13.3526 2.0873C11.9635 0.792777 10.1599 0 7.99987 0C4.87262 0 2.17447 1.79636 0.858114 4.41455L3.5199 6.48001C4.15259 4.58908 5.91988 3.18545 7.99987 3.18545Z" fill="#EA4335"/>
    </svg>
  )
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleGoogleSignIn() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('sending')
    setErrorMsg('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setErrorMsg(error.message)
      setStatus('error')
    } else {
      setStatus('sent')
    }
  }

  if (status === 'sent') {
    return (
      <main className="min-h-screen bg-bg-weak flex items-center justify-center">
        <div className="flex flex-col items-center gap-[16px]">
          <MateLogo />
          <div className="flex flex-col items-center gap-[4px] text-center">
            <p className="text-[16px] leading-[24px] tracking-[-0.176px] font-normal text-text-sub" style={FS}>
              Check your email for a magic link
            </p>
            <p className="text-[14px] leading-[20px] tracking-[-0.084px] font-normal text-text-soft" style={FS}>
              You can close this tab
            </p>
          </div>
          <button
            onClick={() => setStatus('idle')}
            className="h-[28px] flex items-center justify-center px-[6px] py-[4px] bg-bg-weak rounded-8 text-[14px] leading-[20px] tracking-[-0.084px] font-medium text-text-sub transition-colors hover:bg-bg-soft"
            style={FS}
          >
            Back
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-bg-weak flex items-center justify-center">
      <div className="flex flex-col items-center gap-[16px]">
        <MateLogo />
        <p className="text-[14px] leading-[20px] tracking-[-0.084px] font-normal text-text-sub text-center w-[189px]" style={FS}>
          Log in to your library
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-[12px] w-[256px]">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter your email address..."
            required
            autoFocus
            className="w-full bg-bg-white border border-stroke-soft rounded-10 pl-[12px] pr-[10px] py-[10px] text-[14px] leading-[20px] tracking-[-0.084px] font-normal text-text-strong placeholder:text-text-soft outline-none"
            style={{ ...SHADOW_XS, ...FS }}
          />
          <button
            type="submit"
            disabled={status === 'sending'}
            className="w-full flex items-center justify-center p-[10px] rounded-10 text-[14px] leading-[20px] tracking-[-0.084px] font-medium text-white disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: '#262626', ...FS }}
          >
            {status === 'sending' ? 'Sending…' : 'Continue'}
          </button>
          {status === 'error' && (
            <p className="text-[12px] leading-[16px] text-error-base" style={FS}>
              {errorMsg || 'Something went wrong.'}
            </p>
          )}
        </form>
        <p className="text-[14px] leading-[20px] tracking-[-0.084px] font-medium text-text-soft" style={FS}>
          or continue with
        </p>
        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="w-[256px] flex items-center justify-center gap-[8px] bg-bg-white border border-stroke-soft rounded-10 pl-[10px] pr-[12px] py-[10px] text-[14px] leading-[20px] tracking-[-0.084px] font-medium text-text-strong transition-opacity hover:opacity-80"
          style={{ ...SHADOW_XS, ...FS }}
        >
          <GoogleIcon />
          Continue with Google
        </button>
      </div>
    </main>
  )
}
