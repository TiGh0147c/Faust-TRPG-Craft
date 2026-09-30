export function HistoryNoteField({
  id,
  value,
  onChange,
  className,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <label className={className ? `field ${className}` : "field"} htmlFor={id}>
      备注
      <input
        id={id}
        value={value}
        autoComplete="off"
        placeholder="可选"
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
