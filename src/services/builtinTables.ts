import { parseRandomTables } from "../utils/table/index.ts"
import type { RandomTable } from "../types/table.ts"

export async function loadBuiltinTables(): Promise<RandomTable[]> {
  let response: Response
  try {
    response = await fetch(`${import.meta.env.BASE_URL}data/tables.json`)
  } catch {
    throw new Error("无法读取内置随机表。")
  }
  if (!response.ok) throw new Error("无法读取内置随机表。")

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new Error("内置随机表不是有效的 JSON。")
  }

  const parsed = parseRandomTables(data)
  if (!parsed.ok) throw new Error(parsed.message)
  return parsed.tables
}
