import type { RandomTable } from "../../types/table.ts"
import { matchAssignedValue } from "./assignedRanges.ts"
import type { TableRollOutcome } from "./result.ts"

export function matchTableByValue(table: RandomTable, value: number): TableRollOutcome {
  return matchAssignedValue(table, value)
}

export function matchTableInput(table: RandomTable, raw: string): TableRollOutcome {
  const trimmed = raw.trim()
  if (!/^-?\d+$/.test(trimmed)) {
    return { ok: false, message: "请输入整数。" }
  }
  return matchTableByValue(table, Number(trimmed))
}
