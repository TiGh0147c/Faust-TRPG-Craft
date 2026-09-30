import { useEffect, useState, type ReactNode } from "react"
import { DiceBreakdown } from "../components/DiceBreakdown.tsx"
import { HistoryNoteField } from "../components/HistoryNoteField.tsx"
import { SourceColumn } from "../components/SourceColumn.tsx"
import { useDiceRoll } from "../features/dice/useDiceRoll.ts"
import { sequenceSummary, tableHistoryDraft, tableSequenceHistoryDraft } from "../features/history/historyDrafts.ts"
import { RecordTransferButtons } from "../features/storage/RecordTransferButtons.tsx"
import { useCatalog } from "../features/storage/useCatalog.ts"
import { TableEditor } from "../features/tables/TableEditor.tsx"
import { useRandomTables } from "../features/tables/useRandomTables.ts"
import type { TableDraft } from "../services/storage/mutateUserData.ts"
import type { RandomTable } from "../types/table.ts"
import { resolveLinkedEntry, type LinkedEntry } from "../utils/entry/index.ts"
import { formatSequence, readOrderCount } from "../utils/collection/orderCollection.ts"
import { MAX_DIE_SIDES, formatDiceResult } from "../utils/dice/index.ts"
import { assignedRanges, formatAssignedSpan, formatTableResult } from "../utils/table/index.ts"
import type { DiceRollResult } from "../types/dice.ts"
import type { HistoryRecord } from "../types/history.ts"
import type { TableSequenceResult } from "../types/table.ts"

type TableDrawMode = "match" | "random" | "expression"

const MODE_LABEL = {
  range: "数值区间",
  collection: "集合",
} as const

function isTableSequenceRecord(record: HistoryRecord): boolean {
  return record.input.includes("随机排序") || record.input.includes("每项最多")
}

function isRandomDrawRecord(record: HistoryRecord): boolean {
  return record.input === "随机抽取" || record.input.startsWith("随机抽取 ")
}

