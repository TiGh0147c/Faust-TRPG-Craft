import { DATA_VERSION, type UserData, type UserSetting } from "../../types/data.ts"
import type { HistoryKind, HistoryRecord } from "../../types/history.ts"
import { parseEntries } from "../../utils/entry/parseEntries.ts"
import { parseGenerators } from "../../utils/generator/parseGenerators.ts"
import { parseRandomTables } from "../../utils/table/parseRandomTables.ts"

const HISTORY_KINDS: readonly HistoryKind[] = ["dice", "table", "pipeline", "generator"]

export type ParseUserDataOutcome =
  | { ok: true; data: UserData }
  | { ok: false; message: string }

export function parseUserData(input: unknown): ParseUserDataOutcome {
  if (!isRecord(input)) return invalid()
  if (input.version !== DATA_VERSION) return { ok: false, message: "数据版本不兼容。" }

  const tables = parseRandomTables(input.tables)
  if (!tables.ok) return invalid()
  const entries = parseEntries(input.entries)
  if (!entries.ok) return invalid()
  const generators = parseGenerators(input.generators)
  if (!generators.ok) return generators.message === "存在重复的生成器 id。" ? generators : invalid()
  const history = parseHistoryRecords(input.history)
  if (!history.ok) return history
  const settings = parseSettingsList(input.settings)
  if (!settings.ok) return settings

  return {
    ok: true,
    data: {
      version: DATA_VERSION,
      tables: tables.tables,
      entries: entries.entries,
      generators: generators.generators,
      history: history.history,
      settings: settings.settings,
    },
  }
}

export function parseHistoryRecords(
  input: unknown,
): { ok: true; history: HistoryRecord[] } | { ok: false; message: string } {
  if (!Array.isArray(input)) return invalid()
  const history: HistoryRecord[] = []
  for (const item of input) {
    if (!isRecord(item)) return invalid()
    const id = readString(item.id)
    const createdAt = readString(item.createdAt)
    const kind = item.kind
    const inputText = typeof item.input === "string" ? item.input : null
    const output = typeof item.output === "string" ? item.output : null
    if (!id || !createdAt || inputText === null || output === null || typeof item.favorite !== "boolean") return invalid()
    if (!isHistoryKind(kind)) return invalid()
    if (history.some((record) => record.id === id)) return { ok: false, message: "存在重复的历史记录 id。" }
    if (item.diceResult !== undefined && !isRecord(item.diceResult)) return invalid()
    const diceResult = isRecord(item.diceResult) ? asDiceResult(item.diceResult) : undefined
    if (item.diceResult !== undefined && !diceResult) return invalid()
    history.push({
      id,
      createdAt,
      kind,
      input: inputText,
      output,
      favorite: item.favorite,
      diceResult,
    })
  }
  return { ok: true, history }
}

function isHistoryKind(value: unknown): value is HistoryKind {
  return typeof value === "string" && HISTORY_KINDS.some((kind) => kind === value)
}

function asDiceResult(input: Record<string, unknown>): HistoryRecord["diceResult"] {
  if (!Array.isArray(input.rolls) || typeof input.expression !== "string") return undefined
  if (typeof input.subtotal !== "number" || typeof input.modifier !== "number" || typeof input.total !== "number") {
    return undefined
  }
  const rolls = input.rolls.flatMap((roll) => {
    if (!isRecord(roll) || typeof roll.sides !== "number" || typeof roll.value !== "number") return []
    return [{ sides: roll.sides, value: roll.value }]
  })
  if (rolls.length !== input.rolls.length) return undefined
  return { expression: input.expression, rolls, subtotal: input.subtotal, modifier: input.modifier, total: input.total }
}

export function parseSettingsList(
  input: unknown,
): { ok: true; settings: UserSetting[] } | { ok: false; message: string } {
  if (!Array.isArray(input)) return invalid()
  const settings: UserSetting[] = []
  for (const item of input) {
    if (!isRecord(item) || typeof item.key !== "string" || item.key.trim() === "" || !isSettingValue(item.value)) {
      return invalid()
    }
    if (settings.some((setting) => setting.key === item.key)) return { ok: false, message: "存在重复的设置。" }
    settings.push({ key: item.key, value: item.value })
  }
  return { ok: true, settings }
}

function invalid(): { ok: false; message: string } {
  return { ok: false, message: "本地数据格式不正确。" }
}

function isSettingValue(value: unknown): value is UserSetting["value"] {
  return value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean"
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null
}
