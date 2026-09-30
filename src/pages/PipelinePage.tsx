import { useEffect, useState } from "react"
import { pipelineHistoryDraft } from "../features/history/historyDrafts.ts"
import { formatPipelineResult } from "../features/pipeline/formatPipeline.ts"
import { usePipeline } from "../features/pipeline/usePipeline.ts"
import { useCatalog } from "../features/storage/useCatalog.ts"
import { formatModifier } from "../utils/dice/formatDiceResult.ts"

export function PipelinePage() {
  const pipeline = usePipeline()
  const catalog = useCatalog()
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const result = pipeline.result

  async function run(action: () => ReturnType<typeof pipeline.rollAndMatch>) {
    setCopied(false)
    setCopyError(null)
    setHistoryError(null)
    const outcome = action()
    if (!outcome || !outcome.ok) return
    const saved = await catalog.recordHistory(pipelineHistoryDraft(outcome.result))
    if (!saved.ok) setHistoryError(saved.message)
  }

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copyResult() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(formatPipelineResult(result))
      setCopyError(null)
      setCopied(true)
    } catch {
      setCopied(false)
      setCopyError("复制失败，请手动选择结果。")
    }
  }

  return (
    <section className="page">
      <h1>链路</h1>
      <p className="lead">选一张表，投骰或直接填入数值，匹配区间并带出词条。结果会写入历史。</p>

      {pipeline.status === "loading" ? <p className="note">正在读取数据…</p> : null}
      {pipeline.loadError ? (
        <p className="form-error" role="alert">
          {pipeline.loadError}
        </p>
      ) : null}

      {pipeline.status === "ready" ? (
        <>
          <label className="field pipeline-table" htmlFor="pipeline-table">
            随机表
            <select
              id="pipeline-table"
              value={pipeline.selected?.id ?? ""}
              onChange={(event) => {
                setHistoryError(null)
                pipeline.selectTable(event.target.value)
              }}
            >
              {pipeline.tables.length === 0 ? <option value="">没有可选的随机表</option> : null}
              {pipeline.tables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name}（{table.origin === "builtin" ? "内置" : "用户"}）
                </option>
              ))}
            </select>
          </label>
          {pipeline.tables.length === 0 ? (
            <p className="note">没有可选的随机表。可以新建用户随机表，或在设置里打开「显示内置数据」。</p>
          ) : null}

          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault()
              void run(() => pipeline.rollAndMatch())
            }}
          >
            <label className="field" htmlFor="pipeline-expression">
              表达式
              <input
                id="pipeline-expression"
                value={pipeline.expression}
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => pipeline.setExpression(event.target.value)}
              />
            </label>
            <button className="button" type="submit">
              投掷并匹配
            </button>
          </form>

          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault()
              void run(() => pipeline.matchTypedValue())
            }}
          >
            <label className="field" htmlFor="pipeline-value">
              数值
              <input
                id="pipeline-value"
                inputMode="numeric"
                value={pipeline.valueInput}
                onChange={(event) => pipeline.setValueInput(event.target.value)}
              />
            </label>
            <button className="button button-secondary" type="submit">
              按数值匹配
            </button>
          </form>

          {pipeline.actionError ? (
            <p className="form-error" role="alert">
              {pipeline.actionError}
            </p>
          ) : null}

          {result ? (
            <section className="panel" aria-live="polite">
              <div className="panel-header">
                <div>
                  <p className="dice-total-label">最终文本</p>
                  <p className="table-result-text">{result.output}</p>
                </div>
                <button className="button button-secondary" type="button" onClick={() => void copyResult()}>
                  {copied ? "已复制" : "复制"}
                </button>
              </div>
              {copyError ? <p className="form-error">{copyError}</p> : null}
              <p className="pipeline-summary">{result.summary}</p>
              {result.source.kind === "dice" ? (
                <>
                  <h2 className="section-label">每颗骰子</h2>
                  <ul className="dice-rolls">
                    {result.source.dice.rolls.map((die, index) => (
                      <li key={`${die.sides}-${index}`}>{die.value}</li>
                    ))}
                  </ul>
                  <dl className="dice-meta">
                    <div>
                      <dt>基础总值</dt>
                      <dd>{result.source.dice.subtotal}</dd>
                    </div>
                    <div>
                      <dt>修正值</dt>
                      <dd>{formatModifier(result.source.dice.modifier)}</dd>
                    </div>
                  </dl>
                </>
              ) : null}
              <dl className="dice-meta">
                <div>
                  <dt>数值</dt>
                  <dd>{result.value}</dd>
                </div>
                <div>
                  <dt>区间</dt>
                  <dd>
                    {result.min}-{result.max}
                  </dd>
                </div>
                <div>
                  <dt>表项</dt>
                  <dd>{result.rowText}</dd>
                </div>
                {result.entry ? (
                  <div>
                    <dt>词条</dt>
                    <dd>{result.entry.name}</dd>
                  </div>
                ) : null}
              </dl>
              {result.missingEntryId ? (
                <p className="form-error" role="alert">
                  未找到关联词条（{result.missingEntryId}）。
                </p>
              ) : null}
              {historyError ? (
                <p className="form-error" role="alert">
                  没有写入历史。{historyError}
                </p>
              ) : null}
            </section>
          ) : pipeline.actionError ? null : (
            <p className="note">填入 73 可以稳定看到示例：61-80，在街角发现异常踪迹。</p>
          )}
        </>
      ) : null}
    </section>
  )
}
