'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import {
  Search,
  Bookmark as BookmarkIcon,
  Unsorted,
  Archive,
  Folder as FolderIcon,
  FolderAdd,
  Plus,
  Settings,
  ChevronOpen,
  ChevronClose,
  MateLogo,
} from '@/components/icons'

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

type View = 'all' | 'unsorted' | 'archive' | string

type Toast = { id: number; message: string; type: 'success' | 'error' }

const LABEL_SM = 'text-[14px] leading-[20px] tracking-[-0.084px] font-medium'
const PARA_XS = 'text-[12px] leading-[16px]'
const SUBHEAD = 'text-[11px] leading-[12px] tracking-[0.22px] font-medium uppercase'

function isValidUrl(text: string) {
  try {
    const url = new URL(text)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function formatHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function faviconUrl(url: string) {
  try {
    const host = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`
  } catch {
    return `https://www.google.com/s2/favicons?domain=${url}&sz=32`
  }
}

function groupBookmarksByDate(bookmarks: Bookmark[]) {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const msDay = 24 * 60 * 60 * 1000

  const groups: Record<string, Bookmark[]> = {}
  const order: string[] = []

  function push(label: string, b: Bookmark) {
    if (!groups[label]) {
      groups[label] = []
      order.push(label)
    }
    groups[label].push(b)
  }

  for (const b of bookmarks) {
    const d = new Date(b.created_at)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const diffDays = Math.floor((startOfDay.getTime() - dayStart.getTime()) / msDay)

    if (diffDays <= 0) push('TODAY', b)
    else if (diffDays === 1) push('YESTERDAY', b)
    else if (diffDays < 7) push('THIS WEEK', b)
    else push(d.toLocaleDateString('en-US', { month: 'long' }).toUpperCase(), b)
  }

  return order.map(label => ({ label, items: groups[label] }))
}

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
  const [folders, setFolders] = useState<Folder[]>([])
  const [view, setView] = useState<View>('all')
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [foldersOpen, setFoldersOpen] = useState(true)

  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  const [showAddUrl, setShowAddUrl] = useState(false)
  const [newUrl, setNewUrl] = useState('')
  const [saving, setSaving] = useState(false)

  const [folderMenuOpen, setFolderMenuOpen] = useState<string | null>(null)
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameFolderName, setRenameFolderName] = useState('')

  const [toasts, setToasts] = useState<Toast[]>([])
  const toastCounter = useRef(0)

  function showToast(message: string, type: 'success' | 'error') {
    const id = ++toastCounter.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

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

  useEffect(() => {
    async function handleKeyDown(e: KeyboardEvent) {
      if (!(e.key === 'v' && (e.metaKey || e.ctrlKey))) return
      const target = e.target as HTMLElement
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      ) return

      try {
        const text = (await navigator.clipboard.readText()).trim()
        if (!isValidUrl(text)) {
          showToast('Not a valid link', 'error')
          return
        }
        if (!userId) return
        const folder_id =
          typeof view === 'string' && view !== 'all' && view !== 'unsorted' && view !== 'archive'
            ? view
            : null
        const { error } = await supabase
          .from('bookmarks')
          .insert({ url: text, user_id: userId, folder_id })
        if (!error) {
          fetchBookmarks()
          showToast('Saved!', 'success')
        }
      } catch {
        // clipboard access denied or unavailable
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [userId, view])

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

  async function handleSaveUrl(e: React.FormEvent) {
    e.preventDefault()
    if (!newUrl.trim() || !userId) return
    setSaving(true)
    const trimmed = newUrl.trim()
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const folder_id = typeof view === 'string' && view !== 'all' && view !== 'unsorted' && view !== 'archive'
      ? view
      : null
    const { error } = await supabase
      .from('bookmarks')
      .insert({ url: normalized, user_id: userId, folder_id })
    setSaving(false)
    if (!error) {
      setNewUrl('')
      setShowAddUrl(false)
      fetchBookmarks()
    }
  }

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!newFolderName.trim() || !userId) return
    const { error } = await supabase
      .from('folders')
      .insert({ name: newFolderName.trim(), user_id: userId })
    if (!error) {
      setNewFolderName('')
      setShowNewFolder(false)
      fetchFolders()
    }
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
    await supabase.from('folders').delete().eq('id', folderId)
    if (view === folderId) setView('all')
    fetchFolders()
    fetchBookmarks()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const visibleBookmarks = useMemo(() => bookmarks.filter(b => {
    if (view === 'all') return true
    if (view === 'unsorted') return b.folder_id === null
    if (view === 'archive') return false
    return b.folder_id === view
  }), [bookmarks, view])

  const grouped = useMemo(() => groupBookmarksByDate(visibleBookmarks), [visibleBookmarks])

  const unsortedCount = bookmarks.filter(b => b.folder_id === null).length
  const allCount = bookmarks.length

  const currentViewLabel =
    view === 'all' ? 'All bookmarks'
    : view === 'unsorted' ? 'Unsorted'
    : view === 'archive' ? 'Archive'
    : folders.find(f => f.id === view)?.name ?? 'Folder'

  const CurrentIcon =
    view === 'all' ? BookmarkIcon
    : view === 'unsorted' ? Unsorted
    : view === 'archive' ? Archive
    : FolderIcon

  return (
    <>
    <div className="min-h-screen bg-bg-weak flex justify-center p-[16px]">
      <div className="w-full max-w-[700px] flex gap-[15px] h-[calc(100vh-32px)]">

        {/* Sidebar */}
        <aside className="w-[193px] shrink-0 flex flex-col gap-[8px] py-[8px] overflow-y-auto">

          {/* Logo */}
          <div className="h-[36px] flex items-center px-[10px] shrink-0">
            <MateLogo />
          </div>

          {/* Main nav */}
          <nav className="flex flex-col shrink-0">
            <SidebarItem
              icon={<Search />}
              label="Search"
              active={false}
              onClick={() => { /* search placeholder */ }}
              right={<Shortcut>⌘F</Shortcut>}
            />
            <SidebarItem
              icon={<BookmarkIcon />}
              label="All bookmarks"
              active={view === 'all'}
              onClick={() => setView('all')}
              right={<Count>{allCount}</Count>}
            />
            <SidebarItem
              icon={<Unsorted />}
              label="Unsorted"
              active={view === 'unsorted'}
              onClick={() => setView('unsorted')}
              right={unsortedCount > 0 ? <Count>{unsortedCount}</Count> : null}
            />
            <SidebarItem
              icon={<Archive />}
              label="Archive"
              active={view === 'archive'}
              onClick={() => setView('archive')}
            />
          </nav>

          {/* Folders section */}
          <div className="flex flex-col shrink-0">
            <button
              onClick={() => setFoldersOpen(v => !v)}
              className="w-full flex items-center gap-[4px] px-[12px] py-[6px] rounded-10 text-text-soft hover:text-text-sub transition-colors"
            >
              <span className={SUBHEAD}>Folders</span>
              <span className="text-icon-soft">
                {foldersOpen ? <ChevronOpen /> : <ChevronClose />}
              </span>
            </button>
            {foldersOpen && (
              <div className="flex flex-col">
                {folders.map(folder => (
                  <div key={folder.id} className="relative group">
                    {renamingFolderId === folder.id ? (
                      <form
                        onSubmit={e => { e.preventDefault(); handleRenameFolder(folder.id) }}
                        className="flex items-center gap-[4px] px-[8px] py-[6px]"
                      >
                        <input
                          autoFocus
                          value={renameFolderName}
                          onChange={e => setRenameFolderName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Escape') { setRenamingFolderId(null); setRenameFolderName('') } }}
                          className={`${LABEL_SM} flex-1 min-w-0 border border-stroke-soft bg-bg-white rounded-4 px-[6px] py-[2px] text-text-strong outline-none`}
                        />
                      </form>
                    ) : (
                      <>
                        <SidebarItem
                          icon={<FolderIcon />}
                          label={folder.name}
                          active={view === folder.id}
                          onClick={() => setView(folder.id)}
                        />
                        <button
                          onClick={e => { e.stopPropagation(); setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id) }}
                          className="absolute right-[6px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 px-[4px] rounded-4 text-text-soft hover:text-text-sub transition-opacity text-[12px] leading-none"
                          aria-label="Folder options"
                        >
                          •••
                        </button>
                        {folderMenuOpen === folder.id && (
                          <div className="absolute right-0 top-full mt-[2px] bg-bg-white border border-stroke-soft rounded-8 shadow-sm z-10 py-[4px] min-w-[112px]">
                            <button
                              onClick={() => { setRenamingFolderId(folder.id); setRenameFolderName(folder.name); setFolderMenuOpen(null) }}
                              className={`${PARA_XS} w-full text-left px-[12px] py-[6px] text-text-sub hover:bg-bg-soft`}
                            >
                              Rename
                            </button>
                            <button
                              onClick={() => { handleDeleteFolder(folder.id); setFolderMenuOpen(null) }}
                              className={`${PARA_XS} w-full text-left px-[12px] py-[6px] text-text-sub hover:bg-bg-soft`}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom section */}
          <div className="mt-auto flex flex-col">
            {showNewFolder ? (
              <form onSubmit={handleCreateFolder} className="px-[8px] py-[6px]">
                <input
                  autoFocus
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') } }}
                  placeholder="Folder name"
                  className={`${LABEL_SM} w-full border border-stroke-soft bg-bg-white rounded-4 px-[8px] py-[4px] text-text-strong placeholder:text-text-soft outline-none`}
                />
              </form>
            ) : (
              <SidebarItem
                icon={<FolderAdd />}
                label="New folder"
                onClick={() => setShowNewFolder(true)}
              />
            )}
            <SidebarItem
              icon={<Settings />}
              label="Settings"
              onClick={handleLogout}
            />
          </div>
        </aside>

        {/* Main area */}
        <main className="flex-1 min-w-0 bg-bg-white border border-stroke-soft rounded-16 flex flex-col overflow-hidden">
          <header className="flex items-center gap-[4px] py-[12px] pl-[16px] pr-[12px] border-b border-stroke-soft shrink-0">
            <div className="flex items-center gap-[8px] flex-1 min-w-0">
              <span className="text-icon-strong shrink-0">
                <CurrentIcon />
              </span>
              <span className={`${LABEL_SM} text-text-strong truncate`}>{currentViewLabel}</span>
            </div>
            <button
              onClick={() => setShowAddUrl(v => !v)}
              className="p-[6px] rounded-8 flex items-center justify-center text-icon-strong hover:bg-bg-soft transition-colors shrink-0"
              aria-label="Add bookmark"
            >
              <Plus />
            </button>
          </header>

          {showAddUrl && (
            <form onSubmit={handleSaveUrl} className="px-[16px] py-[8px] border-b border-stroke-soft shrink-0">
              <input
                autoFocus
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') { setShowAddUrl(false); setNewUrl('') } }}
                placeholder="Paste a URL and press Enter"
                disabled={saving}
                className={`${LABEL_SM} w-full bg-transparent text-text-strong placeholder:text-text-soft outline-none`}
              />
            </form>
          )}

          <div className="flex-1 overflow-y-auto p-[8px] flex flex-col gap-[8px]">
            {loading ? (
              <p className={`${PARA_XS} text-text-soft px-[8px] py-[8px]`}>Loading…</p>
            ) : grouped.length === 0 ? (
              <p className={`${PARA_XS} text-text-soft px-[8px] py-[8px]`}>Nothing here yet.</p>
            ) : (
              grouped.map(group => (
                <div key={group.label}>
                  <div className={`${SUBHEAD} text-text-soft pb-[4px] pt-[8px] px-[8px]`}>
                    {group.label}
                  </div>
                  {group.items.map(b => (
                    <a
                      key={b.id}
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-[8px] min-h-[40px] px-[8px] py-[6px] rounded-8 hover:bg-bg-soft transition-colors"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={faviconUrl(b.url)}
                        alt=""
                        width={20}
                        height={20}
                        className="w-[20px] h-[20px] rounded-4 shrink-0"
                      />
                      <span className={`${LABEL_SM} text-text-strong truncate`}>
                        {formatHost(b.url)}
                      </span>
                    </a>
                  ))}
                </div>
              ))
            )}
          </div>
        </main>

      </div>
    </div>

    {/* Toast notifications */}
    <div className="fixed bottom-[16px] right-[16px] flex flex-col gap-[8px] z-50 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="bg-bg-white border border-stroke-soft rounded-10 px-[16px] py-[12px] shadow-sm pointer-events-auto flex items-center gap-[8px]"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {toast.type === 'success' ? (
            <span className="text-orange-brand shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0ZM11.7803 6.28033L7.28033 10.7803C6.98744 11.0732 6.51256 11.0732 6.21967 10.7803L4.21967 8.78033C3.92678 8.48744 3.92678 8.01256 4.21967 7.71967C4.51256 7.42678 4.98744 7.42678 5.28033 7.71967L6.75 9.18934L10.7197 5.21967C11.0126 4.92678 11.4874 4.92678 11.7803 5.21967C12.0732 5.51256 12.0732 5.98744 11.7803 6.28033Z" />
              </svg>
            </span>
          ) : (
            <span className="text-text-soft shrink-0">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0ZM7.25 4.75C7.25 4.33579 7.58579 4 8 4C8.41421 4 8.75 4.33579 8.75 4.75V8.25C8.75 8.66421 8.41421 9 8 9C7.58579 9 7.25 8.66421 7.25 8.25V4.75ZM8 12C7.44772 12 7 11.5523 7 11C7 10.4477 7.44772 10 8 10C8.55228 10 9 10.4477 9 11C9 11.5523 8.55228 12 8 12Z" />
              </svg>
            </span>
          )}
          <span className={`${LABEL_SM} text-text-strong`}>{toast.message}</span>
        </div>
      ))}
    </div>
    </>
  )
}

function SidebarItem({
  icon,
  label,
  active,
  onClick,
  right,
}: {
  icon: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
  right?: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-[8px] px-[12px] py-[8px] rounded-10 transition-colors text-left',
        active
          ? 'bg-bg-soft text-text-strong'
          : 'text-text-sub hover:bg-bg-soft/50',
      ].join(' ')}
    >
      <span className={active ? 'text-icon-strong' : 'text-icon-soft'}>
        {icon}
      </span>
      <span className={`${LABEL_SM} flex-1 truncate`}>{label}</span>
      {right}
    </button>
  )
}

function Shortcut({ children }: { children: React.ReactNode }) {
  return (
    <span className={`${PARA_XS} bg-bg-soft text-text-soft rounded-4 px-[4px] py-[0px]`}>
      {children}
    </span>
  )
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className={`${PARA_XS} text-text-soft`}>{children}</span>
  )
}
