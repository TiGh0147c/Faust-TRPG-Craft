import { useEffect, useMemo, useState } from "react"
import { DiceBreakdown } from "../components/DiceBreakdown.tsx"
import { ResultMarks } from "../components/ResultMarks.tsx"
import { ImportFileButton } from "../features/storage/ImportFileButton.tsx"
import { downloadJson } from "../features/storage/downloadJson.ts"
import { filterHistory, formatHistoryTime, HISTORY_KIND_LABEL } from "../features/history/filterHistory.ts"
import { splitHistoryOutput } from "../features/history/splitHistoryOutput.ts"
import { useCatalog } from "../features/storage/useCatalog.ts"
import { describeImport, exportHistoryMerge, exportHistorySnapshot, transferFilename } from "../services/storage/transfer.ts"
import type { HistoryKind, HistoryRecord } from "../types/history.ts"
import type { TransferEnvelope } from "../types/transfer.ts"

const KIND_OPTIONS: Array<HistoryKind | ""> = ["", "dice", "table", "entry", "generator", "collection", "pipeline"]
const PAGE_SIZES = [5, 10, 20, 50, 100] as const

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
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [pending, setPending] = useState<HistoryPending | null>(null)
  const [saving, setSaving] = useState(false)
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(20)
  const [page, setPage] = useState(1)
  const filterKey = `${keyword}\0${kind}\0${String(favoritesOnly)}`
  const [trackedFilter, setTrackedFilter] = useState(filterKey)
  if (trackedFilter !== filterKey) {
    setTrackedFilter(filterKey)
    setSelectedIds([])
    setPending(null)
    setPage(1)
  }
  const sizeKey = String(pageSize)
  const [trackedSize, setTrackedSize] = useState(sizeKey)
  if (trackedSize !== sizeKey) {
    setTrackedSize(sizeKey)
    setPage(1)
  }

  const filtered = useMemo(
    () => filterHistory(catalog.user.history, { keyword, kind, favoritesOnly }),
    [catalog.user.history, keyword, kind, favoritesOnly],
  )
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRecords = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => {
    if (!copiedId) return
    const timer = window.setTimeout(() => setCopiedId(null), 2000)
    return () => window.clearTimeout(timer)
  }, [copiedId])

  async function copyRecord(record: HistoryRecord) {
    setCopyError(null)
    try {
      const text = record.note ? `${record.output}\n备注：${record.note}` : record.output
      await navigator.clipboard.writeText(text)
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
      <p className="lead">查看、复制和收藏最近的结果。</p>

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

          {filtered.length > 0 ? (
            <HistoryPager
              id="history-page-size-top"
              page={currentPage}
              pageCount={pageCount}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
            />
          ) : null}

          {catalog.user.history.length === 0 ? (
            <p className="note">还没有历史记录。</p>
          ) : filtered.length === 0 ? (
            <p className="note">没有符合条件的历史记录。</p>
          ) : (
            <ul className="history-list">
              {pageRecords.map((record) => {
                const parts = splitHistoryOutput(record.output)
                const expanded = expandedIds.includes(record.id)
                const canExpand = parts.detail.length > 0 || record.diceResult !== undefined
                return (
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
                          {canExpand ? (
                            <button
                              className="button button-secondary"
                              type="button"
                              aria-expanded={expanded}
                              onClick={() =>
                                setExpandedIds((current) =>
                                  current.includes(record.id) ? current.filter((id) => id !== record.id) : [...current, record.id],
                                )
                              }
                            >
                              {expanded ? "收起" : "展开"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <p className="table-meta">输入：{record.input}</p>
                      {record.note ? <p className="table-meta">备注：{record.note}</p> : null}
                      <p className="history-output">
                        <ResultMarks text={parts.preview} />
                      </p>
                      {expanded && parts.detail ? (
                        <p className="history-output">
                          <ResultMarks text={parts.detail} />
                        </p>
                      ) : null}
                      {expanded && record.diceResult ? <DiceBreakdown result={record.diceResult} /> : null}
                    </div>
                  </div>
                </li>
                )
              })}
            </ul>
          )}

          {filtered.length > 0 ? (
            <HistoryPager
              id="history-page-size-bottom"
              page={currentPage}
              pageCount={pageCount}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
            />
          ) : null}

          <h2 className="section-label">清除所有历史记录</h2>
          <div className="action-row">
            <button
              className="button"
              type="button"
              onClick={() => {
                setActionError(null)
                setNotice(null)
                setPending({ kind: "clear" })
              }}
            >
              清除所有历史记录
            </button>
          </div>
          {pending?.kind === "clear" ? (
            <ConfirmHistory pending={pending} user={catalog.user} saving={saving} onConfirm={() => void confirmPending()} onCancel={() => setPending(null)} />
          ) : null}
        </>
      ) : null}
    </section>
  )
}

function HistoryPager({
  id,
  page,
  pageCount,
  pageSize,
  onPage,
  onPageSize,
}: {
  id: string
  page: number
  pageCount: number
  pageSize: number
  onPage: (page: number) => void
  onPageSize: (size: (typeof PAGE_SIZES)[number]) => void
}) {
  return (
    <div className="history-pager">
      <button className="button button-secondary" type="button" disabled={page <= 1} onClick={() => onPage(page - 1)}>
        上一页
      </button>
      <span>
        第 {page} / {pageCount} 页
      </span>
      <button className="button button-secondary" type="button" disabled={page >= pageCount} onClick={() => onPage(page + 1)}>
        下一页
      </button>
      <label className="field" htmlFor={id}>
        每页
        <select
          id={id}
          value={pageSize}
          onChange={(event) => onPageSize(Number(event.target.value) as (typeof PAGE_SIZES)[number])}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size} 条
            </option>
          ))}
        </select>
      </label>
    </div>
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
    <div className="action-confirm">
      <p className="note">{pendingText(pending, user)}</p>
      <div className="inline-form">
        <button className="button" type="button" disabled={saving} onClick={onConfirm}>
          {pending.kind === "import" ? "确认导入" : pending.kind === "delete" ? "确认删除" : "确认清除"}
        </button>
        <button className="button button-secondary" type="button" disabled={saving} onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  )
}

function pendingText(pending: HistoryPending, user: Parameters<typeof describeImport>[0]): string {
  if (pending.kind === "import") return describeImport(user, pending.envelope)
  if (pending.kind === "delete") return `将删除选中的 ${pending.ids.length} 条历史记录。`
  return "清除所有历史记录将清除用户所有的历史记录。"
}
