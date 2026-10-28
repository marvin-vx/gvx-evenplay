import { useEffect, useRef, type ReactNode } from "react"
import { X } from "lucide-react"

export default function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    ref.current?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose()
      if (event.key !== "Tab") return
      const controls = ref.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), a, input, select, [tabindex="0"]',
      )
      if (!controls?.length) return
      const first = controls[0],
        last = controls[controls.length - 1]
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === ref.current)
      ) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = overflow
      document.removeEventListener("keydown", onKey)
      previous?.focus()
    }
  }, [onClose])
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={ref}
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        <div className="modal-heading">
          <div>
            <span className="eyebrow">GVX × EVENPLAY</span>
            <h2 id="modal-title">{title}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="대화상자 닫기"
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
