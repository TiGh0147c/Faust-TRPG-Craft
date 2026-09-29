import { useEffect, useMemo, useState } from "react"
import { ImportFileButton } from "../features/storage/ImportFileButton.tsx"
import { downloadJson } from "../features/storage/downloadJson.ts"
import { filterHistory, formatHistoryTime, HISTORY_KIND_LABEL } from "../features/history/filterHistory.ts"
import { useCatalog } from "../features/storage/useCatalog.ts"
import { describeImport, exportHistoryMerge, exportHistorySnapshot, transferFilename } from "../services/storage/transfer.ts"
import type { HistoryKind, HistoryRecord } from "../types/history.ts"
import type { TransferEnvelope } from "../types/transfer.ts"

const KIND_OPTIONS: Array<HistoryKind | ""> = ["", "dice", "table", "pipeline", "generator"]

type HistoryPending = { kind: "import"; envelope: TransferEnvelope } | { kind: "delete"; ids: string[] } | { kind: "clear" }

export function HistoryPage() {
  const catalog = useCatalog()
  const [keyword, setKeyword] = useState("")
  const [kind, setKind] = useState<HistoryKind | "">("")
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pending, setPending] = useState<HistoryPending | null>(null)
  const [saving, setSaving] = useState(false)
  const filterKey = `${keyword}\0${kind}\0${String(favoritesOnly)}`
  const [trackedFilter, setTrackedFilter] = useState(filterKey)
  if (trackedFilter !== filterKey) {
    setTrackedFilter(filterKey)
    setSelectedIds([])
    setPending(null)
  }

  const filtered = useMemo(
    () => filterHistory(catalog.user.history, { keyword, kind, favoritesOnly }),
    [catalog.user.history, keyword, kind, favoritesOnly],
  )

  useEffect(() => {
    if (!copiedId) return
    const timer = window.setTimeout(() => setCopiedId(null), 2000)
    return () => window.clearTimeout(timer)
  }, [copiedId])

  async function copyRecord(record: HistoryRecord) {
    setCopyError(null)
    try {
      await navigator.clipboard.writeText(record.output)
      setCopiedId(record.id)
    } catch {
      setCopiedId(null)
      setCopyError("复制失败，请手动选择结果。")
    }
  }

  async function toggleFavorite(record: HistoryRecord) {
    setActionError(null)
    const result = await catalog.setHistoryFavorite(record.id, !record.favorite)
    if (!result.ok) setActionError(result.message)
  }

  async function removeRecord(id: string) {
    setActionError(null)
    const result = await catalog.deleteHistory(id)
    if (!result.ok) setActionError(result.message)
    else {
      if (copiedId === id) setCopiedId(null)
      setSelectedIds((current) => current.filter((item) => item !== id))
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function selectFiltered() {
    if (filtered.length === 0) {
      setActionError("当前没有可选择的历史记录。")
      return
    }
    setActionError(null)
    setSelectedIds(filtered.map((record) => record.id))
  }

  function exportSelected() {
    const records = catalog.user.history.filter((record) => selectedIds.includes(record.id))
    if (records.length === 0) {
      setActionError("请先选择历史记录。")
      return
    }
    setActionError(null)
    const envelope = exportHistoryMerge(records)
    downloadJson(transferFilename(envelope), envelope)
  }

  function exportAll() {
    setActionError(null)
    const envelope = exportHistorySnapshot(catalog.user)
    downloadJson(transferFilename(envelope), envelope)
  }

  function askDeleteSelected() {
    if (selectedIds.length === 0) {
      setActionError("请先选择历史记录。")
      return
    }
    setActionError(null)
    setNotice(null)
    setPending({ kind: "delete", ids: [...selectedIds] })
  }

  async function confirmPending() {
    if (!pending || saving) return
    setSaving(true)
    setActionError(null)
    const result =
      pending.kind === "import"
        ? await catalog.importTransfer(pending.envelope)
        : pending.kind === "delete"
          ? await catalog.deleteHistoryRecords(pending.ids)
          : await catalog.clearHistory()
    setSaving(false)
    setPending(null)
    if (!result.ok) {
      setActionError(result.message)
      return
    }
    if (pending.kind === "delete") {
      const removed = new Set(pending.ids)
      setSelectedIds((current) => current.filter((id) => !removed.has(id)))
      setNotice("已删除。")
    } else if (pending.kind === "clear") {
      setSelectedIds([])
      setCopiedId(null)
      setNotice("已清空。")
    } else {
      setNotice("已导入。")
    }
  }

  return (
    <section className="page">
      <h1>历史</h1>
      <p className="lead">查看最近的骰子、抽表、链路和生成结果。可以复选后批量删除或导出。清空历史不会删除用户词条和随机表。</p>

      {catalog.status === "loading" ? <p className="note">正在读取历史…</p> : null}
      {catalog.loadError ? (
        <p className="form-error" role="alert">
          {catalog.loadError}
        </p>
      ) : null}

      {catalog.status === "ready" ? (
        <>
          <div className="filters">
            <label className="field" htmlFor="history-keyword">
              关键词
              <input id="history-keyword" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
            </label>
            <label className="field" htmlFor="history-kind">
              类型
              <select
                id="history-kind"
                value={kind}
                onChange={(event) => setKind(event.target.value as HistoryKind | "")}
              >
                {KIND_OPTIONS.map((option) => (
                  <option key={option || "all"} value={option}>
                    {option === "" ? "全部类型" : HISTORY_KIND_LABEL[option]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor="history-favorites">
              收藏
              <select
                id="history-favorites"
                value={favoritesOnly ? "favorites" : ""}
                onChange={(event) => setFavoritesOnly(event.target.value === "favorites")}
              >
                <option value="">全部记录</option>
                <option value="favorites">只看收藏</option>
              </select>
            </label>
          </div>

          <div className="inline-form">
            <button className="button button-secondary" type="button" onClick={selectFiltered}>
              全选当前结果
            </button>
            <button className="button button-secondary" type="button" onClick={() => setSelectedIds([])}>
              取消全选
            </button>
            <button className="button button-secondary" type="button" onClick={exportSelected}>
              导出所选
            </button>
            <button className="button button-secondary" type="button" onClick={askDeleteSelected}>
              删除所选
            </button>
            <button className="button button-secondary" type="button" onClick={exportAll}>
              导出全部历史
            </button>
            <ImportFileButton
              label="导入历史"
              scope="history"
              disabled={saving}
              onParsed={(envelope) => {
                setActionError(null)
                setNotice(null)
                setPending({ kind: "import", envelope })
              }}
              onError={(message) => {
                setPending(null)
                setNotice(null)
                setActionError(message)
              }}
            />
          </div>
          {selectedIds.length > 0 ? <p className="note">已选 {selectedIds.length} 条。</p> : null}
          {actionError ? (
            <p className="form-error" role="alert">
              {actionError}
            </p>
          ) : null}
          {notice ? <p className="note">{notice}</p> : null}
          {copyError ? (
            <p className="form-error" role="alert">
              {copyError}
            </p>
          ) : null}
          {pending && pending.kind !== "clear" ? (
            <ConfirmHistory pending={pending} user={catalog.user} saving={saving} onConfirm={() => void confirmPending()} onCancel={() => setPending(null)} />
          ) : null}

          {catalog.user.history.length === 0 ? (
            <p className="note">还没有历史记录。</p>
          ) : filtered.length === 0 ? (
            <p className="note">没有符合条件的历史记录。</p>
          ) : (
            <ul className="history-list">
              {filtered.map((record) => (
                <li key={record.id}>
                  <div className="history-row">
                    <input
                      className="history-check"
                      type="checkbox"
                      checked={selectedIds.includes(record.id)}
                      aria-label={`选择 ${HISTORY_KIND_LABEL[record.kind]} ${record.input}`}
                      onChange={() => toggleSelected(record.id)}
                    />
                    <div className="history-body">
                      <div className="panel-header">
                        <div>
                          <p className="dice-total-label">
                            {HISTORY_KIND_LABEL[record.kind]}
                            {record.favorite ? " · 已收藏" : ""}
                          </p>
                          <p className="table-meta">{formatHistoryTime(record.createdAt)}</p>
                        </div>
                        <div className="inline-form">
                          <button className="button button-secondary" type="button" onClick={() => void toggleFavorite(record)}>
                            {record.favorite ? "取消收藏" : "收藏"}
                          </button>
                          <button className="button button-secondary" type="button" onClick={() => void copyRecord(record)}>
                            {copiedId === record.id ? "已复制" : "复制"}
                          </button>
                          <button className="button button-secondary" type="button" onClick={() => void removeRecord(record.id)}>
                            删除
                          </button>
                        </div>
                      </div>
                      <p className="table-meta">输入：{record.input}</p>
                      <p className="history-output">{record.output}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <h2 className="section-label">清空历史</h2>
          <p className="note">只删除历史记录，用户词条和随机表会保留。</p>
          {pending?.kind === "clear" ? (
            <ConfirmHistory pending={pending} user={catalog.user} saving={saving} onConfirm={() => void confirmPending()} onCancel={() => setPending(null)} />
          ) : (
            <button
              className="button button-secondary"
              type="button"
              onClick={() => {
                setActionError(null)
                setNotice(null)
                setPending({ kind: "clear" })
              }}
            >
              清空历史
            </button>
          )}
        </>
      ) : null}
    </section>
  )
}

function ConfirmHistory({
  pending,
  user,
  saving,
  onConfirm,
  onCancel,
}: {
  pending: HistoryPending
  user: Parameters<typeof describeImport>[0]
  saving: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="inline-form">
      <p className="note transfer-status">{pendingText(pending, user)}</p>
      <button className="button" type="button" disabled={saving} onClick={onConfirm}>
        {pending.kind === "import" ? "确认导入" : pending.kind === "delete" ? "确认删除" : "确认清空"}
      </button>
      <button className="button button-secondary" type="button" disabled={saving} onClick={onCancel}>
        取消
      </button>
    </div>
  )
}

function pendingText(pending: HistoryPending, user: Parameters<typeof describeImport>[0]): string {
  if (pending.kind === "import") return describeImport(user, pending.envelope)
  if (pending.kind === "delete") return `将删除选中的 ${pending.ids.length} 条历史记录。`
  return "将清空全部历史。用户随机表、词条和生成器会保留。"
}
