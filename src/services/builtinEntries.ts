import type { Entry } from "../types/entry.ts"
import { parseEntries } from "../utils/entry/index.ts"

export async function loadBuiltinEntries(): Promise<Entry[]> {
  let response: Response
  try {
    response = await fetch(`${import.meta.env.BASE_URL}data/entries.json`)
  } catch {
    throw new Error("无法读取内置词条。")
  }
  if (!response.ok) throw new Error("无法读取内置词条。")

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new Error("内置词条不是有效的 JSON。")
  }

  const parsed = parseEntries(data)
  if (!parsed.ok) throw new Error(parsed.message)
  return parsed.entries
}
