import type { Entry } from "../../types/entry.ts"

export type ParseEntriesOutcome =
  | { ok: true; entries: Entry[] }
  | { ok: false; message: string }

export function parseEntries(input: unknown): ParseEntriesOutcome {
  if (!Array.isArray(input)) return invalid()

  const entries: Entry[] = []
  const ids = new Set<string>()

  for (const item of input) {
    const parsed = parseEntry(item)
    if (!parsed.ok) return parsed
    if (ids.has(parsed.entry.id)) return { ok: false, message: "存在重复的词条 id。" }
    ids.add(parsed.entry.id)
    entries.push(parsed.entry)
  }

  return { ok: true, entries }
}

function parseEntry(input: unknown): { ok: true; entry: Entry } | { ok: false; message: string } {
  if (!isRecord(input)) return invalid()
  const id = readString(input.id)
  const name = readString(input.name)
  const content = readString(input.content)
  const category = readString(input.category)
  const tags = readStringList(input.tags)
  if (!id || !name || !content || !category || !tags) return invalid()
  if (typeof input.weight !== "number" || !Number.isFinite(input.weight) || input.weight <= 0) {
    return { ok: false, message: "权重必须大于 0。" }
  }
  return { ok: true, entry: { id, name, content, category, tags, weight: input.weight } }
}

function invalid(): { ok: false; message: string } {
  return { ok: false, message: "内置词条格式不正确。" }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null
}

function readStringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return null
  return value
}
