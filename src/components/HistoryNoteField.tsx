import type { HistoryKind, HistoryRecord } from "../types/history.ts"
import { latestSameKindNote } from "../features/history/filterHistory.ts"
import { useCatalog } from "../features/storage/useCatalog.ts"

export function HistoryNoteField({
  id,
  value,
  onChange,
  className,
  kind,
  matches,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  className?: string
  kind?: HistoryKind
  matches?: (record: HistoryRecord) => boolean
}) {
  const catalog = useCatalog()
  const fieldClass = className ? `field ${className}` : "field"

  if (!kind) {
    return (
      <label className={fieldClass} htmlFor={id}>
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

  return (
    <div className={className ? `note-field ${className}` : "note-field"}>
      <label htmlFor={id}>备注</label>
      <div className="note-field-row">
        <input
          id={id}
          value={value}
          autoComplete="off"
          placeholder="可选"
          onChange={(event) => onChange(event.target.value)}
        />
        <div className="note-field-actions">
          <button
            className="button button-secondary"
            type="button"
            onClick={() => onChange(latestSameKindNote(catalog.user.history, kind, matches))}
          >
            沿用上一次
          </button>
          <button className="button button-secondary" type="button" onClick={() => onChange("")}>
            清除
          </button>
        </div>
      </div>
    </div>
  )
}
