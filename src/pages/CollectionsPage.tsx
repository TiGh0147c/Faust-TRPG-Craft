import { useEffect, useState } from "react"
import { HistoryNoteField } from "../components/HistoryNoteField.tsx"
import { collectionHistoryDraft } from "../features/history/historyDrafts.ts"
import { useCatalog } from "../features/storage/useCatalog.ts"
import {
  collectionFromRange,
  MAX_COLLECTION_SIZE,
  drawLimited,
  drawWeightedLimited,
  formatSequence,
  readNamedItems,
  readOrderCount,
  shuffleByWeight,
} from "../utils/collection/orderCollection.ts"

type CustomItem = {
  id: string
  name: string
  weight: string
}

type OrderMode = "all" | "prefix"

type CollectionSource = "range" | "custom"

export function CollectionsPage() {
  const catalog = useCatalog()
  const [source, setSource] = useState<CollectionSource | "">("")
  const [start, setStart] = useState("1")
  const [end, setEnd] = useState("10")
  const [itemName, setItemName] = useState("")
  const [itemWeight, setItemWeight] = useState("1")
  const [customItems, setCustomItems] = useState<CustomItem[]>([])
  const [count, setCount] = useState("1")
  const [limit, setLimit] = useState("1")
  const [orderMode, setOrderMode] = useState<OrderMode>("all")
  const [orderCount, setOrderCount] = useState("1")
  const [note, setNote] = useState("")
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

  function currentCollection() {
    if (source === "range") {
      const range = collectionFromRange(start, end)
      if (!range.ok) return range
      return { ok: true as const, names: range.values.map(String), weights: range.values.map(() => 1) }
    }
    if (source === "custom") {
      const named = readNamedItems(customItems)
      if (!named.ok) return named
      return {
        ok: true as const,
        names: named.items.map((item) => item.name),
        weights: named.items.map((item) => item.weight),
      }
    }
    return { ok: false as const, message: "先选择数值区间或自定义集合。" }
  }

  function addItem() {
    const name = itemName.trim()
    if (name === "") {
      setError("请输入元素名。")
      return
    }
    const parsed = readNamedItems([{ name, weight: itemWeight }])
    if (!parsed.ok) {
      setError(parsed.message)
      return
    }
    if (customItems.length + 1 > MAX_COLLECTION_SIZE) {
      setError("元素太多，无法生成。")
      return
    }
    setCustomItems((current) => [...current, { id: crypto.randomUUID(), name, weight: itemWeight.trim() }])
    setItemName("")
    setItemWeight("1")
    setError(null)
  }

  function updateCustomItem(id: string, patch: Partial<Pick<CustomItem, "name" | "weight">>) {
    setCustomItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function removeCustomItem(id: string) {
    setCustomItems((current) => current.filter((item) => item.id !== id))
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
    const saved = await catalog.recordHistory(collectionHistoryDraft(input, next, shown))
    if (!saved.ok) setHistoryError(saved.message)
  }

  async function shuffle() {
    const elements = currentCollection()
    if (!elements.ok) {
      setValues(null)
      setError(elements.message)
      return
    }
    const ordered = shuffleByWeight(elements.names, elements.weights)
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
      const body = formatSequence(summary, values)
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
        先选择数值区间或自定义集合。数值区间按整数生成。自定义集合逐项加入元素名和权重，列表里可以修改或删除。然后可以填写备注，再打乱集合，或指定抽取个数并限制每个元素最多出现的次数。
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

      {source === "" ? <p className="note">先选择数值区间或自定义集合。</p> : null}

      {source !== "" ? (
        <HistoryNoteField className="note-row" id="collection-note" kind="collection" value={note} onChange={setNote} />
      ) : null}

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
        </div>
      ) : null}

      {source === "custom" ? (
        <div className="collection-editor">
          <div className="collection-editor-head">
            <span>元素名</span>
            <span>权重</span>
          </div>
          {customItems.length > 0 ? (
            <ul className="collection-editor-list">
              {customItems.map((item) => (
                <li key={item.id} className="collection-editor-row">
                  <input
                    aria-label="元素名"
                    value={item.name}
                    onChange={(event) => updateCustomItem(item.id, { name: event.target.value })}
                  />
                  <input
                    aria-label="权重"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    value={item.weight}
                    onChange={(event) => updateCustomItem(item.id, { weight: event.target.value })}
                  />
                  <button className="button button-secondary" type="button" onClick={() => removeCustomItem(item.id)}>
                    删除
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          <form
            className="collection-editor-row"
            onSubmit={(event) => {
              event.preventDefault()
              addItem()
            }}
          >
            <input
              id="collection-item-name"
              aria-label="元素名"
              value={itemName}
              onChange={(event) => setItemName(event.target.value)}
            />
            <input
              id="collection-item-weight"
              aria-label="权重"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={itemWeight}
              onChange={(event) => setItemWeight(event.target.value)}
            />
            <button className="button" type="submit">
              加入
            </button>
          </form>
        </div>
      ) : null}

      {source !== "" ? (
        <>
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
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault()
              void draw()
            }}
          >
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
            <button className="button button-secondary" type="submit">
              抽取
            </button>
          </form>
        </>
      ) : null}

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {values ? (
        <section className="panel" aria-live="polite">
          {resultNote ? <p className="result-note">{resultNote}</p> : null}
          <div className="panel-header">
            <p className="dice-total-label">{action === "order" ? "随机排序" : "抽取结果"}</p>
            <button className="button button-secondary" type="button" onClick={() => void copyResult()}>
              {copied ? "已复制" : "复制"}
            </button>
          </div>
          {copyError ? <p className="form-error">{copyError}</p> : null}
          <p className="dice-expression">{summary}</p>
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
