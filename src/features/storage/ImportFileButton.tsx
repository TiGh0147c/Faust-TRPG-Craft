import { useRef, type ChangeEvent } from "react"
import { builtinIdsFrom, parseTransferText } from "../../services/storage/transfer.ts"
import type { TransferEnvelope, TransferMode, TransferScope } from "../../types/transfer.ts"
import { useCatalog } from "./useCatalog.ts"

export function ImportFileButton({
  label,
  scope,
  mode,
  disabled,
  onParsed,
  onError,
}: {
  label: string
  scope: TransferScope
  mode?: TransferMode
  disabled?: boolean
  onParsed: (envelope: TransferEnvelope) => void
  onError: (message: string) => void
}) {
  const catalog = useCatalog()
  const inputRef = useRef<HTMLInputElement>(null)

  async function onChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    try {
      const text = await file.text()
      const parsed = parseTransferText(text, { scope, mode }, builtinIdsFrom(catalog.builtin))
      if (!parsed.ok) onError(parsed.message)
      else onParsed(parsed.envelope)
    } catch {
      onError("文件没有读出来。")
    }
  }

  return (
    <span className="file-picker">
      <button className="button button-secondary" type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {label}
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
  )
}
