import { useEffect, useState } from "react"
import { DiceBreakdown } from "../components/DiceBreakdown.tsx"
import { HistoryNoteField } from "../components/HistoryNoteField.tsx"
import { diceHistoryDraft } from "../features/history/historyDrafts.ts"
import { useDiceRoll } from "../features/dice/useDiceRoll.ts"
import { useCatalog } from "../features/storage/useCatalog.ts"
import { formatDiceResult, MAX_DIE_SIDES } from "../utils/dice/index.ts"

const PRESET_SIDES = [2, 4, 6, 8, 10, 12, 20, 100]

export function DicePage() {
  const dice = useDiceRoll()
  const catalog = useCatalog()
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [resultNote, setResultNote] = useState("")

  async function roll(action: () => ReturnType<typeof dice.rollExpression>) {
    setCopied(false)
    setCopyError(null)
    setHistoryError(null)
    const outcome = action()
    if (!outcome.ok) return
    const shown = note.trim()
    setResultNote(shown)
    const saved = await catalog.recordHistory(diceHistoryDraft(outcome.result, shown))
    if (!saved.ok) setHistoryError(saved.message)
  }

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  async function copyResult() {
    if (!dice.result) return
    try {
      const lines = formatDiceResult(dice.result).split("\n")
      if (resultNote) {
        const totalLine = lines.findIndex((line) => line.startsWith("最终结果："))
        lines.splice(totalLine >= 0 ? totalLine + 1 : lines.length, 0, resultNote)
      }
      await navigator.clipboard.writeText(lines.join("\n"))
      setCopyError(null)
      setCopied(true)
    } catch {
      setCopied(false)
      setCopyError("复制失败，请手动选择结果。")
    }
  }

  return (
    <section className="page">
      <h1>骰子</h1>
      <p className="lead">可以输入表达式，也可以填写面数、颗数和数值补正。常用骰子只替换表达式里的面数。备注可选，留空则不会出现在历史里。成功的投掷会写入历史。</p>

      <HistoryNoteField className="note-row" id="dice-note" kind="dice" value={note} onChange={setNote} />

      <form
        className="stacked-form"
        onSubmit={(event) => {
          event.preventDefault()
          void roll(() => dice.rollExpression())
        }}
      >
        <label className="field" htmlFor="dice-expression">
          表达式
          <input
            id="dice-expression"
            value={dice.expression}
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => dice.setExpression(event.target.value)}
          />
        </label>
        <div className="inline-form expression-fields">
          <label className="field" htmlFor="custom-sides">
            自定义面数
            <input
              id="custom-sides"
              type="number"
              inputMode="numeric"
              min={2}
              max={MAX_DIE_SIDES}
              value={dice.customSides}
              onChange={(event) => dice.setCustomSides(event.target.value)}
            />
          </label>
          <label className="field" htmlFor="custom-count">
            投掷颗数
            <input
              id="custom-count"
              type="number"
              inputMode="numeric"
              min={1}
              value={dice.customCount}
              onChange={(event) => dice.setCustomCount(event.target.value)}
            />
          </label>
          <label className="field" htmlFor="custom-modifier">
            数值补正
            <input
              id="custom-modifier"
              type="number"
              inputMode="numeric"
              value={dice.customModifier}
              onChange={(event) => dice.setCustomModifier(event.target.value)}
            />
          </label>
        </div>
        <button className="button" type="submit">
          投掷
        </button>
      </form>

      <h2 className="section-label" id="preset-label">
        常用骰子
      </h2>
      <div className="dice-presets" role="group" aria-labelledby="preset-label">
        {PRESET_SIDES.map((sides) => (
          <button
            key={sides}
            className="button button-secondary"
            type="button"
            aria-pressed={dice.customSides === String(sides)}
            onClick={() => dice.applyPreset(sides)}
          >
            d{sides}
          </button>
        ))}
      </div>

      {dice.error ? (
        <p className="form-error" role="alert">
          {dice.error}
        </p>
      ) : null}

      {dice.result ? (
        <section className="panel" aria-live="polite">
          <div className="panel-header">
            <div>
              <p className="dice-total-label">最终结果</p>
              <p className="dice-total">{dice.result.total}</p>
              {resultNote ? <p className="result-note">{resultNote}</p> : null}
            </div>
            <button className="button button-secondary" type="button" onClick={() => void copyResult()}>
              {copied ? "已复制" : "复制"}
            </button>
          </div>
          {copyError ? <p className="form-error">{copyError}</p> : null}
          <DiceBreakdown result={dice.result} />
        </section>
      ) : dice.error ? null : (
        <p className="note">输入表达式，或填写面数、颗数和数值补正。</p>
      )}
      {historyError ? (
        <p className="form-error" role="alert">
          没有写入历史。{historyError}
        </p>
      ) : null}
    </section>
  )
}
