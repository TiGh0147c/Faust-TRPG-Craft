import { useEffect, useState, type ReactNode } from "react"
import { SourceColumn } from "../components/SourceColumn.tsx"
import { tableHistoryDraft } from "../features/history/historyDrafts.ts"
import { RecordTransferButtons } from "../features/storage/RecordTransferButtons.tsx"
import { useCatalog } from "../features/storage/useCatalog.ts"
import { TableEditor } from "../features/tables/TableEditor.tsx"
import { useRandomTables } from "../features/tables/useRandomTables.ts"
import type { TableDraft } from "../services/storage/mutateUserData.ts"
import type { RandomTable } from "../types/table.ts"
import { resolveLinkedEntry, type LinkedEntry } from "../utils/entry/index.ts"
import { formatTableResult } from "../utils/table/index.ts"

const MODE_LABEL = {
  range: "数值区间",
  weight: "权重",
  uniform: "等概率",
} as const

export function TablesPage() {
  const tables = useRandomTables()
  const catalog = useCatalog()
  const linked = resolveLinkedEntry(
    tables.result?.entryId,
    catalog.status === "ready" ? catalog.entries : null,
  )
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [editor, setEditor] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function openTable(id: string | undefined) {
    if (!id) return
    setFormError(null)
    setEditor(id)
  }

  async function saveTable(draft: TableDraft) {
    if (saving) return
    setSaving(true)
    setFormError(null)
    const previous = new Set(catalog.user.tables.map((table) => table.id))
    const result =
      editor !== null && editor !== "new" ? await catalog.updateTable(editor, draft) : await catalog.createTable(draft)
    setSaving(false)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    const created = result.data.tables.find((table) => !previous.has(table.id))
    const nextId = created?.id ?? (editor !== "new" ? editor : null)
    setEditor(null)
    if (nextId) tables.select(nextId)
  }

  async function removeTable(id: string | undefined) {
    if (!id || saving) return
    setSaving(true)
    setFormError(null)
    const result = await catalog.deleteTable(id)
    setSaving(false)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    setEditor(null)
    const fallback = result.data.tables[0]?.id ?? (catalog.showBuiltin ? catalog.builtin.tables[0]?.id : undefined)
    if (fallback) tables.select(fallback)
  }

  async function recordTable(source: "match" | "draw") {
    setCopied(false)
    setCopyError(null)
    setHistoryError(null)
    const outcome = source === "match" ? tables.matchSelected() : tables.drawSelected()
    if (!outcome || !outcome.ok) return
    const linkedNow = resolveLinkedEntry(outcome.result.entryId, catalog.status === "ready" ? catalog.entries : null)
    const entry = linkedNow.status === "found" ? linkedNow.entry : undefined
    const saved = await catalog.recordHistory(tableHistoryDraft(outcome.result, entry, source))
    if (!saved.ok) setHistoryError(saved.message)
  }

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copyResult() {
    if (!tables.result) return
    try {
      await navigator.clipboard.writeText(
        formatTableResult(tables.result, linked.status === "found" ? linked.entry : undefined),
      )
      setCopyError(null)
      setCopied(true)
    } catch {
      setCopied(false)
      setCopyError("复制失败，请手动选择结果。")
    }
  }

  return (
    <section className="page">
      <h1>随机表</h1>
      <p className="lead">按数值区间、权重或等概率抽取结果。内置表只读，用户表可以在这里添加和修改。成功的结果会写入历史。</p>

      <div className="filters">
        <label className="field" htmlFor="table-keyword">
          关键词
          <input
            id="table-keyword"
            value={tables.keyword}
            onChange={(event) => tables.setKeyword(event.target.value)}
          />
        </label>
        <label className="field" htmlFor="table-category">
          分类
          <select
            id="table-category"
            value={tables.category}
            onChange={(event) => tables.setCategory(event.target.value)}
          >
            <option value="">全部分类</option>
            {tables.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="table-tag">
          标签
          <select id="table-tag" value={tables.tag} onChange={(event) => tables.setTag(event.target.value)}>
            <option value="">全部标签</option>
            {tables.tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      </div>

      {tables.status === "loading" ? <p className="note">正在读取随机表…</p> : null}
      {tables.loadError ? (
        <p className="form-error" role="alert">
          {tables.loadError}
        </p>
      ) : null}

      {tables.status === "ready" ? (
        <div className="table-workspace">
          <SourceColumn
            items={tables.filtered}
            showBuiltin={catalog.showBuiltin}
            userNote={
              catalog.tables.some((table) => table.origin === "user") &&
              !tables.filtered.some((table) => table.origin === "user")
                ? "没有符合条件的用户随机表。"
                : "还没有用户随机表。"
            }
            createLabel="新建随机表"
            onCreate={() => {
              setFormError(null)
              setEditor("new")
            }}
            renderItem={(table) => (
              <button
                type="button"
                aria-pressed={editor === null && tables.selected?.id === table.id}
                onClick={() => {
                  setHistoryError(null)
                  setFormError(null)
                  setEditor(null)
                  tables.select(table.id)
                }}
              >
                <strong>{table.name}</strong>
                <span>{MODE_LABEL[table.mode]}</span>
              </button>
            )}
          />

          {editor !== null ? (
            <TableEditor
              key={editor}
              initial={editor === "new" ? null : (catalog.user.tables.find((table) => table.id === editor) ?? null)}
              entries={catalog.entries}
              saving={saving}
              error={formError}
              onCancel={() => {
                setEditor(null)
                setFormError(null)
              }}
              onSubmit={(draft) => void saveTable(draft)}
            />
          ) : tables.selected ? (
            <TableDetail
              actions={
                tables.selected.origin === "user" ? (
                  <div className="inline-form">
                    <TableTransfer tableId={tables.selected.id} />
                    <button className="button button-secondary" type="button" onClick={() => openTable(tables.selected?.id)}>
                      编辑
                    </button>
                    <button
                      className="button button-secondary"
                      type="button"
                      onClick={() => void removeTable(tables.selected?.id)}
                    >
                      删除
                    </button>
                  </div>
                ) : null
              }
              table={tables.selected}
              rangeInput={tables.rangeInput}
              onRangeInput={tables.setRangeInput}
              onMatch={() => void recordTable("match")}
              onDraw={() => void recordTable("draw")}
              resultText={tables.result?.text ?? null}
              resultRowId={tables.result?.rowId ?? null}
              resultValue={tables.result?.value}
              resultMin={tables.result?.min}
              resultMax={tables.result?.max}
              actionError={tables.actionError}
              copied={copied}
              copyError={copyError}
              onCopy={() => void copyResult()}
              linked={linked}
              entryLoadError={catalog.status === "error" ? catalog.loadError : null}
              historyError={historyError}
              formError={formError}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

type TableDetailProps = {
  actions?: ReactNode
  formError?: string | null
  table: RandomTable
  rangeInput: string
  onRangeInput: (value: string) => void
  onMatch: () => void
  onDraw: () => void
  resultText: string | null
  resultRowId: string | null
  resultValue: number | undefined
  resultMin: number | undefined
  resultMax: number | undefined
  actionError: string | null
  copied: boolean
  copyError: string | null
  onCopy: () => void
  linked: LinkedEntry
  entryLoadError: string | null
  historyError: string | null
}

function TableDetail({
  actions,
  formError,
  table,
  rangeInput,
  onRangeInput,
  onMatch,
  onDraw,
  resultText,
  resultRowId,
  resultValue,
  resultMin,
  resultMax,
  actionError,
  copied,
  copyError,
  onCopy,
  linked,
  entryLoadError,
  historyError,
}: TableDetailProps) {
  return (
    <article className="panel">
      <div className="panel-header">
        <h2>{table.name}</h2>
        {actions}
      </div>
      {formError ? (
        <p className="form-error" role="alert">
          {formError}
        </p>
      ) : null}
      <p className="lead">{table.description}</p>
      <p className="table-meta">
        {MODE_LABEL[table.mode]} · {table.category}
        {table.tags.length > 0 ? ` · ${table.tags.join("、")}` : ""}
      </p>
      <ul className="table-entry-list">
        {table.entries.map((entry) => (
          <li key={entry.id} className={entry.id === resultRowId ? "is-match" : undefined}>
            <span>{rowLabel(entry)}</span>
            <span>{entry.text}</span>
          </li>
        ))}
      </ul>

      {table.mode === "range" ? (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault()
            onMatch()
          }}
        >
          <label className="field" htmlFor="table-value">
            数值
            <input
              id="table-value"
              inputMode="numeric"
              value={rangeInput}
              onChange={(event) => onRangeInput(event.target.value)}
            />
          </label>
          <button className="button" type="submit">
            匹配
          </button>
          <button className="button button-secondary" type="button" onClick={onDraw}>
            随机抽取
          </button>
        </form>
      ) : (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault()
            onDraw()
          }}
        >
          <button className="button" type="submit">
            随机抽取
          </button>
        </form>
      )}

      {actionError ? (
        <p className="form-error" role="alert">
          {actionError}
        </p>
      ) : null}

      {resultText ? (
        <section aria-live="polite">
          <div className="panel-header">
            <div>
              <p className="dice-total-label">结果</p>
              <p className="table-result-text">{resultText}</p>
            </div>
            <button className="button button-secondary" type="button" onClick={onCopy}>
              {copied ? "已复制" : "复制"}
            </button>
          </div>
          {copyError ? <p className="form-error">{copyError}</p> : null}
          {resultValue !== undefined && resultMin !== undefined && resultMax !== undefined ? (
            <dl className="dice-meta">
              <div>
                <dt>数值</dt>
                <dd>{resultValue}</dd>
              </div>
              <div>
                <dt>区间</dt>
                <dd>
                  {resultMin}-{resultMax}
                </dd>
              </div>
            </dl>
          ) : null}
          {linked.status === "loading" && !entryLoadError ? <p className="note">正在读取关联词条…</p> : null}
          {linked.status === "loading" && entryLoadError ? (
            <p className="form-error" role="alert">
              {entryLoadError}
            </p>
          ) : null}
          {linked.status === "missing" ? (
            <p className="form-error" role="alert">
              未找到关联词条（{linked.entryId}）。
            </p>
          ) : null}
          {linked.status === "found" ? (
            <div className="linked-entry">
              <p className="dice-total-label">关联词条</p>
              <p className="table-result-text">{linked.entry.name}</p>
              <p className="entry-content">{linked.entry.content}</p>
            </div>
          ) : null}
          {historyError ? (
            <p className="form-error" role="alert">
              没有写入历史。{historyError}
            </p>
          ) : null}
        </section>
      ) : null}
    </article>
  )
}

function TableTransfer({ tableId }: { tableId: string }) {
  const catalog = useCatalog()
  const table = catalog.user.tables.find((item) => item.id === tableId)
  if (!table) return null
  return <RecordTransferButtons scope="tables" record={table} />
}

function rowLabel(entry: RandomTable["entries"][number]): string {
  if ("min" in entry && "max" in entry) return `${entry.min}-${entry.max}`
  if ("weight" in entry) return `权重 ${entry.weight}`
  return "等概率"
}
