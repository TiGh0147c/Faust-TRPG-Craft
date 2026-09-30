import { useEffect, useState } from "react"
import { HistoryNoteField } from "../components/HistoryNoteField.tsx"
import { collectionHistoryDraft } from "../features/history/historyDrafts.ts"
import { useCatalog } from "../features/storage/useCatalog.ts"
import {
  collectionFromCustom,
  collectionFromRange,
  drawLimited,
  formatSequence,
  readOrderCount,
  shuffleValues,
} from "../utils/collection/orderCollection.ts"

type OrderMode = "all" | "prefix"

type CollectionSource = "range" | "custom"

export function CollectionsPage() {
  const catalog = useCatalog()
  const [source, setSource] = useState<CollectionSource | "">("")
  const [start, setStart] = useState("1")
  const [end, setEnd] = useState("10")
  const [custom, setCustom] = useState("")
  const [count, setCount] = useState("1")
  const [limit, setLimit] = useState("1")
  const [orderMode, setOrderMode] = useState<OrderMode>("all")
  const [orderCount, setOrderCount] = useState("1")
  const [note, setNote] = useState("")
  const [values, setValues] = useState<number[] | null>(null)
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

  function currentValues() {
    if (source === "range") return collectionFromRange(start, end)
    if (source === "custom") return collectionFromCustom(custom)
    return { ok: false as const, message: "先选择数值区间或自定义集合。" }
  }

  async function finish(kind: "order" | "draw", input: string, next: number[]) {
    setError(null)
    setHistoryError(null)
    setCopied(false)
    setCopyError(null)
    setAction(kind)
    setSummary(input)
    setValues(next)
    const saved = await catalog.recordHistory(collectionHistoryDraft(input, next, note))
    if (!saved.ok) setHistoryError(saved.message)
  }

  async function shuffle() {
    const elements = currentValues()
    if (!elements.ok) {
      setValues(null)
      setError(elements.message)
      return
    }
    const ordered = shuffleValues(elements.values)
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
    const elements = currentValues()
    if (!elements.ok) {
      setValues(null)
      setError(elements.message)
      return
    }
    const drawn = drawLimited(elements.values, count, limit)
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
      await navigator.clipboard.writeText(formatSequence(summary, values))
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
        先选择数值区间或自定义集合。选定之后可以填写备注，再打乱整个集合，或指定抽取个数并限制每个元素最多出现的次数。
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

      {source !== "" ? <HistoryNoteField className="note-row" id="collection-note" value={note} onChange={setNote} /> : null}

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
        <label className="field note-row" htmlFor="collection-custom">
          数值
          <textarea
            id="collection-custom"
            value={custom}
            placeholder="用空格、逗号或换行分开，例如 3、8、12"
            onChange={(event) => setCustom(event.target.value)}
          />
        </label>
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
