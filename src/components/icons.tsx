type IconProps = React.SVGProps<SVGSVGElement>

const baseProps = {
  width: 16,
  height: 16,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
}

export function Search(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="7.333" cy="7.333" r="4.667" />
      <path d="M13.333 13.333l-2.667-2.667" />
    </svg>
  )
}

export function Bookmark(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M3.333 2.667A1 1 0 0 1 4.333 1.667h7.334a1 1 0 0 1 1 1v11.666l-4.667-3-4.667 3V2.667z" />
    </svg>
  )
}

export function Unsorted(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M2.667 4.667h10.666" />
      <path d="M4 8h8" />
      <path d="M5.333 11.333h5.334" />
    </svg>
  )
}

export function Archive(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="2" y="3.333" width="12" height="3.333" rx="0.667" />
      <path d="M3 6.667v5.666a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V6.667" />
      <path d="M6.667 9.333h2.666" />
    </svg>
  )
}

export function Folder(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M1.667 4a1 1 0 0 1 1-1h3.333l1.333 1.667h5.333a1 1 0 0 1 1 1v6.666a1 1 0 0 1-1 1H2.667a1 1 0 0 1-1-1V4z" />
    </svg>
  )
}

export function FolderAdd(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M1.667 4a1 1 0 0 1 1-1h3.333l1.333 1.667h5.333a1 1 0 0 1 1 1v6.666a1 1 0 0 1-1 1H2.667a1 1 0 0 1-1-1V4z" />
      <path d="M8 7.333v3.334" />
      <path d="M6.333 9h3.334" />
    </svg>
  )
}

export function Plus(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M8 3.333v9.334" />
      <path d="M3.333 8h9.334" />
    </svg>
  )
}

export function Settings(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <circle cx="8" cy="8" r="2" />
      <path d="M12.867 9.333a1.067 1.067 0 0 0 .213 1.174l.04.04a1.293 1.293 0 1 1-1.827 1.827l-.04-.04a1.067 1.067 0 0 0-1.173-.214 1.067 1.067 0 0 0-.64.974v.113a1.293 1.293 0 0 1-2.587 0v-.06a1.067 1.067 0 0 0-.693-.973 1.067 1.067 0 0 0-1.174.213l-.04.04a1.293 1.293 0 1 1-1.827-1.826l.04-.04a1.067 1.067 0 0 0 .214-1.174 1.067 1.067 0 0 0-.974-.64H2.3a1.293 1.293 0 1 1 0-2.587h.06a1.067 1.067 0 0 0 .974-.693 1.067 1.067 0 0 0-.214-1.174l-.04-.04a1.293 1.293 0 1 1 1.827-1.826l.04.04a1.067 1.067 0 0 0 1.174.213h.053a1.067 1.067 0 0 0 .64-.974V2.3a1.293 1.293 0 1 1 2.587 0v.06a1.067 1.067 0 0 0 .64.974 1.067 1.067 0 0 0 1.173-.214l.04-.04a1.293 1.293 0 1 1 1.827 1.827l-.04.04a1.067 1.067 0 0 0-.213 1.173v.053a1.067 1.067 0 0 0 .973.64h.114a1.293 1.293 0 0 1 0 2.587h-.06a1.067 1.067 0 0 0-.974.693z" />
    </svg>
  )
}

export function ChevronOpen(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

export function ChevronClose(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M6 4l4 4-4 4" />
    </svg>
  )
}

export function Menu(props: IconProps) {
  return (
    <svg {...baseProps} {...props}>
      <path d="M2.667 4h10.666" />
      <path d="M2.667 8h10.666" />
      <path d="M2.667 12h10.666" />
    </svg>
  )
}
