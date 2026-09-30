import { useEffect, useRef, useState } from "react"
import { HistoryNoteField } from "../components/HistoryNoteField.tsx"
import { SequenceHeadline } from "../components/ResultMarks.tsx"
import { cardClass, moveListItem, movedSelection, useCardReorder, useListFlip, useRevealRowEnd } from "../features/cards/reorder.ts"
import { collectionHistoryDraft } from "../features/history/historyDrafts.ts"
import { SchemeActions } from "../features/schemes/SchemeActions.tsx"
import {
  collectionScheme,
  defaultCollectionWorkspace,
  parseCollectionScheme,
  readCollectionWorkspace,
  writeCollectionWorkspace,
} from "../features/schemes/collectionScheme.ts"
import { downloadJson } from "../features/storage/downloadJson.ts"
import { useCatalog } from "../features/storage/useCatalog.ts"
import {
  collectionFromRange,
  drawLimited,
  drawWeightedLimited,
  formatSequence,
  readNamedItems,
  orderBySortWeight,
  readOrderCount,
} from "../utils/collection/orderCollection.ts"

type CustomItem = {
  id: string
  name: string
  weight: string
}

type OrderMode = "all" | "prefix"

type CollectionSource = "range" | "custom"

const MIN_CUSTOM_ITEMS = 1
const MAX_CUSTOM_ITEMS = 100

