import { useRef, type ChangeEvent } from "react"

export function SchemeActions({
  onExport,
  onImportText,
  onReset,
  error,
}: {
  onExport: () => void
  onImportText: (text: string) => void
  onReset: () => void
  error: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      onImportText(await file.text())
    } catch {
      onImportText("")
    }
  }

  return (
    <div className="scheme-actions">
      <div className="compare-apply">
        <button className="button button-secondary" type="button" onClick={onExport}>
          导出当前方案
        </button>
        <span className="file-picker">
          <button className="button button-secondary" type="button" onClick={() => inputRef.current?.click()}>
            导入覆盖方案
          </button>
          <input
            ref={inputRef}
            className="file-input"
            type="file"
            accept="application/json,.json"
            tabIndex={-1}
            onChange={(event) => void onChange(event)}
          />
        </span>
        <button className="button button-secondary" type="button" onClick={onReset}>
          重置当前方案
        </button>
      </div>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
