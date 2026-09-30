import { useEffect, useState } from "react"
import { DiceBreakdown } from "../components/DiceBreakdown.tsx"
import { HistoryNoteField } from "../components/HistoryNoteField.tsx"
import { DiceFormFields } from "../features/dice/DiceFormFields.tsx"
import { diceComparisonHistoryDraft, diceHistoryDraft } from "../features/history/historyDrafts.ts"
import { useDiceRoll } from "../features/dice/useDiceRoll.ts"
import { useCatalog } from "../features/storage/useCatalog.ts"
import {
  MAX_COMPARE_COUNT,
  MAX_DIE_SIDES,
  MIN_COMPARE_COUNT,
  diceForm,
  compareSlotLabel,
  formatComparisonScore,
  formatDiceComparison,
  formatDiceResult,
  readCompareCount,
  rollDiceComparison,
  type DiceFormValues,
  type NamedDiceRoll,
} from "../utils/dice/index.ts"

const PRESET_SIDES = [2, 4, 6, 8, 10, 12, 20, 100]

type DiceMode = "single" | "compare"

function resizeSlots(current: DiceFormValues[], count: number): DiceFormValues[] {
  if (count === current.length) return current
  if (count < current.length) return current.slice(0, count)
  const added = Array.from({ length: count - current.length }, (_, offset) =>
    diceForm(),
  )
  return [...current, ...added]
}

