'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Bookmark = {
  id: string
  url: string
  created_at: string
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBookmarks()
  }, [])

  async function fetchBookmarks() {
    const { data } = await supabase
      .from('bookmarks')
      .select('id, url, created_at')
      .order('created_at', { ascending: false })
    setBookmarks(data ?? [])
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return

    setStatus('saving')
    setErrorMsg('')

    // TODO: replace null with (await supabase.auth.getUser()).data.user?.id when auth is added
    const { error } = await supabase.from('bookmarks').insert({ url: url.trim(), user_id: null })

    if (error) {
      setErrorMsg(error.message)
      setStatus('error')
    } else {
      setStatus('saved')
      setUrl('')
      setTimeout(() => setStatus('idle'), 3000)
      fetchBookmarks()
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-16">
      <div className="w-full max-w-md mx-auto">
        <h1 className="text-2xl font-semibold text-gray-900 mb-1">Mate</h1>
        <p className="text-gray-400 text-sm mb-8">Save anything worth your time.</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="Paste a URL…"
            required
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition"
          />
          <button
            type="submit"
            disabled={status === 'saving'}
            className="w-full bg-gray-900 text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {status === 'saving' ? 'Saving…' : 'Save'}
          </button>
        </form>

        {status === 'saved' && (
          <p className="mt-4 text-sm text-green-600">Saved!</p>
        )}
        {status === 'error' && (
          <p className="mt-4 text-sm text-red-500">{errorMsg || 'Something went wrong.'}</p>
        )}

        <div className="mt-12">
          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : bookmarks.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing saved yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {bookmarks.map(b => (
                <li key={b.id} className="border border-gray-100 rounded-lg px-4 py-3">
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-gray-900 font-medium hover:underline break-all"
                  >
                    {b.url}
                  </a>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(b.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  )
}
