import { useEffect, useRef } from 'react'

export interface ContextMenuItem {
  label: string
  onSelect: () => void
  destructive?: boolean
}

export function ContextMenu({
  x,
  y,
  items,
  onClose,
}: {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('scroll', onClose, true)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  // Keep the menu on-screen even when the click is near the right/bottom edge.
  const style = {
    top: y,
    left: Math.min(x, window.innerWidth - 220),
  }

  return (
    <div
      ref={ref}
      style={style}
      className="fixed z-[150] min-w-[210px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl"
    >
      {items.map((item, i) => (
        <button
          key={i}
          type="button"
          onClick={() => {
            item.onSelect()
            onClose()
          }}
          className={`block w-full px-3 py-1.5 text-left text-sm transition hover:bg-slate-100 ${
            item.destructive ? 'text-red-600' : 'text-slate-700'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