export function DicePage() {
  const dice = useDiceRoll()
  const catalog = useCatalog()
  const [mode, setMode] = useState<DiceMode>("single")
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [note, setNote] = useState("")
  const [singleNote, setSingleNote] = useState("")
  const [compareNote, setCompareNote] = useState("")
  const [compareCount, setCompareCount] = useState(String(MIN_COMPARE_COUNT))
  const [slots, setSlots] = useState<DiceFormValues[]>(() => [diceForm(), diceForm()])
  const [selectedSlot, setSelectedSlot] = useState(0)
  const [draft, setDraft] = useState<DiceFormValues>(() => diceForm())
  const [compareResults, setCompareResults] = useState<NamedDiceRoll[] | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  function selectMode(next: DiceMode) {
    setMode(next)
    setCopied(false)
    setCopyError(null)
    setHistoryError(null)
  }

  function updateCompareCount(value: string) {
    setCompareCount(value)
    const parsed = readCompareCount(value)
    if (!parsed.ok) return
    setCompareError(null)
    const nextSlots = resizeSlots(slots, parsed.value)
    const index = Math.min(selectedSlot, nextSlots.length - 1)
    setSlots(nextSlots)
    setSelectedSlot(index)
    if (index !== selectedSlot) {
      const slot = nextSlots[index]
      if (slot) setDraft(slot)
    }
  }

  function selectSlot(index: number) {
    setSelectedSlot(index)
    const slot = slots[index]
    if (slot) setDraft(slot)
  }

  function editForm(next: DiceFormValues) {
    const slot = slots[selectedSlot]
    if (!slot) return
    if (next.name !== slot.name) updateSlot(selectedSlot, { ...slot, name: next.name })
    setDraft(next)
  }

  function applyDraft(target: "current" | "all") {
    const settings = {
      expression: draft.expression,
      sides: draft.sides,
      count: draft.count,
      modifier: draft.modifier,
    }
    setSlots((current) =>
      current.map((slot, index) => (target === "all" || index === selectedSlot ? { ...slot, ...settings } : slot)),
    )
  }

  function updateSlot(index: number, next: DiceFormValues) {
    setSlots((current) => current.map((slot, slotIndex) => (slotIndex === index ? next : slot)))
  }

  async function rollSingle() {
    setCopied(false)
    setCopyError(null)
    setHistoryError(null)
    const outcome = dice.rollExpression()
    if (!outcome.ok) return
    const shown = note.trim()
    setSingleNote(shown)
    const saved = await catalog.recordHistory(diceHistoryDraft(outcome.result, shown))
    if (!saved.ok) setHistoryError(saved.message)
  }

  async function rollComparison() {
    setCopied(false)
    setCopyError(null)
    setHistoryError(null)
    const parsed = readCompareCount(compareCount)
    if (!parsed.ok) {
      setCompareResults(null)
      setCompareError(parsed.message)
      return
    }
    const outcome = rollDiceComparison(slots.map((slot) => ({ name: slot.name, expression: slot.expression })))
    if (!outcome.ok) {
      setCompareResults(null)
      setCompareError(outcome.message)
      return
    }
    const shown = note.trim()
    setCompareError(null)
    setCompareNote(shown)
    setCompareResults(outcome.results)
    const saved = await catalog.recordHistory(diceComparisonHistoryDraft(outcome.ordered, outcome.results, shown))
    if (!saved.ok) setHistoryError(saved.message)
  }

  async function copySingle() {
    if (!dice.result) return
    try {
      const lines = formatDiceResult(dice.result).split("\n")
      if (singleNote) {
        const totalLine = lines.findIndex((line) => line.startsWith("最终结果："))
        lines.splice(totalLine >= 0 ? totalLine + 1 : lines.length, 0, singleNote)
      }
      await navigator.clipboard.writeText(lines.join("\n"))
      setCopyError(null)
      setCopied(true)
    } catch {
      setCopied(false)
      setCopyError("复制失败，请手动选择结果。")
    }
  }

  async function copyComparison() {
    if (!compareResults) return
    try {
      const body = formatDiceComparison(compareResults)
      await navigator.clipboard.writeText(compareNote ? `${compareNote}\n${body}` : body)
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
      <p className="lead">
        单次投掷，或把多组骰子放在一起比较。
      </p>

      <div className="mode-choices" role="group" aria-label="投掷方式">
        <button className="button button-secondary" type="button" aria-pressed={mode === "single"} onClick={() => selectMode("single")}>
          单次投掷
        </button>
        <button className="button button-secondary" type="button" aria-pressed={mode === "compare"} onClick={() => selectMode("compare")}>
          多次比较
        </button>
      </div>

      <HistoryNoteField className="note-row" id="dice-note" kind="dice" value={note} onChange={setNote} />

      {mode === "single" ? (
        <>
          <form
            className="stacked-form"
            onSubmit={(event) => {
              event.preventDefault()
              void rollSingle()
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
                  {singleNote ? <p className="result-note">{singleNote}</p> : null}
                </div>
                <button className="button button-secondary" type="button" onClick={() => void copySingle()}>
                  {copied ? "已复制" : "复制"}
                </button>
              </div>
              {copyError ? <p className="form-error">{copyError}</p> : null}
              <DiceBreakdown result={dice.result} />
            </section>
          ) : dice.error ? null : (
            <p className="note">输入表达式，或填写面数、颗数和数值补正。</p>
          )}
        </>
      ) : (
        <>
          <form
            className="compare-form"
            onSubmit={(event) => {
              event.preventDefault()
              void rollComparison()
            }}
          >
            <label className="field compare-count" htmlFor="compare-times">
              投掷次数
              <input
                id="compare-times"
                type="number"
                inputMode="numeric"
                min={MIN_COMPARE_COUNT}
                max={MAX_COMPARE_COUNT}
                value={compareCount}
                onChange={(event) => updateCompareCount(event.target.value)}
              />
            </label>
            <div className="compare-cards">
              {slots.map((slot, index) => (
                <button
                  key={index}
                  className={selectedSlot === index ? "compare-card is-selected" : "compare-card"}
                  type="button"
                  aria-pressed={selectedSlot === index}
                  onClick={() => selectSlot(index)}
                >
                  <span className="compare-card-name">{compareSlotLabel(slot.name, index)}</span>
                  <span className="compare-card-expression">{slot.expression}</span>
                  <span className="compare-card-meta">
                    面数 {slot.sides} · {slot.count} 颗 · 补正 {slot.modifier}
                  </span>
                </button>
              ))}
            </div>
            <div className="compare-editor">
              <h2 className="section-label">正在编辑 {compareSlotLabel(slots[selectedSlot]?.name ?? "", selectedSlot)}</h2>
              {slots[selectedSlot] ? (
                <DiceFormFields
                  idPrefix="compare"
                  form={{ ...draft, name: slots[selectedSlot].name }}
                  namePlaceholder={compareSlotLabel("", selectedSlot)}
                  onChange={editForm}
                />
              ) : null}
              <div className="compare-apply">
                <button className="button" type="button" onClick={() => applyDraft("current")}>
                  应用到当前骰子
                </button>
                <button className="button button-secondary" type="button" onClick={() => applyDraft("all")}>
                  应用到全部骰子
                </button>
              </div>
            </div>
            <button className="button" type="submit">
              投掷
            </button>
          </form>

          {compareError ? (
            <p className="form-error" role="alert">
              {compareError}
            </p>
          ) : null}

          {compareResults ? (
            <section className="panel" aria-live="polite">
              <div className="panel-header">
                <p className="dice-total-label">比较结果</p>
                <button className="button button-secondary" type="button" onClick={() => void copyComparison()}>
                  {copied ? "已复制" : "复制"}
                </button>
              </div>
              {compareNote ? <p className="result-note">{compareNote}</p> : null}
              {copyError ? <p className="form-error">{copyError}</p> : null}
              <p className="compare-summary">
                {compareResults.map((item, index) => (
                  <span key={`${item.name}-${item.result.expression}-${index}`}>
                    {index > 0 ? " > " : ""}
                    {item.name} <span className="compare-summary-score">{formatComparisonScore(item.result.total)}</span>
                  </span>
                ))}
              </p>
              <ol className="compare-results">
                {compareResults.map((item, index) => (
                  <li key={`${item.name}-${item.result.expression}-${index}`}>
                    <p className="dice-total-label">第 {index + 1} 名</p>
                    {item.name ? <p className="compare-result-name">{item.name}</p> : null}
                    <p className="dice-total">{item.result.total}</p>
                    <DiceBreakdown result={item.result} />
                  </li>
                ))}
              </ol>
            </section>
          ) : compareError ? null : (
            <p className="note">选中一张卡片后填写名称。表达式和数值要应用到当前骰子或全部骰子后，才会写到卡片上。</p>
          )}
        </>
      )}

      {historyError ? (
        <p className="form-error" role="alert">
          没有写入历史。{historyError}
        </p>
      ) : null}
    </section>
  )
}