export function CollectionsPage() {
  const catalog = useCatalog()
  const [restored] = useState(readCollectionWorkspace)
  const [source, setSource] = useState<CollectionSource>(restored.source)
  const [start, setStart] = useState(restored.start)
  const [end, setEnd] = useState(restored.end)
  const [itemCount, setItemCount] = useState(restored.itemCount)
  const [customItems, setCustomItems] = useState<CustomItem[]>(restored.items)
  const [selectedItem, setSelectedItem] = useState(restored.selectedItem)
  const [weightDraft, setWeightDraft] = useState(restored.weightDraft)
  const [count, setCount] = useState(restored.count)
  const [limit, setLimit] = useState(restored.limit)
  const [orderMode, setOrderMode] = useState<OrderMode>(restored.orderMode)
  const [orderCount, setOrderCount] = useState(restored.orderCount)
  const [note, setNote] = useState(restored.note)
  const [schemeError, setSchemeError] = useState<string | null>(null)
  const [resultNote, setResultNote] = useState("")
  const [values, setValues] = useState<(string | number)[] | null>(null)
  const [summary, setSummary] = useState("")
  const [action, setAction] = useState<"order" | "draw" | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  useEffect(() => {
    writeCollectionWorkspace({
      source,
      start,
      end,
      itemCount,
      items: customItems,
      selectedItem,
      weightDraft,
      count,
      limit,
      orderMode,
      orderCount,
      note,
    })
  }, [source, start, end, itemCount, customItems, selectedItem, weightDraft, count, limit, orderMode, orderCount, note])

  function currentCollection() {
    if (source === "range") {
      const range = collectionFromRange(start, end)
      if (!range.ok) return range
      return { ok: true as const, names: range.values.map(String), weights: range.values.map(() => 1) }
    }
    const named = readNamedItems(customItems)
    if (!named.ok) return named
    return {
      ok: true as const,
      names: named.items.map((item) => item.name),
      weights: named.items.map((item) => item.weight),
    }
  }

  function updateItemCount(value: string) {
    setItemCount(value)
    const parsed = readItemCount(value)
    if (!parsed.ok) return
    setError(null)
    const nextItems = resizeItems(customItems, parsed.value, weightDraft)
    const index = Math.min(selectedItem, nextItems.length - 1)
    setCustomItems(nextItems)
    setSelectedItem(index)
    if (index !== selectedItem) {
      const item = nextItems[index]
      if (item) setWeightDraft(item.weight)
    }
  }

  function selectCustomItem(index: number) {
    setSelectedItem(index)
    const item = customItems[index]
    if (item) setWeightDraft(item.weight)
  }

  function updateItemName(id: string, name: string) {
    setCustomItems((current) => current.map((item) => (item.id === id ? { ...item, name } : item)))
  }

  function applyWeight(target: "current" | "all") {
    setCustomItems((current) =>
      current.map((item, index) => (target === "all" || index === selectedItem ? { ...item, weight: weightDraft } : item)),
    )
  }

  function reorderCustomItems(from: number, to: number) {
    setCustomItems((current) => moveListItem(current, from, to))
    setSelectedItem((selected) => movedSelection(selected, from, to))
  }

  function exportCollectionScheme() {
    downloadJson("自定义集合.json", collectionScheme(customItems))
  }

  function importCollectionScheme(text: string) {
    const parsed = parseCollectionScheme(text)
    if (!parsed.ok) {
      setSchemeError(parsed.message)
      return
    }
    const first = parsed.items[0]
    setSchemeError(null)
    setError(null)
    setValues(null)
    setSource("custom")
    setCustomItems(parsed.items)
    setItemCount(String(parsed.items.length))
    setSelectedItem(0)
    if (first) setWeightDraft(first.weight)
  }

  function resetCollectionScheme() {
    const next = defaultCollectionWorkspace()
    setSchemeError(null)
    setError(null)
    setValues(null)
    setCustomItems(next.items)
    setItemCount(next.itemCount)
    setSelectedItem(next.selectedItem)
    setWeightDraft(next.weightDraft)
  }

  function addCustomItem() {
    if (customItems.length >= MAX_CUSTOM_ITEMS) return
    const nextItems = [...customItems, blankItem(weightDraft)]
    setCustomItems(nextItems)
    setItemCount(String(nextItems.length))
  }

  function removeCustomItem(index: number) {
    if (customItems.length <= MIN_CUSTOM_ITEMS) return
    const nextItems = customItems.filter((_, itemIndex) => itemIndex !== index)
    const nextIndex = Math.min(index < selectedItem ? selectedItem - 1 : selectedItem, nextItems.length - 1)
    setCustomItems(nextItems)
    setItemCount(String(nextItems.length))
    setSelectedItem(nextIndex)
    if (index === selectedItem) {
      const item = nextItems[nextIndex]
      if (item) setWeightDraft(item.weight)
    }
  }

  async function finish(kind: "order" | "draw", input: string, next: (string | number)[]) {
    setError(null)
    setHistoryError(null)
    setCopied(false)
    setCopyError(null)
    const shown = note.trim()
    setAction(kind)
    setSummary(input)
    setValues(next)
    setResultNote(shown)
    const saved = await catalog.recordHistory(collectionHistoryDraft(input, next, shown, kind))
    if (!saved.ok) setHistoryError(saved.message)
  }

  async function shuffle() {
    const elements = currentCollection()
    if (!elements.ok) {
      setValues(null)
      setError(elements.message)
      return
    }
    const ordered = orderBySortWeight(elements.names, elements.weights, catalog.sortWeight)
    const base = source === "range" ? `${start.trim()}-${end.trim()}` : "自定义集合"
    if (orderMode === "all") {
      await finish("order", `${base} 随机排序`, ordered)
      return
    }
    const prefix = readOrderCount(orderCount, ordered.length)
    if (!prefix.ok) {
      setValues(null)
      setError(prefix.message)
      return
    }
    await finish("order", `${base} 随机排序前 ${prefix.value}`, ordered.slice(0, prefix.value))
  }

  async function draw() {
    const elements = currentCollection()
    if (!elements.ok) {
      setValues(null)
      setError(elements.message)
      return
    }
    const drawn =
      source === "range" ? drawLimited(elements.names.map(Number), count, limit) : drawWeightedLimited(elements.names, elements.weights, count, limit)
    if (!drawn.ok) {
      setValues(null)
      setError(drawn.message)
      return
    }
    const input =
      source === "range"
        ? `${start.trim()}-${end.trim()} 抽取 ${count.trim()}，每项最多 ${limit.trim()}`
        : `自定义集合 抽取 ${count.trim()}，每项最多 ${limit.trim()}`
    await finish("draw", input, drawn.values)
  }

  async function copyResult() {
    if (!values) return
    try {
      const body = action ? formatSequence(summary, values, action) : ""
      await navigator.clipboard.writeText(resultNote ? `${resultNote}\n${body}` : body)
      setCopyError(null)
      setCopied(true)
    } catch {
      setCopied(false)
      setCopyError("复制失败，请手动选择结果。")
    }
  }

  return (
    <section className="page">
      <h1>集合</h1>
      <p className="lead">
        打乱一段数值，或按权重排列、抽取自己加入的项目。
      </p>

      <div className="mode-choices" role="group" aria-label="集合来源">
        <button
          className="button button-secondary"
          type="button"
          aria-pressed={source === "range"}
          onClick={() => setSource("range")}
        >
          数值区间
        </button>
        <button
          className="button button-secondary"
          type="button"
          aria-pressed={source === "custom"}
          onClick={() => setSource("custom")}
        >
          自定义集合
        </button>
      </div>

      <HistoryNoteField className="note-row" id="collection-note" kind="collection" value={note} onChange={setNote} />

      {source === "range" ? (
        <div className="inline-form">
          <label className="field" htmlFor="collection-start">
            起始
            <input id="collection-start" inputMode="numeric" value={start} onChange={(event) => setStart(event.target.value)} />
          </label>
          <label className="field" htmlFor="collection-end">
            结束
            <input id="collection-end" inputMode="numeric" value={end} onChange={(event) => setEnd(event.target.value)} />
          </label>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => {
              setStart("1")
              setEnd("10")
            }}
          >
            重置
          </button>
        </div>
      ) : null}

      {source === "custom" ? (
        <CustomCollectionEditor
          count={itemCount}
          items={customItems}
          selectedItem={selectedItem}
          onCountChange={updateItemCount}
          onSelect={selectCustomItem}
          weightDraft={weightDraft}
          onNameChange={updateItemName}
          onWeightDraftChange={setWeightDraft}
          onApplyWeight={applyWeight}
          onAdd={addCustomItem}
          onRemove={removeCustomItem}
          onReorder={reorderCustomItems}
          onExportScheme={exportCollectionScheme}
          onImportScheme={importCollectionScheme}
          onResetScheme={resetCollectionScheme}
          schemeError={schemeError}
        />
      ) : null}

      <div className="mode-choices" role="group" aria-label="排序方式">
            <button
              className="button button-secondary"
              type="button"
              aria-pressed={orderMode === "all"}
              onClick={() => setOrderMode("all")}
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
              void shuffle()
            }}
          >
            {orderMode === "prefix" ? (
              <label className="field" htmlFor="collection-order-count">
                输出个数
                <input
                  id="collection-order-count"
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
          <form
            className="draw-form"
            onSubmit={(event) => {
              event.preventDefault()
              void draw()
            }}
          >
            <div className="inline-form">
            <label className="field" htmlFor="collection-count">
              抽取个数
              <input
                id="collection-count"
                type="number"
                inputMode="numeric"
                min={1}
                value={count}
                onChange={(event) => setCount(event.target.value)}
              />
            </label>
            <label className="field" htmlFor="collection-limit">
              每项最多抽取次数
              <input
                id="collection-limit"
                type="number"
                inputMode="numeric"
                min={1}
                value={limit}
                onChange={(event) => setLimit(event.target.value)}
              />
            </label>
            </div>
            <button className="button" type="submit">
              元素抽取
            </button>
      </form>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {values && action ? (
        <section className="panel" aria-live="polite">
          <div className="panel-header result-header">
            <div>
              <p className="dice-total-label">最终结果</p>
              <p className="dice-total">
                <SequenceHeadline action={action} values={values} />
              </p>
              {resultNote ? <p className="result-note">{resultNote}</p> : null}
            </div>
            <button className="button button-secondary" type="button" onClick={() => void copyResult()}>
              {copied ? "已复制" : "复制"}
            </button>
          </div>
          {copyError ? <p className="form-error">{copyError}</p> : null}
          <h3 className="section-label">每一项</h3>
          <ul className="dice-rolls">
            {values.map((value, index) => (
              <li key={`${value}-${index}`}>{value}</li>
            ))}
          </ul>
          {historyError ? (
            <p className="form-error" role="alert">
              没有写入历史。{historyError}
            </p>
          ) : null}
        </section>
      ) : null}
    </section>
  )
}

