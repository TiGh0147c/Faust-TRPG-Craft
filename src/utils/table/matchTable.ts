import type { RandomTable } from "../../types/table.ts"
import { toTableRollResult, type TableRollOutcome } from "./result.ts"

export function matchTableByValue(table: RandomTable, value: number): TableRollOutcome {
  if (table.mode !== "range") {
    return { ok: false, message: "这张表不是按数值区间匹配的。" }
  }
  if (!Number.isSafeInteger(value)) {
    return { ok: false, message: "请输入整数。" }
  }
  if (table.entries.length === 0) {
    return { ok: false, message: "这张表没有可抽取的项目。" }
  }

  for (const entry of table.entries) {
    if (!Number.isSafeInteger(entry.min) || !Number.isSafeInteger(entry.max) || entry.min > entry.max) {
      return { ok: false, message: "随机表的区间无效。" }
    }
  }

  const entry = table.entries.find((row) => value >= row.min && value <= row.max)
  if (!entry) return { ok: false, message: "没有命中任何区间。" }
  return { ok: true, result: toTableRollResult(table, entry, value) }
}

export function matchTableInput(table: RandomTable, raw: string): TableRollOutcome {
  const trimmed = raw.trim()
  if (!/^-?\d+$/.test(trimmed)) {
    return { ok: false, message: "请输入整数。" }
  }
  return matchTableByValue(table, Number(trimmed))
}
