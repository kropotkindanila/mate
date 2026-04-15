'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

type Bookmark = {
  id: string
  url: string
  created_at: string
  folder_id: string | null
}

type Folder = {
  id: string
  name: string
}

export default function Home() {
  const router = useRouter()
  const [url, setUrl] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [selectedFolder, setSelectedFolder] = useState<'inbox' | string>('inbox')
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null)
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameFolderName, setRenameFolderName] = useState('')

  const supabase = createClient()

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      setUserId(user.id)
      await Promise.all([fetchBookmarks(), fetchFolders()])
    }
    init()
  }, [])

  useEffect(() => {
    if (!folderMenuOpen) return
    function close() { setFolderMenuOpen(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [folderMenuOpen])

  async function fetchBookmarks() {
    const { data } = await supabase
      .from('bookmarks')
      .select('id, url, created_at, folder_id')
      .order('created_at', { ascending: false })
    setBookmarks(data ?? [])
    setLoading(false)
  }

  async function fetchFolders() {
    const { data } = await supabase
      .from('folders')
      .select('id, name')
      .order('name')
    setFolders(data ?? [])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim() || !userId) return

    setStatus('saving')
    setErrorMsg('')

    const trimmed = url.trim()
    const normalizedUrl =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`

    const folderId = (selectedFolder === 'inbox' || selectedFolder === 'all') ? null : selectedFolder

    const { error } = await supabase
      .from('bookmarks')
      .insert({ url: normalizedUrl, user_id: userId, folder_id: folderId })

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

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!newFolderName.trim() || !userId) return
    setCreatingFolder(true)
    const { error } = await supabase
      .from('folders')
      .insert({ name: newFolderName.trim(), user_id: userId })
    if (!error) {
      setNewFolderName('')
      setShowNewFolder(false)
      fetchFolders()
    }
    setCreatingFolder(false)
  }

  async function moveBookmark(bookmarkId: string, folderId: string | null) {
    await supabase
      .from('bookmarks')
      .update({ folder_id: folderId })
      .eq('id', bookmarkId)
    fetchBookmarks()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  async function handleRenameFolder(folderId: string) {
    if (!renameFolderName.trim()) return
    await supabase
      .from('folders')
      .update({ name: renameFolderName.trim() })
      .eq('id', folderId)
    setRenamingFolderId(null)
    setRenameFolderName('')
    fetchFolders()
  }

  async function handleDeleteFolder(folderId: string) {
    await supabase
      .from('folders')
      .delete()
      .eq('id', folderId)
    if (selectedFolder === folderId) setSelectedFolder('inbox')
    fetchFolders()
    fetchBookmarks()
  }

  const visibleBookmarks = bookmarks.filter(b => {
    if (selectedFolder === 'all') return true
    if (selectedFolder === 'inbox') return b.folder_id === null
    return b.folder_id === selectedFolder
  })

  const selectedFolderName =
    selectedFolder === 'all'
      ? 'All'
      : selectedFolder === 'inbox'
      ? 'Inbox'
      : folders.find(f => f.id === selectedFolder)?.name ?? 'Folder'

  return (
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <aside className="w-52 shrink-0 border-r border-gray-100 flex flex-col py-8 px-4">
        <div className="flex items-baseline justify-between mb-6">
          <h1 className="text-base font-semibold text-gray-900">Mate</h1>
          <button
            onClick={handleLogout}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Sign out
          </button>
        </div>

        <nav className="flex flex-col gap-0.5">
          <button
            onClick={() => setSelectedFolder('all')}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedFolder === 'all'
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            All
          </button>

          <button
            onClick={() => setSelectedFolder('inbox')}
            className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              selectedFolder === 'inbox'
                ? 'bg-gray-100 text-gray-900 font-medium'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            Inbox
          </button>

          {folders.map(folder => (
            <div key={folder.id} className="relative group">
              {renamingFolderId === folder.id ? (
                <form
                  onSubmit={e => { e.preventDefault(); handleRenameFolder(folder.id) }}
                  className="flex items-center gap-1 px-2 py-1"
                >
                  <input
                    autoFocus
                    value={renameFolderName}
                    onChange={e => setRenameFolderName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Escape') { setRenamingFolderId(null); setRenameFolderName('') } }}
                    className="flex-1 min-w-0 border border-gray-200 rounded px-2 py-1 text-sm text-gray-900 outline-none focus:ring-1 focus:ring-gray-900"
                  />
                  <button type="submit" className="text-xs text-gray-500 hover:text-gray-900">✓</button>
                  <button
                    type="button"
                    onClick={() => { setRenamingFolderId(null); setRenameFolderName('') }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >✕</button>
                </form>
              ) : (
                <>
                  <button
                    onClick={() => setSelectedFolder(folder.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedFolder === folder.id
                        ? 'bg-gray-100 text-gray-900 font-medium'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {folder.name}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id) }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-gray-600 transition-all text-xs leading-none"
                  >
                    •••
                  </button>
                  {folderMenuOpen === folder.id && (
                    <div className="absolute right-0 top-full mt-0.5 bg-white border border-gray-100 rounded-lg shadow-md z-10 py-1 min-w-[96px]">
                      <button
                        onClick={() => { setRenamingFolderId(folder.id); setRenameFolderName(folder.name); setFolderMenuOpen(null) }}
                        className="w-full text-left px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => { handleDeleteFolder(folder.id); setFolderMenuOpen(null) }}
                        className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-gray-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </nav>

        <div className="mt-4">
          {showNewFolder ? (
            <form onSubmit={handleCreateFolder} className="flex flex-col gap-2">
              <input
                autoFocus
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full border border-gray-200 rounded-md px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-1 focus:ring-gray-900 focus:border-transparent"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={creatingFolder}
                  className="flex-1 bg-gray-900 text-white rounded-md px-2 py-1.5 text-xs font-medium hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
                  className="flex-1 border border-gray-200 text-gray-500 rounded-md px-2 py-1.5 text-xs hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowNewFolder(true)}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              + New folder
            </button>
          )}
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 px-10 py-8">
        <div className="max-w-xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">{selectedFolderName}</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3 mb-10">
            <input
              type="text"
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
            <p className="mb-4 text-sm text-green-600">Saved!</p>
          )}
          {status === 'error' && (
            <p className="mb-4 text-sm text-red-500">{errorMsg || 'Something went wrong.'}</p>
          )}

          {loading ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : visibleBookmarks.length === 0 ? (
            <p className="text-sm text-gray-400">Nothing here yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {visibleBookmarks.map(b => (
                <li key={b.id} className="border border-gray-100 rounded-lg px-4 py-3">
                  <div className="flex items-start justify-between gap-4">
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-gray-900 font-medium hover:underline break-all"
                    >
                      {b.url}
                    </a>
                    <select
                      value={b.folder_id ?? ''}
                      onChange={e => moveBookmark(b.id, e.target.value || null)}
                      className="shrink-0 text-xs text-gray-400 border border-gray-100 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-gray-300 bg-white cursor-pointer"
                    >
                      <option value="">Inbox</option>
                      {folders.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>
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
      </main>
    </div>
  )
}
