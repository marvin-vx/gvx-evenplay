import type { ComponentProps, ReactNode } from "react"

// Native controls share the existing GVX treatment; no external UI kit is used.
export function Button({ type = "button", ...props }: ComponentProps<"button">) {
  return <button type={type} {...props} />
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} />
}

export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="mock-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

export function Toggle({
  label,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { label: string }) {
  return (
    <label className="mock-toggle">
      <input type="checkbox" {...props} />
      <span>{label}</span>
    </label>
  )
}
