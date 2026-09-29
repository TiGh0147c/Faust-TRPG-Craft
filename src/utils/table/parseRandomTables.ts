import type {
  RandomTable,
  RangeTableEntry,
  UniformTableEntry,
  WeightTableEntry,
} from "../../types/table.ts"

export type ParseTablesOutcome =
  | { ok: true; tables: RandomTable[] }
  | { ok: false; message: string }

const MODES = ["range", "weight", "uniform"] as const

export function parseRandomTables(input: unknown): ParseTablesOutcome {
  if (!Array.isArray(input)) {
    return { ok: false, message: "内置随机表格式不正确。" }
  }

  const tables: RandomTable[] = []
  const tableIds = new Set<string>()

  for (const item of input) {
    const parsed = parseTable(item)
    if (!parsed.ok) return parsed
    if (tableIds.has(parsed.table.id)) {
      return { ok: false, message: "存在重复的随机表 id。" }
    }
    tableIds.add(parsed.table.id)
    tables.push(parsed.table)
  }

  return { ok: true, tables }
}

function parseTable(input: unknown): { ok: true; table: RandomTable } | { ok: false; message: string } {
  if (!isRecord(input)) return invalid()
  const id = readString(input.id)
  const name = readString(input.name)
  const description = readText(input.description)
  const category = readString(input.category)
  const tags = readStringList(input.tags)
  const mode = input.mode
  if (!id || !name || description === null || !category || !tags || !isMode(mode)) return invalid()
  if (!Array.isArray(input.entries)) return invalid()

  const rowIds = new Set<string>()
  if (mode === "range") {
    const entries: RangeTableEntry[] = []
    for (const row of input.entries) {
      const parsed = parseRangeRow(row)
      if (!parsed.ok) return parsed
      if (rowIds.has(parsed.entry.id)) return invalid()
      rowIds.add(parsed.entry.id)
      entries.push(parsed.entry)
    }
    return { ok: true, table: { id, name, description, category, tags, mode, entries } }
  }

  if (mode === "weight") {
    const entries: WeightTableEntry[] = []
    for (const row of input.entries) {
      const parsed = parseWeightRow(row)
      if (!parsed.ok) return parsed
      if (rowIds.has(parsed.entry.id)) return invalid()
      rowIds.add(parsed.entry.id)
      entries.push(parsed.entry)
    }
    return { ok: true, table: { id, name, description, category, tags, mode, entries } }
  }

  const entries: UniformTableEntry[] = []
  for (const row of input.entries) {
    const parsed = parseUniformRow(row)
    if (!parsed.ok) return parsed
    if (rowIds.has(parsed.entry.id)) return invalid()
    rowIds.add(parsed.entry.id)
    entries.push(parsed.entry)
  }
  return { ok: true, table: { id, name, description, category, tags, mode, entries } }
}

function parseRangeRow(
  input: unknown,
): { ok: true; entry: RangeTableEntry } | { ok: false; message: string } {
  const base = parseRowBase(input)
  if (!base.ok) return base
  if (!isRecord(input)) return invalid()
  const min = input.min
  const max = input.max
  if (typeof min !== "number" || typeof max !== "number" || !Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
    return invalid()
  }
  if (min > max) return { ok: false, message: "随机表的区间无效。" }
  return { ok: true, entry: { ...base.entry, min, max } }
}

function parseWeightRow(
  input: unknown,
): { ok: true; entry: WeightTableEntry } | { ok: false; message: string } {
  const base = parseRowBase(input)
  if (!base.ok) return base
  if (!isRecord(input) || typeof input.weight !== "number" || !Number.isFinite(input.weight) || input.weight <= 0) {
    return { ok: false, message: "权重必须大于 0。" }
  }
  const weight = input.weight
  return { ok: true, entry: { ...base.entry, weight } }
}

function parseUniformRow(
  input: unknown,
): { ok: true; entry: UniformTableEntry } | { ok: false; message: string } {
  return parseRowBase(input)
}

function parseRowBase(
  input: unknown,
): { ok: true; entry: UniformTableEntry } | { ok: false; message: string } {
  if (!isRecord(input)) return invalid()
  const id = readString(input.id)
  const text = readString(input.text)
  if (!id || !text) return invalid()
  if (input.entryId === undefined) return { ok: true, entry: { id, text } }
  const entryId = readString(input.entryId)
  if (!entryId) return invalid()
  return { ok: true, entry: { id, text, entryId } }
}

function invalid(): { ok: false; message: string } {
  return { ok: false, message: "内置随机表格式不正确。" }
}

function isMode(value: unknown): value is RandomTable["mode"] {
  return typeof value === "string" && MODES.some((mode) => mode === value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null
}

function readText(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function readStringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return null
  return value
}
