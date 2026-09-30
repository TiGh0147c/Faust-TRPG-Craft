import { MAX_COMPARE_COUNT, MIN_COMPARE_COUNT } from "../../utils/dice/compareDice.ts"
import { diceForm, type DiceFormValues } from "../../utils/dice/diceForm.ts"

export type CompareSlotDraft = DiceFormValues & { slotId: string }

export type DiceWorkspace = {
  mode: "single" | "compare"
  compareCount: string
  slots: CompareSlotDraft[]
  selectedSlot: number
  draft: DiceFormValues
  singleExpression: string
  singleSides: string
  singleCount: string
  singleModifier: string
  note: string
  singleNote: string
  compareNote: string
}

export const DICE_WORKSPACE_KEY = "faust-dice-compare-workspace"

export function defaultDiceWorkspace(): DiceWorkspace {
  const single = diceForm()
  return {
    mode: "single",
    compareCount: String(MIN_COMPARE_COUNT),
    slots: [blankCompareSlot(), blankCompareSlot()],
    selectedSlot: 0,
    draft: diceForm(),
    singleExpression: single.expression,
    singleSides: single.sides,
    singleCount: single.count,
    singleModifier: single.modifier,
    note: "",
    singleNote: "",
    compareNote: "",
  }
}

export function compareScheme(slots: readonly CompareSlotDraft[]) {
  return {
    kind: "dice-compare" as const,
    slots: slots.map(({ name, expression, sides, count, modifier }) => ({ name, expression, sides, count, modifier })),
  }
}

export function parseCompareScheme(text: string): { ok: true; slots: CompareSlotDraft[] } | { ok: false; message: string } {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, message: "无法识别这份方案。" }
  }
  if (!value || typeof value !== "object" || (value as { kind?: unknown }).kind !== "dice-compare") {
    return { ok: false, message: "这不是多次比较方案。" }
  }
  const rows = (value as { slots?: unknown }).slots
  if (!Array.isArray(rows)) return { ok: false, message: "无法识别这份方案。" }
  if (rows.length < MIN_COMPARE_COUNT) return { ok: false, message: "多次比较至少需要 2 次投掷。" }
  if (rows.length > MAX_COMPARE_COUNT) return { ok: false, message: `投掷次数不能超过 ${MAX_COMPARE_COUNT}。` }
  const slots: CompareSlotDraft[] = []
  for (const row of rows) {
    const slot = readCompareSlot(row)
    if (!slot) return { ok: false, message: "无法识别这份方案。" }
    slots.push(slot)
  }
  return { ok: true, slots }
}

export function readDiceWorkspace(): DiceWorkspace {
  const stored = readStored(DICE_WORKSPACE_KEY)
  if (!stored) return defaultDiceWorkspace()
  const mode = stored.mode === "compare" ? "compare" : "single"
  const parsed = parseCompareScheme(JSON.stringify({ kind: "dice-compare", slots: stored.slots }))
  const slots = parsed.ok ? parsed.slots.map((slot, index) => ({ ...slot, slotId: readId(storedSlotId(stored.slots, index)) })) : defaultDiceWorkspace().slots
  const selectedSlot = clampIndex(stored.selectedSlot, slots.length)
  const draft = readForm(stored.draft) ?? slots[selectedSlot] ?? diceForm()
  const single = readForm(stored.single) ?? diceForm()
  return {
    mode,
    compareCount: String(slots.length),
    slots,
    selectedSlot,
    draft,
    singleExpression: single.expression,
    singleSides: single.sides,
    singleCount: single.count,
    singleModifier: single.modifier,
    note: typeof stored.note === "string" ? stored.note : "",
    singleNote: typeof stored.singleNote === "string" ? stored.singleNote : "",
    compareNote: typeof stored.compareNote === "string" ? stored.compareNote : "",
  }
}

export function writeDiceWorkspace(workspace: DiceWorkspace) {
  writeStored(DICE_WORKSPACE_KEY, {
    mode: workspace.mode,
    selectedSlot: workspace.selectedSlot,
    draft: workspace.draft,
    slots: workspace.slots,
    single: {
      name: "",
      expression: workspace.singleExpression,
      sides: workspace.singleSides,
      count: workspace.singleCount,
      modifier: workspace.singleModifier,
    },
    note: workspace.note,
    singleNote: workspace.singleNote,
    compareNote: workspace.compareNote,
  })
}

function blankCompareSlot(): CompareSlotDraft {
  return { ...diceForm(), slotId: createId() }
}

function readCompareSlot(value: unknown): CompareSlotDraft | null {
  const form = readForm(value)
  if (!form) return null
  return { ...form, slotId: createId() }
}

function readForm(value: unknown): DiceFormValues | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (
    typeof row.expression !== "string" ||
    typeof row.sides !== "string" ||
    typeof row.count !== "string" ||
    typeof row.modifier !== "string"
  ) {
    return null
  }
  return {
    name: typeof row.name === "string" ? row.name : "",
    expression: row.expression,
    sides: row.sides,
    count: row.count,
    modifier: row.modifier,
  }
}

function storedSlotId(slots: unknown, index: number): unknown {
  if (!Array.isArray(slots)) return undefined
  const row = slots[index]
  if (!row || typeof row !== "object") return undefined
  return (row as { slotId?: unknown }).slotId
}

function readId(value: unknown): string {
  return typeof value === "string" && value.trim() !== "" ? value : createId()
}

function clampIndex(value: unknown, length: number): number {
  const index = typeof value === "number" && Number.isInteger(value) ? value : 0
  return Math.min(Math.max(index, 0), Math.max(length - 1, 0))
}

function readStored(key: string): Record<string, unknown> | null {
  try {
    const text = sessionStorage.getItem(key)
    if (!text) return null
    const value = JSON.parse(text) as unknown
    if (!value || typeof value !== "object") return null
    return value as Record<string, unknown>
  } catch {
    return null
  }
}

function writeStored(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // The page still keeps the current values when this tab cannot store them.
  }
}

function createId(): string {
  return crypto.randomUUID()
}
