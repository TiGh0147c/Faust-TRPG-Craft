import { useState } from "react"
import {
  describeImport,
  exportEntriesMerge,
  exportGeneratorsMerge,
  exportTablesMerge,
  transferFilename,
} from "../../services/storage/transfer.ts"
import type { Entry } from "../../types/entry.ts"
import type { Generator } from "../../types/generator.ts"
import type { RandomTable } from "../../types/table.ts"
import type { TransferEnvelope } from "../../types/transfer.ts"
import { downloadJson } from "./downloadJson.ts"
import { ImportFileButton } from "./ImportFileButton.tsx"
import { useCatalog } from "./useCatalog.ts"

type RecordByScope = {
  tables: RandomTable
  entries: Entry
  generators: Generator
}

export function RecordTransferButtons<S extends keyof RecordByScope>({
  scope,
  record,
}: {
  scope: S
  record: RecordByScope[S]
}) {
  const catalog = useCatalog()
  const [pending, setPending] = useState<TransferEnvelope | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function exportRecord() {
    setError(null)
    const exportedAt = new Date().toISOString()
    const envelope =
      scope === "tables"
        ? exportTablesMerge([record as RandomTable], exportedAt)
        : scope === "entries"
          ? exportEntriesMerge([record as Entry], exportedAt)
          : exportGeneratorsMerge([record as Generator], exportedAt)
    downloadJson(transferFilename(envelope, record.name), envelope)
  }

  async function confirm() {
    if (!pending || saving) return
    setSaving(true)
    setError(null)
    const result = await catalog.importTransfer(pending)
    setSaving(false)
    setPending(null)
    if (!result.ok) setError(result.message)
  }

  return (
    <>
      {pending ? (
        <>
          <p className="note transfer-status">{describeImport(catalog.user, pending)}</p>
          <button className="button" type="button" disabled={saving} onClick={() => void confirm()}>
            确认导入
          </button>
          <button className="button button-secondary" type="button" disabled={saving} onClick={() => setPending(null)}>
            取消
          </button>
        </>
      ) : (
        <>
          <button className="button button-secondary" type="button" onClick={exportRecord}>
            导出这条
          </button>
          <ImportFileButton
            label="导入并合并"
            scope={scope}
            mode="merge"
            disabled={saving}
            onParsed={(envelope) => {
              setError(null)
              setPending(envelope)
            }}
            onError={(message) => {
              setPending(null)
              setError(message)
            }}
          />
        </>
      )}
      {error ? (
        <p className="form-error transfer-status" role="alert">
          {error}
        </p>
      ) : null}
    </>
  )
}
