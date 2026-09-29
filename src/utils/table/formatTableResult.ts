import type { Entry } from "../../types/entry.ts"
import type { TableRollResult } from "../../types/table.ts"

export function formatTableResult(result: TableRollResult, entry?: Entry): string {
  const lines = [result.tableName]
  if (result.value !== undefined && result.min !== undefined && result.max !== undefined) {
    lines.push(`数值：${result.value}`, `区间：${result.min}-${result.max}`)
  }
  lines.push(`结果：${result.text}`)
  if (entry) lines.push(`词条：${entry.name}`, entry.content)
  return lines.join("\n")
}
