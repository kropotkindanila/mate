'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Lottie from 'lottie-react'
import bookmarkFillAnimation from './bookmark-fill.json'
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
  LogOut,
  ChevronOpen,
  ChevronClose,
  Menu,
  Link,
  Trash,
  Warning,
  Success,
  Check,
  BookmarkRemove,
  MateLogo,
} from '@/components/icons'

type Bookmark = {
  id: string
  url: string
  title: string | null
  created_at: string
  folder_ids: string[]
  archived: boolean
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

const FALLBACK_EMOJIS = ['🎯','🚀','💡','📚','🎨','🔮','🌟','🎭','🦋','🌈','🔥','💎','🎪','🌊','🎵','🦄','🍀','🎲','🌺','⚡']

function getFallbackEmoji(url: string) {
  let hash = 0
  for (let i = 0; i < url.length; i++) hash = (hash + url.charCodeAt(i)) % FALLBACK_EMOJIS.length
  return FALLBACK_EMOJIS[hash]
}

function faviconUrl(url: string) {
  try {
    const host = new URL(url).hostname
    return `https://icons.duckduckgo.com/ip3/${host}.ico`
  } catch {
    return null
  }
}

function FaviconWithFallback({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false)
  const src = faviconUrl(url)

  return (
    <>
      {!loaded && <span className="text-[16px] leading-none">{getFallbackEmoji(url)}</span>}
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={20}
          height={20}
          className={loaded ? 'w-[20px] h-[20px]' : 'hidden'}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(false)}
        />
      )}
    </>
  )
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
  const [bookmarkMenuOpen, setBookmarkMenuOpen] = useState<string | null>(null)
  const [folderPickerOpen, setFolderPickerOpen] = useState<string | null>(null)
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null)
  const [renameFolderName, setRenameFolderName] = useState('')

  const [renamingBookmarkId, setRenamingBookmarkId] = useState<string | null>(null)
  const [renameBookmarkTitle, setRenameBookmarkTitle] = useState('')

  const [deleteFolderConfirmId, setDeleteFolderConfirmId] = useState<string | null>(null)

  const [toasts, setToasts] = useState<Toast[]>([])

  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const toastCounter = useRef(0)
  const folderPickerRef = useRef<HTMLDivElement | null>(null)
  const folderPickerWasOpen = useRef(false)

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
      const [loaded] = await Promise.all([fetchBookmarks(), fetchFolders()])
      const untitled = loaded?.filter(b => !b.title) ?? []
      for (const b of untitled) {
        await fetchAndUpdateTitle(b.id, b.url)
      }
    }
    init()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    function onExtensionSave() { fetchBookmarks() }
    window.addEventListener('mate-bookmark-saved', onExtensionSave)
    return () => window.removeEventListener('mate-bookmark-saved', onExtensionSave)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!folderMenuOpen) return
    function close() { setFolderMenuOpen(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [folderMenuOpen])

  useEffect(() => {
    if (!bookmarkMenuOpen) return
    function close() { setBookmarkMenuOpen(null) }
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [bookmarkMenuOpen])

  useEffect(() => {
    if (!folderPickerOpen) return
    function handleOutsideClick(e: MouseEvent) {
      if (folderPickerRef.current && !folderPickerRef.current.contains(e.target as Node)) {
        setFolderPickerOpen(null)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [folderPickerOpen])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'f' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setShowSearch(true)
      }
      if (e.key === 'Escape') {
        setShowSearch(false)
        setSearchQuery('')
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

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
          showToast("Looks like this isn't a URL. Try copying the link again.", 'error')
          return
        }
        if (!userId) return
        const folder_id =
          typeof view === 'string' && view !== 'all' && view !== 'unsorted' && view !== 'archive'
            ? view
            : null
        const { data: inserted, error } = await supabase
          .from('bookmarks')
          .insert({ url: text, user_id: userId })
          .select('id')
          .single()
        if (!error && inserted) {
          if (folder_id) {
            await supabase.from('bookmark_folders').insert({ bookmark_id: inserted.id, folder_id })
          }
          fetchBookmarks()
          showToast('Link pasted', 'success')
          fetchAndUpdateTitle(inserted.id, text)
        }
      } catch {
        // clipboard access denied or unavailable
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [userId, view]) // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchAndUpdateTitle(bookmarkId: string, url: string) {
    try {
      const res = await fetch(`/api/fetch-title?url=${encodeURIComponent(url)}`)
      const { title } = await res.json()
      if (title) {
        await supabase.from('bookmarks').update({ title }).eq('id', bookmarkId)
        setBookmarks(prev => prev.map(b => b.id === bookmarkId ? { ...b, title } : b))
      }
    } catch {
      // title fetch failed — keep showing the URL
    }
  }

  async function fetchBookmarks() {
    const { data } = await supabase
      .from('bookmarks')
      .select('id, url, title, created_at, archived, bookmark_folders(folder_id)')
      .order('created_at', { ascending: false })
    type Row = { id: string; url: string; title: string | null; created_at: string; archived: boolean; bookmark_folders: { folder_id: string }[] }
    const mapped = (data ?? []).map((b: Row) => ({
      id: b.id,
      url: b.url,
      title: b.title ?? null,
      created_at: b.created_at,
      archived: b.archived,
      folder_ids: (b.bookmark_folders ?? []).map((bf) => bf.folder_id),
    }))
    setBookmarks(mapped)
    setLoading(false)
    return mapped
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
    const { data: inserted, error } = await supabase
      .from('bookmarks')
      .insert({ url: normalized, user_id: userId })
      .select('id')
      .single()
    setSaving(false)
    if (!error && inserted) {
      if (folder_id) {
        await supabase.from('bookmark_folders').insert({ bookmark_id: inserted.id, folder_id })
      }
      setNewUrl('')
      setShowAddUrl(false)
      fetchBookmarks()
      fetchAndUpdateTitle(inserted.id, normalized)
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
      showToast('Folder created', 'success')
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
    showToast('Folder renamed', 'success')
  }

  async function handleRenameBookmark(bookmarkId: string) {
    if (!renameBookmarkTitle.trim()) return
    await supabase.from('bookmarks').update({ title: renameBookmarkTitle.trim() }).eq('id', bookmarkId)
    setRenamingBookmarkId(null)
    setRenameBookmarkTitle('')
    fetchBookmarks()
    showToast('Renamed', 'success')
  }

  async function handleDeleteBookmark(bookmarkId: string) {
    await supabase.from('bookmarks').delete().eq('id', bookmarkId)
    fetchBookmarks()
    showToast('Deleted', 'success')
  }

  async function handleDeleteFolder(folderId: string) {
    await supabase.from('folders').delete().eq('id', folderId)
    if (view === folderId) setView('all')
    fetchFolders()
    fetchBookmarks()
    showToast('Deleted', 'success')
  }

  async function handleMoveToFolder(bookmarkId: string, folderId: string, isSelected: boolean) {
    if (isSelected) {
      await supabase.from('bookmark_folders')
        .delete()
        .eq('bookmark_id', bookmarkId)
        .eq('folder_id', folderId)
    } else {
      await supabase.from('bookmark_folders')
        .insert({ bookmark_id: bookmarkId, folder_id: folderId })
    }
    fetchBookmarks()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  const visibleBookmarks = useMemo(() => bookmarks.filter(b => {
    if (view === 'archive') return b.archived
    if (b.archived) return false
    if (view === 'all') return true
    if (view === 'unsorted') return b.folder_ids.length === 0
    return b.folder_ids.includes(view)
  }), [bookmarks, view])

  const grouped = useMemo(() => groupBookmarksByDate(visibleBookmarks), [visibleBookmarks])

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return { bookmarks: [], folders: [] }

    const matchedFolders = folders.filter(f => f.name.toLowerCase().includes(q))
    const matchedFolderIds = new Set(matchedFolders.map(f => f.id))

    const seen = new Set<string>()
    const result: typeof bookmarks = []

    // Bookmarks from matched folders first
    for (const b of bookmarks) {
      if (b.archived) continue
      if (b.folder_ids.some(id => matchedFolderIds.has(id))) {
        seen.add(b.id)
        result.push(b)
      }
    }

    // Then text-matched bookmarks not already included
    for (const b of bookmarks) {
      if (b.archived || seen.has(b.id)) continue
      if ((b.title?.toLowerCase().includes(q)) || b.url.toLowerCase().includes(q)) {
        result.push(b)
      }
    }

    return {
      bookmarks: result.slice(0, 7),
      folders: matchedFolders.slice(0, 3),
    }
  }, [bookmarks, folders, searchQuery])

  const unsortedCount = bookmarks.filter(b => b.folder_ids.length === 0).length
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

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-weak flex items-center justify-center">
        <Lottie animationData={bookmarkFillAnimation} loop style={{ width: 120, height: 120 }} />
      </div>
    )
  }

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
              onClick={() => setShowSearch(true)}
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
              className="group w-full flex items-center justify-between px-[12px] py-[6px] rounded-10 transition-colors"
            >
              <span className="flex items-center gap-[4px]">
                <span className={`${SUBHEAD} text-text-soft group-hover:text-text-sub transition-colors`}>Folders</span>
                <span className="text-icon-soft group-hover:text-text-sub transition-colors">
                  {foldersOpen ? <ChevronClose /> : <ChevronOpen />}
                </span>
              </span>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-icon-soft group-hover:text-text-sub">
                <Menu />
              </span>
            </button>
            {foldersOpen && (
              <div className="flex flex-col">
                {folders.map(folder => (
                  <div key={folder.id} className="relative group">
                    <SidebarItem
                          icon={<FolderIcon />}
                          label={folder.name}
                          active={view === folder.id}
                          onClick={() => setView(folder.id)}
                        />
                        <button
                          onClick={e => { e.stopPropagation(); setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id) }}
                          className="absolute right-[6px] top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-[4px] rounded-6 text-icon-soft hover:text-text-sub hover:bg-bg-soft transition-colors"
                          aria-label="Folder options"
                        >
                          <Menu />
                        </button>
                        {folderMenuOpen === folder.id && (
                          <div
                            className="absolute right-0 top-full mt-[4px] z-20 bg-bg-white border border-stroke-soft rounded-12 flex flex-col overflow-hidden w-[183px]"
                            style={{ boxShadow: '0px 16px 32px -12px rgba(14,18,27,0.1)' }}
                            onClick={e => e.stopPropagation()}
                          >
                            <div className="p-[8px] flex flex-col">
                              <button
                                onClick={() => { setRenamingFolderId(folder.id); setRenameFolderName(folder.name); setFolderMenuOpen(null) }}
                                className="flex items-center gap-[8px] px-[8px] py-[6px] rounded-6 w-full text-text-sub hover:bg-menu-hover transition-colors"
                              >
                                <span className={LABEL_SM}>Rename</span>
                              </button>
                            </div>
                            <div className="h-px bg-stroke-soft" />
                            <div className="p-[8px] flex flex-col">
                              <button
                                onClick={() => { setDeleteFolderConfirmId(folder.id); setFolderMenuOpen(null) }}
                                className="flex items-center gap-[8px] px-[8px] py-[6px] rounded-6 w-full text-error-base hover:bg-error-lighter transition-colors"
                              >
                                <Trash className="shrink-0" />
                                <span className={LABEL_SM}>Delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom section */}
          <div className="mt-auto flex flex-col">
            <SidebarItem
              icon={<FolderAdd />}
              label="New folder"
              onClick={() => { setNewFolderName(''); setShowNewFolder(true) }}
            />
            <SidebarItem
              icon={<LogOut />}
              label="Log out"
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
            {grouped.length === 0 ? (
              <EmptyState view={view} />
            ) : (
              grouped.map(group => (
                <div key={group.label}>
                  <div className={`${SUBHEAD} text-text-soft pb-[4px] pt-[8px] px-[8px]`}>
                    {group.label}
                  </div>
                  {group.items.map(b => (
                    <div key={b.id} className="relative">
                      <a
                        href={b.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`group flex items-center gap-[12px] min-h-[40px] px-[8px] py-[6px] rounded-8 transition-colors ${folderPickerOpen === b.id || bookmarkMenuOpen === b.id ? 'bg-menu-hover' : 'hover:bg-menu-hover'}`}
                      >
                        <div className="flex flex-1 min-w-0 gap-[10px] items-center">
                          <div className="bg-bg-weak rounded-8 p-[6px] shrink-0 flex items-center justify-center">
                            <FaviconWithFallback url={b.url} />
                          </div>
                          <div className="flex flex-col min-w-0 gap-[2px]">
                            <span className={`${LABEL_SM} text-text-strong truncate`}>
                              {b.title || formatHost(b.url)}
                            </span>
                            {b.title && (
                              <span className={`${PARA_XS} font-medium text-text-soft truncate`}>
                                {formatHost(b.url)}
                              </span>
                            )}
                          </div>
                        </div>
                        {b.folder_ids.length > 0 ? (
                          <div className="relative shrink-0 flex items-center">
                            <div className={`flex items-center gap-[4px] transition-opacity pointer-events-none ${folderPickerOpen === b.id || bookmarkMenuOpen === b.id ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'}`}>
                              {folders.find(f => f.id === b.folder_ids[0]) && (
                                <span className={`${PARA_XS} font-medium text-text-sub whitespace-nowrap`}>
                                  {folders.find(f => f.id === b.folder_ids[0])!.name}
                                </span>
                              )}
                              {b.folder_ids.length > 1 && (
                                <div className="relative group/more pointer-events-auto flex items-center">
                                  <span className={`${PARA_XS} font-medium text-text-sub whitespace-nowrap`}>+{b.folder_ids.length - 1}</span>
                                  <div className="absolute right-0 top-full pt-[4px] hidden group-hover/more:flex flex-col z-30 pointer-events-none">
                                    <div className="flex justify-end pr-[4px]">
                                      <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[4px] border-l-transparent border-r-transparent border-b-[#171717]" />
                                    </div>
                                    <div
                                      className="bg-[#171717] rounded-[4px] px-[6px] py-[2px]"
                                      style={{ boxShadow: '0px 12px 24px 0px rgba(14,18,27,0.06), 0px 1px 2px 0px rgba(14,18,27,0.03)' }}
                                    >
                                      {b.folder_ids.slice(1).map(folderId => {
                                        const folder = folders.find(f => f.id === folderId)
                                        return folder ? (
                                          <p key={folderId} className="text-[12px] leading-[16px] text-white whitespace-nowrap">{folder.name}</p>
                                        ) : null
                                      })}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className={`absolute right-0 inset-y-0 flex items-center gap-[4px] transition-opacity ${folderPickerOpen === b.id || bookmarkMenuOpen === b.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                              <button
                                onMouseDown={() => { folderPickerWasOpen.current = folderPickerOpen === b.id }}
                                onClick={e => { e.preventDefault(); e.stopPropagation(); if (folderPickerWasOpen.current) { setFolderPickerOpen(null) } else { setFolderPickerOpen(b.id); setBookmarkMenuOpen(null) } }}
                                className="p-[6px] rounded-8 text-icon-soft hover:text-text-sub hover:bg-bg-soft transition-colors"
                                aria-label="Move to folder"
                              >
                                <FolderAdd />
                              </button>
                              <button
                                onClick={e => { e.preventDefault(); e.stopPropagation(); setBookmarkMenuOpen(bookmarkMenuOpen === b.id ? null : b.id); setFolderPickerOpen(null) }}
                                className="p-[6px] rounded-8 text-icon-soft hover:text-text-sub hover:bg-bg-soft transition-colors"
                                aria-label="More options"
                              >
                                <Menu />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className={`flex items-center gap-[4px] transition-opacity shrink-0 ${folderPickerOpen === b.id || bookmarkMenuOpen === b.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <button
                              onMouseDown={() => { folderPickerWasOpen.current = folderPickerOpen === b.id }}
                              onClick={e => { e.preventDefault(); e.stopPropagation(); if (folderPickerWasOpen.current) { setFolderPickerOpen(null) } else { setFolderPickerOpen(b.id); setBookmarkMenuOpen(null) } }}
                              className="p-[6px] rounded-8 text-icon-soft hover:text-text-sub hover:bg-bg-soft transition-colors"
                              aria-label="Move to folder"
                            >
                              <FolderAdd />
                            </button>
                            <button
                              onClick={e => { e.preventDefault(); e.stopPropagation(); setBookmarkMenuOpen(bookmarkMenuOpen === b.id ? null : b.id); setFolderPickerOpen(null) }}
                              className="p-[6px] rounded-8 text-icon-soft hover:text-text-sub hover:bg-bg-soft transition-colors"
                              aria-label="More options"
                            >
                              <Menu />
                            </button>
                          </div>
                        )}
                      </a>
                      {bookmarkMenuOpen === b.id && (
                        <div
                          className="absolute right-0 top-full mt-[4px] z-20 bg-bg-white border border-stroke-soft rounded-12 flex flex-col overflow-hidden w-[183px]"
                          style={{ boxShadow: '0px 16px 32px -12px rgba(14,18,27,0.1)' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <div className="p-[8px] flex flex-col">
                            <button
                              onClick={() => { setRenamingBookmarkId(b.id); setRenameBookmarkTitle(b.title || formatHost(b.url)); setBookmarkMenuOpen(null) }}
                              className="flex items-center gap-[8px] px-[8px] py-[6px] rounded-6 w-full text-text-sub hover:bg-menu-hover transition-colors"
                            >
                              <span className={LABEL_SM}>Rename</span>
                            </button>
                            <button
                              onClick={() => { navigator.clipboard.writeText(b.url); setBookmarkMenuOpen(null); showToast('Link copied', 'success') }}
                              className="flex items-center gap-[8px] px-[8px] py-[6px] rounded-6 w-full text-text-sub hover:bg-menu-hover transition-colors"
                            >
                              <Link className="shrink-0" />
                              <span className={LABEL_SM}>Copy link</span>
                            </button>
                            <button
                              onClick={async () => {
                                await supabase.from('bookmarks').update({ archived: true }).eq('id', b.id)
                                fetchBookmarks()
                                setBookmarkMenuOpen(null)
                                showToast('Archived', 'success')
                              }}
                              className="flex items-center gap-[8px] px-[8px] py-[6px] rounded-6 w-full text-text-sub hover:bg-menu-hover transition-colors"
                            >
                              <Archive className="shrink-0" />
                              <span className={LABEL_SM}>Archive</span>
                            </button>
                          </div>
                          <div className="h-px bg-stroke-soft" />
                          <div className="p-[8px] flex flex-col">
                            <button
                              onClick={() => { handleDeleteBookmark(b.id); setBookmarkMenuOpen(null) }}
                              className="flex items-center gap-[8px] px-[8px] py-[6px] rounded-6 w-full text-error-base hover:bg-error-lighter transition-colors"
                            >
                              <Trash className="shrink-0" />
                              <span className={LABEL_SM}>Delete</span>
                            </button>
                          </div>
                        </div>
                      )}
                      {folderPickerOpen === b.id && (
                        <div
                          ref={folderPickerRef}
                          className="absolute right-0 top-full mt-[4px] z-20 bg-bg-white border border-stroke-soft rounded-12 flex flex-col overflow-hidden w-[183px] p-[8px]"
                          style={{ boxShadow: '0px 16px 32px -12px rgba(14,18,27,0.1)' }}
                        >
                          {folders.map(folder => (
                            <button
                              key={folder.id}
                              onClick={() => handleMoveToFolder(b.id, folder.id, b.folder_ids.includes(folder.id))}
                              className="flex items-center justify-between px-[8px] py-[6px] rounded-6 w-full text-text-sub hover:bg-menu-hover transition-colors"
                            >
                              <div className="flex items-center gap-[8px] min-w-0">
                                <FolderIcon className="shrink-0 text-icon-soft" />
                                <span className={`${LABEL_SM} truncate`}>{folder.name}</span>
                              </div>
                              {b.folder_ids.includes(folder.id) && (
                                <Check className="shrink-0 text-text-sub" />
                              )}
                            </button>
                          ))}
                          {folders.length === 0 && (
                            <p className={`${PARA_XS} text-text-soft px-[8px] py-[6px]`}>No folders yet</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </main>

      </div>
    </div>

    {/* Create folder modal */}
    {showNewFolder && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => { setShowNewFolder(false); setNewFolderName('') }}>
        <form
          className="bg-bg-white border border-stroke-soft rounded-[20px] p-[16px] flex flex-col gap-[12px] w-[320px]"
          style={{ boxShadow: '0px 16px 32px -12px rgba(14,18,27,0.1)' }}
          onClick={e => e.stopPropagation()}
          onSubmit={handleCreateFolder}
        >
          <div>
            <input
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setShowNewFolder(false); setNewFolderName('') } }}
              placeholder="Folder name"
              className="w-full bg-bg-white border border-stroke-soft rounded-10 pl-[12px] pr-[10px] py-[10px] text-[14px] leading-[20px] tracking-[-0.084px] text-text-strong placeholder:text-text-soft outline-none"
              style={{ boxShadow: '0px 1px 2px 0px rgba(10,13,20,0.03)' }}
            />
          </div>
          <div className="flex flex-col gap-[8px]">
            <button
              type="submit"
              className="w-full bg-[#262626] text-white text-[14px] leading-[20px] tracking-[-0.084px] font-medium py-[8px] rounded-8 hover:opacity-90 transition-opacity"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => { setShowNewFolder(false); setNewFolderName('') }}
              className="w-full bg-bg-white border border-stroke-soft text-text-sub text-[14px] leading-[20px] tracking-[-0.084px] font-medium py-[8px] rounded-8 hover:bg-bg-soft transition-colors"
              style={{ boxShadow: '0px 1px 2px 0px rgba(10,13,20,0.03)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )}

    {/* Rename bookmark modal */}
    {renamingBookmarkId && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => { setRenamingBookmarkId(null); setRenameBookmarkTitle('') }}>
        <form
          className="bg-bg-white border border-stroke-soft rounded-[20px] p-[16px] flex flex-col gap-[12px] w-[320px]"
          style={{ boxShadow: '0px 16px 32px -12px rgba(14,18,27,0.1)' }}
          onClick={e => e.stopPropagation()}
          onSubmit={e => { e.preventDefault(); handleRenameBookmark(renamingBookmarkId) }}
        >
          <div>
            <input
              autoFocus
              value={renameBookmarkTitle}
              onChange={e => setRenameBookmarkTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setRenamingBookmarkId(null); setRenameBookmarkTitle('') } }}
              placeholder="Bookmark name"
              className="w-full bg-bg-white border border-stroke-soft rounded-10 pl-[12px] pr-[10px] py-[10px] text-[14px] leading-[20px] tracking-[-0.084px] text-text-strong placeholder:text-text-soft outline-none"
              style={{ boxShadow: '0px 1px 2px 0px rgba(10,13,20,0.03)' }}
            />
          </div>
          <div className="flex flex-col gap-[8px]">
            <button
              type="submit"
              className="w-full bg-[#262626] text-white text-[14px] leading-[20px] tracking-[-0.084px] font-medium py-[8px] rounded-8 hover:opacity-90 transition-opacity"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setRenamingBookmarkId(null); setRenameBookmarkTitle('') }}
              className="w-full bg-bg-white border border-stroke-soft text-text-sub text-[14px] leading-[20px] tracking-[-0.084px] font-medium py-[8px] rounded-8 hover:bg-bg-soft transition-colors"
              style={{ boxShadow: '0px 1px 2px 0px rgba(10,13,20,0.03)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )}

    {/* Rename folder modal */}
    {renamingFolderId && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={() => { setRenamingFolderId(null); setRenameFolderName('') }}>
        <form
          className="bg-bg-white border border-stroke-soft rounded-[20px] p-[16px] flex flex-col gap-[12px] w-[320px]"
          style={{ boxShadow: '0px 16px 32px -12px rgba(14,18,27,0.1)' }}
          onClick={e => e.stopPropagation()}
          onSubmit={e => { e.preventDefault(); handleRenameFolder(renamingFolderId) }}
        >
          <div>
            <input
              autoFocus
              value={renameFolderName}
              onChange={e => setRenameFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setRenamingFolderId(null); setRenameFolderName('') } }}
              placeholder="Folder name"
              className="w-full bg-bg-white border border-stroke-soft rounded-10 pl-[12px] pr-[10px] py-[10px] text-[14px] leading-[20px] tracking-[-0.084px] text-text-strong placeholder:text-text-soft outline-none"
              style={{ boxShadow: '0px 1px 2px 0px rgba(10,13,20,0.03)' }}
            />
          </div>
          <div className="flex flex-col gap-[8px]">
            <button
              type="submit"
              className="w-full bg-[#262626] text-white text-[14px] leading-[20px] tracking-[-0.084px] font-medium py-[8px] rounded-8 hover:opacity-90 transition-opacity"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => { setRenamingFolderId(null); setRenameFolderName('') }}
              className="w-full bg-bg-white border border-stroke-soft text-text-sub text-[14px] leading-[20px] tracking-[-0.084px] font-medium py-[8px] rounded-8 hover:bg-bg-soft transition-colors"
              style={{ boxShadow: '0px 1px 2px 0px rgba(10,13,20,0.03)' }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    )}

    {/* Delete folder confirmation modal */}
    {deleteFolderConfirmId && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/20"
        onClick={() => setDeleteFolderConfirmId(null)}
      >
        <div
          className="bg-bg-white border border-stroke-soft rounded-[20px] p-[16px] flex flex-col gap-[12px] w-[320px]"
          style={{ boxShadow: '0px 16px 32px -12px rgba(14,18,27,0.1)' }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex flex-col gap-[16px] items-center">
            <div className="bg-error-lighter p-[8px] rounded-10">
              <Warning className="text-error-base" width={24} height={24} />
            </div>
            <div className="flex flex-col gap-[4px] text-center w-full">
              <p className="text-[16px] leading-[24px] tracking-[-0.176px] font-medium text-text-strong">
                Delete folder?
              </p>
              <p className="text-[14px] leading-[20px] tracking-[-0.084px] text-text-sub">
                This will permanently delete this folder and all its bookmarks.{' '}
                <span className="font-medium">This action can&apos;t be undone.</span>
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-[8px] w-full">
            <button
              onClick={() => { handleDeleteFolder(deleteFolderConfirmId); setDeleteFolderConfirmId(null) }}
              className="w-full bg-error-base text-white text-[14px] leading-[20px] tracking-[-0.084px] font-medium py-[8px] rounded-8 hover:opacity-90 transition-opacity"
            >
              Delete folder
            </button>
            <button
              onClick={() => setDeleteFolderConfirmId(null)}
              className="w-full bg-bg-white border border-stroke-soft text-text-sub text-[14px] leading-[20px] tracking-[-0.084px] font-medium py-[8px] rounded-8 hover:bg-bg-soft transition-colors"
              style={{ boxShadow: '0px 1px 2px 0px rgba(10,13,20,0.03)' }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Search modal */}
    {showSearch && (
      <div
        className="fixed inset-0 z-50 flex items-start justify-center pt-[80px]"
        style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(255,255,255,0.01)' }}
        onClick={() => { setShowSearch(false); setSearchQuery('') }}
      >
        <div
          className="w-[448px] rounded-12 bg-bg-white border border-stroke-soft overflow-hidden"
          style={{ boxShadow: '0px 16px 32px -12px rgba(14,18,27,0.1)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Search input row */}
          <div className="flex items-center gap-[4px] px-[12px] py-[12px] border-b border-stroke-soft">
            <div className="flex flex-1 items-center gap-[8px]">
              <span className="text-text-soft shrink-0"><Search /></span>
              <input
                autoFocus
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent outline-none text-[14px] leading-[20px] tracking-[-0.084px] font-medium text-text-strong placeholder:text-text-soft"
              />
            </div>
            <span
              className="bg-bg-soft rounded-4 px-[4px] text-[12px] leading-[16px] text-text-soft cursor-pointer select-none"
              onClick={() => { setShowSearch(false); setSearchQuery('') }}
            >
              esc
            </span>
          </div>

          {/* Results */}
          {searchQuery.trim() && (
            <div className="py-[4px]">
              {searchResults.bookmarks.length > 0 && (
                <>
                  <div className="px-[12px] pt-[8px] pb-[4px] text-[11px] leading-[12px] tracking-[0.22px] font-medium uppercase text-text-soft">
                    Bookmarks
                  </div>
                  {searchResults.bookmarks.map(b => (
                    <div
                      key={b.id}
                      className="flex items-center gap-[8px] px-[12px] py-[6px] hover:bg-bg-weak cursor-pointer"
                      onClick={() => { window.open(b.url, '_blank'); setShowSearch(false); setSearchQuery('') }}
                    >
                      <div className="w-[20px] h-[20px] rounded-4 bg-bg-soft flex items-center justify-center shrink-0 overflow-hidden">
                        <FaviconWithFallback url={b.url} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[14px] leading-[20px] tracking-[-0.084px] font-medium text-text-strong truncate">
                          {b.title || b.url}
                        </span>
                        {b.title && (
                          <span className="text-[12px] leading-[16px] text-text-soft truncate">
                            {(() => { try { return new URL(b.url).hostname } catch { return b.url } })()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
              {searchResults.folders.length > 0 && (
                <>
                  <div className="px-[12px] pt-[8px] pb-[4px] text-[11px] leading-[12px] tracking-[0.22px] font-medium uppercase text-text-soft">
                    Folders
                  </div>
                  {searchResults.folders.map(f => (
                    <div
                      key={f.id}
                      className="flex items-center gap-[8px] px-[12px] py-[8px] hover:bg-bg-weak cursor-pointer"
                      onClick={() => { setView(f.id); setShowSearch(false); setSearchQuery('') }}
                    >
                      <span className="text-text-soft shrink-0"><FolderIcon /></span>
                      <span className="text-[14px] leading-[20px] tracking-[-0.084px] font-medium text-text-strong truncate">
                        {f.name}
                      </span>
                    </div>
                  ))}
                </>
              )}
              {searchResults.bookmarks.length === 0 && searchResults.folders.length === 0 && (
                <div className="px-[12px] py-[16px] text-[14px] leading-[20px] text-text-soft text-center">
                  No results for &ldquo;{searchQuery.trim()}&rdquo;
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )}

    {/* Toast notifications */}
    <div className="fixed bottom-[20px] left-1/2 -translate-x-1/2 flex flex-col gap-[8px] z-50 pointer-events-none items-center">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="flex items-center gap-[8px] pl-[8px] pr-[12px] py-[8px] rounded-8 pointer-events-auto"
          style={{
            backgroundColor: '#262626',
            boxShadow: '0px 1px 1px 0px rgba(23,23,23,0.04), 0px 3px 3px 0px rgba(23,23,23,0.02), 0px 6px 6px 0px rgba(23,23,23,0.04), 0px 12px 12px 0px rgba(23,23,23,0.04), 0px 24px 24px 0px rgba(23,23,23,0.04), 0px 48px 48px 0px rgba(23,23,23,0.04), inset 0px -1px 1px 0px rgba(23,23,23,0.06)',
          }}
        >
          {toast.type === 'success' ? (
            <span className="text-green-500 shrink-0"><Success /></span>
          ) : (
            <span className="text-orange-brand shrink-0"><Warning /></span>
          )}
          <span className="text-[12px] leading-[16px] font-normal text-white whitespace-nowrap" style={{ fontFeatureSettings: "'ss11' 1, 'calt' 0, 'liga' 0" }}>
            {toast.message}
          </span>
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
        'group w-full flex items-center gap-[8px] px-[12px] py-[8px] rounded-10 transition-colors text-left',
        active ? 'bg-bg-soft' : 'hover:bg-bg-sidebar-hover',
      ].join(' ')}
    >
      <span className={active ? 'text-icon-strong' : 'text-icon-soft group-hover:text-text-sub transition-colors'}>
        {icon}
      </span>
      <span className={[
        LABEL_SM,
        'flex-1 truncate',
        active ? 'text-text-strong' : 'text-text-sub',
      ].join(' ')}>{label}</span>
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

function EmptyState({ view }: { view: string }) {
  const config: Record<string, { icon: React.ReactNode; title: string; subtitle: string; shortcut?: string }> = {
    all: {
      icon: <BookmarkRemove className="text-text-soft" />,
      title: 'No bookmarks yet',
      subtitle: 'Paste a link to get started.',
      shortcut: '⌘V',
    },
    unsorted: {
      icon: <Unsorted className="text-text-soft" width={24} height={24} />,
      title: 'No unsorted bookmarks',
      subtitle: 'All your bookmarks are in a folder.',
    },
    archive: {
      icon: <Archive className="text-text-soft" width={24} height={24} />,
      title: 'Nothing archived',
      subtitle: 'Archived bookmarks will appear here.',
    },
  }

  const { icon, title, subtitle, shortcut } = config[view] ?? {
    icon: <FolderIcon className="text-text-soft" width={24} height={24} />,
    title: 'This folder is empty',
    subtitle: 'Paste a link to add a bookmark.',
    shortcut: '⌘V',
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-[12px] py-[24px]">
      <div className="flex flex-col items-center gap-[12px]">
        {icon}
        <div className="flex flex-col items-center gap-[4px]">
          <p className={`${LABEL_SM} text-text-sub`}>{title}</p>
          <div className="flex flex-col items-center gap-[4px]">
            <p className={`${PARA_XS} text-text-soft text-center`}>{subtitle}</p>
            {shortcut && (
              <div className="flex items-center gap-[4px]">
                <p className={`${PARA_XS} text-text-soft`}>Just press:</p>
                <span className={`${PARA_XS} bg-bg-soft text-text-soft rounded-4 px-[4px]`}>{shortcut}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