function tableNoteMatches(mode: TableDrawMode): (record: HistoryRecord) => boolean {
  if (mode === "expression") return (record) => record.diceResult !== undefined
  if (mode === "random") return (record) => isRandomDrawRecord(record)
  return (record) => record.diceResult === undefined && !isTableSequenceRecord(record) && !isRandomDrawRecord(record)
}

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
  const [note, setNote] = useState("")
  const [resultNote, setResultNote] = useState("")
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
    const shown = note.trim()
    setResultNote(shown)
    const saved = await catalog.recordHistory(tableHistoryDraft(outcome.result, entry, source, "", shown))
    if (!saved.ok) setHistoryError(saved.message)
  }

  async function recordExpression(expression: string) {
    setCopied(false)
    setCopyError(null)
    setHistoryError(null)
    const outcome = tables.rollExpressionSelected(expression)
    if (!outcome || !outcome.ok) return
    const linkedNow = resolveLinkedEntry(outcome.result.entryId, catalog.status === "ready" ? catalog.entries : null)
    const entry = linkedNow.status === "found" ? linkedNow.entry : undefined
    const shown = note.trim()
    setResultNote(shown)
    const saved = await catalog.recordHistory(
      tableHistoryDraft(outcome.result, entry, "expression", outcome.dice.expression, shown, outcome.dice),
    )
    if (!saved.ok) setHistoryError(saved.message)
  }

  async function recordSequence(
    action: "order" | "draw",
    ids: readonly string[],
    count = "1",
    limit = "1",
    prefix?: number,
  ) {
    setCopied(false)
    setCopyError(null)
    setHistoryError(null)
    const outcome = action === "order" ? tables.orderSelected(ids, prefix) : tables.drawRowsSelected(count, limit, ids)
    if (!outcome || !outcome.ok) return
    const shown = note.trim()
    setResultNote(shown)
    const saved = await catalog.recordHistory(tableSequenceHistoryDraft(outcome.result, shown))
    if (!saved.ok) setHistoryError(saved.message)
  }

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copyResult() {
    const sequence = tables.sequence
    const rolled = tables.result
    if (!sequence && !rolled) return
    try {
      const text = sequence
        ? withNote(formatSequence(sequenceSummary(sequence), sequence.rows.map((row) => row.text)), resultNote, "first")
        : rolled
          ? withNote(
              tables.expressionDice
                ? `${formatTableResult(rolled, linked.status === "found" ? linked.entry : undefined)}\n${formatDiceResult(tables.expressionDice)}`
                : formatTableResult(rolled, linked.status === "found" ? linked.entry : undefined),
              resultNote,
              "after-result",
            )
          : ""
      await navigator.clipboard.writeText(text)
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
      <p className="lead">
        按数值匹配或抽取，也可以按权重排序和抽取。
      </p>

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
              key={tables.selected.id}
              table={tables.selected}
              note={note}
              onNote={setNote}
              onExpression={(expression) => void recordExpression(expression)}
              onOrder={(ids, prefix) => void recordSequence("order", ids, "1", "1", prefix)}
              onDrawRows={(count, limit, ids) => void recordSequence("draw", ids, count, limit)}
              expressionDice={tables.expressionDice}
              sequence={tables.sequence}
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
              resultNote={resultNote}
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
  note: string
  onNote: (value: string) => void
  onExpression: (expression: string) => void
  onOrder: (ids: readonly string[], prefix?: number) => void
  onDrawRows: (count: string, limit: string, ids: readonly string[]) => void
  expressionDice: DiceRollResult | null
  sequence: TableSequenceResult | null
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
  resultNote: string
}

function TableDetail({
  actions,
  formError,
  table,
  note,
  onNote,
  onExpression,
  onOrder,
  onDrawRows,
  expressionDice,
  sequence,
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
  resultNote,
}: TableDetailProps) {
  const dice = useDiceRoll()
  const [mode, setMode] = useState<TableDrawMode | "">("")
  const [drawCount, setDrawCount] = useState("1")
  const [drawLimit, setDrawLimit] = useState("1")
  const [orderMode, setOrderMode] = useState<"all" | "prefix">("all")
  const [orderCount, setOrderCount] = useState("1")
  const [orderError, setOrderError] = useState<string | null>(null)
  const [included, setIncluded] = useState<string[]>(() =>
    table.mode === "collection" ? table.entries.map((entry) => entry.id) : [],
  )
  const weightTotal = table.mode === "collection" ? table.entries.reduce((sum, entry) => sum + entry.weight, 0) : 0
  const assigned = table.mode === "range" ? assignedRanges(table) : null
  const matchedIds = new Set(sequence ? sequence.rows.map((row) => row.id) : resultRowId ? [resultRowId] : [])
  const sequenceLabel = sequence ? sequenceSummary(sequence) : ""

  function chooseMode(next: TableDrawMode) {
    setMode(next)
  }

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
      <ul className={table.mode === "collection" ? "table-entry-list weight-list" : "table-entry-list"}>
        {table.entries.map((entry) => (
          <li key={entry.id} className={matchedIds.has(entry.id) ? "is-match" : undefined}>
            <span>{rowLabel(entry, weightTotal)}</span>
            <span>{entry.text}</span>
          </li>
        ))}
      </ul>

      {assigned && !assigned.ok ? <p className="note">{assigned.message}</p> : null}

      {table.mode === "collection" ? (
        <>
          <HistoryNoteField
            className="note-row"
            id="table-note"
            kind="table"
            matches={isTableSequenceRecord}
            value={note}
            onChange={onNote}
          />
          <div className="choice-cards" role="group" aria-label="参与排序和抽取的项目">
            {table.entries.map((entry) => (
              <label key={entry.id} className={included.includes(entry.id) ? "choice-card is-selected" : "choice-card"}>
                <input
                  type="checkbox"
                  checked={included.includes(entry.id)}
                  onChange={() =>
                    setIncluded((current) =>
                      current.includes(entry.id) ? current.filter((id) => id !== entry.id) : [...current, entry.id],
                    )
                  }
                />
                <span>{entry.text}</span>
              </label>
            ))}
          </div>
          <div className="mode-choices" role="group" aria-label="排序方式">
            <button
              className="button button-secondary"
              type="button"
              aria-pressed={orderMode === "all"}
              onClick={() => {
                setOrderError(null)
                setOrderMode("all")
              }}
            >
              全随机排序
            </button>
            <button
              className="button button-secondary"
              type="button"
              aria-pressed={orderMode === "prefix"}
              onClick={() => setOrderMode("prefix")}
            >
              只输出前 n 个
            </button>
          </div>
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault()
              if (orderMode === "all") {
                setOrderError(null)
                onOrder(included)
                return
              }
              const parsed = readOrderCount(orderCount, included.length)
              if (!parsed.ok) {
                setOrderError(parsed.message)
                return
              }
              setOrderError(null)
              onOrder(included, parsed.value)
            }}
          >
            {orderMode === "prefix" ? (
              <label className="field" htmlFor="table-order-count">
                输出个数
                <input
                  id="table-order-count"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={orderCount}
                  onChange={(event) => setOrderCount(event.target.value)}
                />
              </label>
            ) : null}
            <button className="button" type="submit">
              随机排序
            </button>
          </form>
          {orderError ? (
            <p className="form-error" role="alert">
              {orderError}
            </p>
          ) : null}
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault()
              onDrawRows(drawCount, drawLimit, included)
            }}
          >
            <label className="field" htmlFor="table-draw-count">
              抽取个数
              <input
                id="table-draw-count"
                type="number"
                inputMode="numeric"
                min={1}
                value={drawCount}
                onChange={(event) => setDrawCount(event.target.value)}
              />
            </label>
            <label className="field" htmlFor="table-draw-limit">
              每项最多抽取次数
              <input
                id="table-draw-limit"
                type="number"
                inputMode="numeric"
                min={1}
                value={drawLimit}
                onChange={(event) => setDrawLimit(event.target.value)}
              />
            </label>
            <button className="button button-secondary" type="submit">
              抽取
            </button>
          </form>
        </>
      ) : (
      <>
      <div className="mode-choices" role="group" aria-label="抽取方式">
        <button className="button button-secondary" type="button" aria-pressed={mode === "match"} onClick={() => chooseMode("match")}>
          数值匹配
        </button>
        <button className="button button-secondary" type="button" aria-pressed={mode === "random"} onClick={() => chooseMode("random")}>
          随机抽取
        </button>
        <button
          className="button button-secondary"
          type="button"
          aria-pressed={mode === "expression"}
          onClick={() => chooseMode("expression")}
        >
          表达式
        </button>
      </div>

      {mode === "" ? <p className="note">先选择数值匹配、随机抽取或表达式。</p> : (
        <HistoryNoteField
          className="note-row"
          id="table-note"
          kind="table"
          matches={tableNoteMatches(mode)}
          value={note}
          onChange={onNote}
        />
      )}

      {mode === "match" ? (
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
        </form>
      ) : null}

      {mode === "random" ? (
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault()
            onDraw()
          }}
        >
          <button className="button" type="submit">
            抽取
          </button>
        </form>
      ) : null}

      {mode === "expression" ? (
        <form
            className="stacked-form"
            onSubmit={(event) => {
              event.preventDefault()
              onExpression(dice.expression)
            }}
          >
            <label className="field" htmlFor="table-expression">
              表达式
              <input
                id="table-expression"
                value={dice.expression}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => dice.setExpression(event.target.value)}
              />
            </label>
            <div className="inline-form expression-fields">
              <label className="field" htmlFor="table-sides">
                自定义面数
                <input
                  id="table-sides"
                  type="number"
                  inputMode="numeric"
                  min={2}
                  max={MAX_DIE_SIDES}
                  value={dice.customSides}
                  onChange={(event) => dice.setCustomSides(event.target.value)}
                />
              </label>
              <label className="field" htmlFor="table-count">
                投掷颗数
                <input
                  id="table-count"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={dice.customCount}
                  onChange={(event) => dice.setCustomCount(event.target.value)}
                />
              </label>
              <label className="field" htmlFor="table-modifier">
                数值补正
                <input
                  id="table-modifier"
                  type="number"
                  inputMode="numeric"
                  value={dice.customModifier}
                  onChange={(event) => dice.setCustomModifier(event.target.value)}
                />
              </label>
            </div>
            <button className="button" type="submit">
              抽取
            </button>
          </form>
      ) : null}
      </>
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
              {resultNote ? <p className="result-note">{resultNote}</p> : null}
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
                  {formatAssignedSpan(resultMin, resultMax)}
                </dd>
              </div>
            </dl>
          ) : null}
          {expressionDice ? <DiceBreakdown result={expressionDice} /> : null}
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

      {sequence ? (
        <section className="panel" aria-live="polite">
          {resultNote ? <p className="result-note">{resultNote}</p> : null}
          <div className="panel-header">
            <p className="dice-total-label">{sequence.action === "order" ? "随机排序" : "抽取结果"}</p>
            <button className="button button-secondary" type="button" onClick={onCopy}>
              {copied ? "已复制" : "复制"}
            </button>
          </div>
          {copyError ? <p className="form-error">{copyError}</p> : null}
          <p className="dice-expression">{sequenceLabel}</p>
          <h3 className="section-label">每一项</h3>
          <ul className="dice-rolls">
            {sequence.rows.map((row, index) => (
              <li key={`${row.id}-${index}`}>{row.text}</li>
            ))}
          </ul>
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

function withNote(text: string, note: string, placement: "first" | "after-result"): string {
  if (!note) return text
  if (placement === "first") return `${note}\n${text}`
  const lines = text.split("\n")
  const index = lines.findIndex((line) => line.startsWith("结果："))
  lines.splice(index >= 0 ? index + 1 : lines.length, 0, note)
  return lines.join("\n")
}

function rowLabel(entry: RandomTable["entries"][number], weightTotal: number): string {
  if ("weight" in entry) return `${entry.weight} / ${weightTotal}`
  if ("min" in entry && "max" in entry) return formatAssignedSpan(entry.min, entry.max)
  return ""
}
