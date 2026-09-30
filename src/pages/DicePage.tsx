import { useEffect, useRef, useState } from "react"
import { DiceBreakdown } from "../components/DiceBreakdown.tsx"
import { HistoryNoteField } from "../components/HistoryNoteField.tsx"
import { cardClass, moveListItem, movedSelection, useCardReorder, useListFlip, useRevealRowEnd } from "../features/cards/reorder.ts"
import { DiceFormFields } from "../features/dice/DiceFormFields.tsx"
import { diceComparisonHistoryDraft, diceHistoryDraft } from "../features/history/historyDrafts.ts"
import { useDiceRoll } from "../features/dice/useDiceRoll.ts"
import { SchemeActions } from "../features/schemes/SchemeActions.tsx"
import {
  compareScheme,
  defaultDiceWorkspace,
  parseCompareScheme,
  readDiceWorkspace,
  writeDiceWorkspace,
} from "../features/schemes/compareScheme.ts"
import { downloadJson } from "../features/storage/downloadJson.ts"
import { useCatalog } from "../features/storage/useCatalog.ts"
import {
  MAX_COMPARE_COUNT,
  MAX_DIE_SIDES,
  MIN_COMPARE_COUNT,
  diceForm,
  compareSlotLabel,
  comparisonSeparator,
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

type CompareSlot = DiceFormValues & { slotId: string }

function newSlot(template?: DiceFormValues): CompareSlot {
  const source = template ?? diceForm()
  return {
    name: "",
    expression: source.expression,
    sides: source.sides,
    count: source.count,
    modifier: source.modifier,
    slotId: crypto.randomUUID(),
  }
}

function resizeSlots(current: CompareSlot[], count: number, template: DiceFormValues): CompareSlot[] {
  if (count === current.length) return current
  if (count < current.length) return current.slice(0, count)
  const added = Array.from({ length: count - current.length }, () => newSlot(template))
  return [...current, ...added]
}

export function DicePage() {
  const catalog = useCatalog()
  const [restored] = useState(readDiceWorkspace)
  const dice = useDiceRoll({
    expression: restored.singleExpression,
    sides: restored.singleSides,
    count: restored.singleCount,
    modifier: restored.singleModifier,
  })
  const [mode, setMode] = useState<DiceMode>(restored.mode)
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [schemeError, setSchemeError] = useState<string | null>(null)
  const [note, setNote] = useState(restored.note)
  const [singleNote, setSingleNote] = useState(restored.singleNote)
  const [compareNote, setCompareNote] = useState(restored.compareNote)
  const [compareCount, setCompareCount] = useState(restored.compareCount)
  const [slots, setSlots] = useState<CompareSlot[]>(restored.slots)
  const [selectedSlot, setSelectedSlot] = useState(restored.selectedSlot)
  const [draft, setDraft] = useState<DiceFormValues>(restored.draft)
  const [compareResults, setCompareResults] = useState<NamedDiceRoll[] | null>(null)
  const [compareError, setCompareError] = useState<string | null>(null)
  const cardsRef = useRef<HTMLDivElement>(null)
  useListFlip(cardsRef)
  useRevealRowEnd(cardsRef, slots.length)
  const cardDrag = useCardReorder(reorderCompareSlots)

  function reorderCompareSlots(from: number, to: number) {
    setSlots((current) => moveListItem(current, from, to))
    setSelectedSlot((selected) => movedSelection(selected, from, to))
  }

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  useEffect(() => {
    writeDiceWorkspace({
      mode,
      compareCount,
      slots,
      selectedSlot,
      draft,
      singleExpression: dice.expression,
      singleSides: dice.customSides,
      singleCount: dice.customCount,
      singleModifier: dice.customModifier,
      note,
      singleNote,
      compareNote,
    })
  }, [
    mode,
    compareCount,
    slots,
    selectedSlot,
    draft,
    dice.expression,
    dice.customSides,
    dice.customCount,
    dice.customModifier,
    note,
    singleNote,
    compareNote,
  ])

  function exportCompareScheme() {
    downloadJson("多次比较.json", compareScheme(slots))
  }

  function importCompareScheme(text: string) {
    const parsed = parseCompareScheme(text)
    if (!parsed.ok) {
      setSchemeError(parsed.message)
      return
    }
    const first = parsed.slots[0]
    setSchemeError(null)
    setCompareError(null)
    setCompareResults(null)
    setSlots(parsed.slots)
    setCompareCount(String(parsed.slots.length))
    setSelectedSlot(0)
    if (first) setDraft(first)
  }

  function resetCompareScheme() {
    const next = defaultDiceWorkspace()
    setSchemeError(null)
    setCompareError(null)
    setCompareResults(null)
    setSlots(next.slots)
    setCompareCount(next.compareCount)
    setSelectedSlot(next.selectedSlot)
    setDraft(next.draft)
  }

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
    const nextSlots = resizeSlots(slots, parsed.value, draft)
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
    setSlots((current) =>
      current.map((slot, slotIndex) => (slotIndex === index ? { ...slot, ...next, slotId: slot.slotId } : slot)),
    )
  }

  function addCompareSlot() {
    if (slots.length >= MAX_COMPARE_COUNT) return
    const nextSlots = [...slots, newSlot(draft)]
    setSlots(nextSlots)
    setCompareCount(String(nextSlots.length))
  }

  function removeCompareSlot(index: number) {
    if (slots.length <= MIN_COMPARE_COUNT) return
    const nextSlots = slots.filter((_, slotIndex) => slotIndex !== index)
    const nextIndex = Math.min(index < selectedSlot ? selectedSlot - 1 : selectedSlot, nextSlots.length - 1)
    setSlots(nextSlots)
    setCompareCount(String(nextSlots.length))
    setSelectedSlot(nextIndex)
    if (index === selectedSlot) {
      const slot = nextSlots[nextIndex]
      if (slot) setDraft(slot)
    }
  }

  async function rollSingle() {
    setCopied(false)
    setCopyError(null)
    setHistoryError(null)
    const outcome = dice.rollExpression(catalog.diceFloor)
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
    const outcome = rollDiceComparison(
      slots.map((slot) => ({ name: slot.name, expression: slot.expression })),
      Math.random,
      catalog.diceFloor,
    )
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
            <div className="inline-form">
              <button className="button button-secondary" type="button" onClick={() => dice.reset()}>
                重置
              </button>
              <button className="button" type="submit">
                投掷
              </button>
            </div>
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
              <div className="panel-header result-header">
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
            <div className="compare-cards" ref={cardsRef}>
              {slots.map((slot, index) => (
                <div
                  key={slot.slotId}
                  className={cardClass(selectedSlot === index, cardDrag.dragging === index)}
                  data-card-index={index}
                  data-card-key={slot.slotId}
                  onPointerDown={(event) => cardDrag.onPointerDown(index, event)}
                >
                  {slots.length > MIN_COMPARE_COUNT ? (
                    <button
                      className="button button-secondary compare-card-remove"
                      type="button"
                      aria-label={`删除${compareSlotLabel(slot.name, index)}`}
                      onPointerDown={(event) => event.stopPropagation()}
                      onClick={() => removeCompareSlot(index)}
                    >
                      删除
                    </button>
                  ) : null}
                  <button
                    className={slots.length > MIN_COMPARE_COUNT ? "compare-card-select has-remove" : "compare-card-select"}
                    type="button"
                    aria-pressed={selectedSlot === index}
                    onClick={() => selectSlot(index)}
                  >
                    <span className="compare-card-name">
                      <span className="compare-card-index">{index + 1}.</span>
                      {compareSlotLabel(slot.name, index)}
                    </span>
                    <span className="compare-card-expression">{slot.expression}</span>
                    <span className="compare-card-meta">
                      面数 {slot.sides} · {slot.count} 颗 · 补正 {slot.modifier}
                    </span>
                  </button>
                </div>
              ))}
              {slots.length < MAX_COMPARE_COUNT ? (
                <button className="compare-card compare-card-add" type="button" onClick={addCompareSlot}>
                  <span className="compare-card-plus">+</span>
                  <span>添加投掷</span>
                </button>
              ) : null}
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
                <button className="button" type="button" onClick={() => applyDraft("all")}>
                  应用到全部骰子
                </button>
              </div>
              <SchemeActions
                onExport={exportCompareScheme}
                onImportText={importCompareScheme}
                onReset={resetCompareScheme}
                error={schemeError}
              />
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
              <div className="panel-header result-header">
                <div>
                  <p className="dice-total-label">比较结果</p>
                  {compareNote ? <p className="result-note">{compareNote}</p> : null}
                  <p className="compare-summary">
                {compareResults.map((item, index) => (
                  <span key={`${item.name}-${item.result.expression}-${index}`}>
                    {index > 0 ? (
                      <span className="result-mark">
                        {comparisonSeparator(compareResults[index - 1]?.result.total ?? item.result.total, item.result.total)}
                      </span>
                    ) : null}
                    {item.name} <span className="compare-summary-score">{formatComparisonScore(item.result.total)}</span>
                  </span>
                ))}
                  </p>
                </div>
                <button className="button button-secondary" type="button" onClick={() => void copyComparison()}>
                  {copied ? "已复制" : "复制"}
                </button>
              </div>
              {copyError ? <p className="form-error">{copyError}</p> : null}
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