function CustomCollectionEditor({
  count,
  items,
  selectedItem,
  onCountChange,
  onSelect,
  weightDraft,
  onNameChange,
  onWeightDraftChange,
  onApplyWeight,
  onAdd,
  onRemove,
  onReorder,
  onExportScheme,
  onImportScheme,
  onResetScheme,
  schemeError,
}: {
  count: string
  items: CustomItem[]
  selectedItem: number
  onCountChange: (value: string) => void
  onSelect: (index: number) => void
  weightDraft: string
  onNameChange: (id: string, name: string) => void
  onWeightDraftChange: (value: string) => void
  onApplyWeight: (target: "current" | "all") => void
  onAdd: () => void
  onRemove: (index: number) => void
  onReorder: (from: number, to: number) => void
  onExportScheme: () => void
  onImportScheme: (text: string) => void
  onResetScheme: () => void
  schemeError: string | null
}) {
  const selected = items[selectedItem]
  const weightTotal = collectionWeightTotal(items)
  const cardsRef = useRef<HTMLDivElement>(null)
  useListFlip(cardsRef)
  useRevealRowEnd(cardsRef, items.length)
  const cardDrag = useCardReorder(onReorder)

  return (
    <>
      <label className="field compare-count" htmlFor="collection-size">
        元素数量
        <input
          id="collection-size"
          type="number"
          inputMode="numeric"
          min={MIN_CUSTOM_ITEMS}
          max={MAX_CUSTOM_ITEMS}
          value={count}
          onChange={(event) => onCountChange(event.target.value)}
        />
      </label>
      <div className="compare-cards" ref={cardsRef}>
        {items.map((item, index) => (
          <div
            key={item.id}
            className={cardClass(selectedItem === index, cardDrag.dragging === index)}
            data-card-index={index}
            data-card-key={item.id}
            onPointerDown={(event) => cardDrag.onPointerDown(index, event)}
          >
            {items.length > MIN_CUSTOM_ITEMS ? (
              <button
                className="button button-secondary compare-card-remove"
                type="button"
                aria-label={`删除${itemLabel(item, index)}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onRemove(index)}
              >
                删除
              </button>
            ) : null}
            <button
              className={items.length > MIN_CUSTOM_ITEMS ? "compare-card-select has-remove" : "compare-card-select"}
              type="button"
              aria-pressed={selectedItem === index}
              onClick={() => onSelect(index)}
            >
              <span className="compare-card-name">
                <span className="compare-card-index">{index + 1}.</span>
                <span>{item.name.trim() || itemLabel(item, index)}</span>
              </span>
              <span className="compare-card-meta">{formatWeightShare(item.weight, weightTotal)}</span>
            </button>
          </div>
        ))}
        {items.length < MAX_CUSTOM_ITEMS ? (
          <button className="compare-card compare-card-add" type="button" onClick={onAdd}>
            <span className="compare-card-plus">+</span>
            <span>添加元素</span>
          </button>
        ) : null}
      </div>
      {selected ? (
        <div className="compare-editor">
          <h2 className="section-label">正在编辑 {itemLabel(selected, selectedItem)}</h2>
          <label className="field" htmlFor="collection-selected-name">
            元素名
            <input
              id="collection-selected-name"
              placeholder={itemLabel(selected, selectedItem)}
              value={selected.name}
              onChange={(event) => onNameChange(selected.id, event.target.value)}
            />
          </label>
          <div className="collection-apply-row">
            <label className="field" htmlFor="collection-selected-weight">
              权重
              <input
                id="collection-selected-weight"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={weightDraft}
                onChange={(event) => onWeightDraftChange(event.target.value)}
              />
            </label>
            <div className="compare-apply">
              <button className="button" type="button" onClick={() => onApplyWeight("current")}>
                应用到当前元素
              </button>
              <button className="button" type="button" onClick={() => onApplyWeight("all")}>
                应用到全部元素
              </button>
            </div>
          </div>
          <SchemeActions onExport={onExportScheme} onImportText={onImportScheme} onReset={onResetScheme} error={schemeError} />
        </div>
      ) : null}
    </>
  )
}

function blankItem(weight = "1"): CustomItem {
  return { id: crypto.randomUUID(), name: "", weight }
}

function resizeItems(current: CustomItem[], count: number, weight: string): CustomItem[] {
  if (count === current.length) return current
  if (count < current.length) return current.slice(0, count)
  const added = Array.from({ length: count - current.length }, () => blankItem(weight))
  return [...current, ...added]
}

function readItemCount(input: string): { ok: true; value: number } | { ok: false; message: string } {
  const trimmed = input.trim()
  if (!/^\d+$/.test(trimmed)) return { ok: false, message: "元素数量至少为 1。" }
  const value = Number(trimmed)
  if (!Number.isSafeInteger(value) || value < MIN_CUSTOM_ITEMS) return { ok: false, message: "元素数量至少为 1。" }
  if (value > MAX_CUSTOM_ITEMS) return { ok: false, message: `元素数量不能超过 ${MAX_CUSTOM_ITEMS}。` }
  return { ok: true, value }
}

function itemLabel(item: CustomItem, index: number): string {
  return item.name.trim() || `元素 ${index + 1}`
}

function collectionWeightTotal(items: readonly CustomItem[]): number {
  return items.reduce((sum, item) => {
    const value = Number(item.weight.trim())
    return Number.isFinite(value) && value > 0 ? sum + value : sum
  }, 0)
}

function formatWeightShare(weight: string, total: number): string {
  const shown = weight.trim() || "—"
  if (!(total > 0)) return shown
  return `${shown} / ${total}`
}
