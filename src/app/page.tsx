'use client'

import { useEffect, useMemo, useState } from 'react'
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

const LABEL_SM = 'text-[14px] leading-[20px] tracking-[-0.084px] font-medium'
const PARA_XS = 'text-[12px] leading-[16px]'
const SUBHEAD = 'text-[11px] leading-[12px] tracking-[0.22px] font-medium uppercase'

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
    <div className="min-h-screen bg-bg-weak flex justify-center p-[16px]">
      <div className="w-full max-w-[700px] flex gap-[15px] h-[calc(100vh-32px)]">
        {/* Sidebar */}
        <aside className="w-[193px] shrink-0 flex flex-col overflow-y-auto">
          {/* Logo */}
          <div className="flex items-center gap-[6px] px-[12px] py-[8px] mb-[8px]">
            <span className="text-orange-brand">
              <BookmarkIcon />
            </span>
            <span className={`${LABEL_SM} text-text-strong`}>mate</span>
          </div>

          {/* Main section */}
          <nav className="flex flex-col gap-[2px]">
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
          <div className="mt-[16px]">
            <button
              onClick={() => setFoldersOpen(v => !v)}
              className="w-full flex items-center justify-between px-[12px] py-[8px] text-text-soft hover:text-text-sub transition-colors"
            >
              <span className={SUBHEAD}>Folders</span>
              <span className="text-icon-soft">
                {foldersOpen ? <ChevronOpen /> : <ChevronClose />}
              </span>
            </button>
            {foldersOpen && (
              <div className="flex flex-col gap-[2px]">
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
          <div className="mt-auto pt-[16px] flex flex-col gap-[2px]">
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
          <header className="flex items-center justify-between py-[12px] px-[16px] border-b border-stroke-soft">
            <div className="flex items-center gap-[8px]">
              <span className="text-icon-strong">
                <CurrentIcon />
              </span>
              <span className={`${LABEL_SM} text-text-strong`}>{currentViewLabel}</span>
            </div>
            <button
              onClick={() => setShowAddUrl(v => !v)}
              className="w-[28px] h-[28px] rounded-8 flex items-center justify-center text-icon-strong hover:bg-bg-soft transition-colors"
              aria-label="Add bookmark"
            >
              <Plus />
            </button>
          </header>

          {showAddUrl && (
            <form onSubmit={handleSaveUrl} className="px-[16px] py-[8px] border-b border-stroke-soft">
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

          <div className="flex-1 overflow-y-auto p-[8px]">
            {loading ? (
              <p className={`${PARA_XS} text-text-soft px-[8px] py-[8px]`}>Loading…</p>
            ) : grouped.length === 0 ? (
              <p className={`${PARA_XS} text-text-soft px-[8px] py-[8px]`}>Nothing here yet.</p>
            ) : (
              grouped.map(group => (
                <div key={group.label} className="mb-[4px]">
                  <div className={`${SUBHEAD} text-text-soft py-[8px] px-[8px]`}>
                    {group.label}
                  </div>
                  {group.items.map(b => (
                    <a
                      key={b.id}
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-[8px] h-[40px] px-[8px] py-[6px] rounded-8 hover:bg-bg-soft transition-colors"
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
        'w-full flex items-center gap-[8px] h-[36px] px-[12px] py-[8px] rounded-10 transition-colors text-left',
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
    <span className={`${PARA_XS} bg-bg-soft text-text-soft rounded-4 px-[6px] py-[2px]`}>
      {children}
    </span>
  )
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className={`${PARA_XS} text-text-soft`}>{children}</span>
  )
}
