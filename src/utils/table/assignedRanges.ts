import type { DiceRollResult } from "../../types/dice.ts"
import type { RandomTable, TableRollResult } from "../../types/table.ts"
import { parseDiceExpression, rollDice } from "../dice/index.ts"
import type { RandomSource } from "../random.ts"
import { toTableRollResult, type TableRollOutcome } from "./result.ts"

export const TABLE_COVERAGE_ERROR = "随机表数据无法覆盖到所有可能取值"

export type AssignedRange = {
  id: string
  min: number
  max: number
}

export function formatAssignedSpan(min: number, max: number): string {
  return min === max ? String(min) : `${min}-${max}`
}

export function assignedRanges(
  table: RandomTable,
): { ok: true; ranges: AssignedRange[] } | { ok: false; message: string } {
  if (table.mode !== "range") return { ok: false, message: "这张表不是按数值区间匹配的。" }
  if (table.entries.length === 0) return { ok: false, message: "这张表没有可抽取的项目。" }

  const ranges: AssignedRange[] = []
  for (const entry of table.entries) {
    if (!Number.isSafeInteger(entry.min) || !Number.isSafeInteger(entry.max) || entry.min > entry.max) {
      return { ok: false, message: "随机表的区间无效。" }
    }
    ranges.push({ id: entry.id, min: entry.min, max: entry.max })
  }
  return { ok: true, ranges }
}

export function diceValueSpan(count: number, sides: number, modifier: number): { min: number; max: number } {
  return { min: count + modifier, max: count * sides + modifier }
}

export function spanCovered(ranges: readonly AssignedRange[], low: number, high: number): boolean {
  if (!Number.isSafeInteger(low) || !Number.isSafeInteger(high) || low > high) return false
  const merged = mergeRanges(ranges)
  let cursor = low
  for (const interval of merged) {
    if (interval.max < cursor) continue
    if (interval.min > cursor) return false
    cursor = interval.max + 1
    if (cursor > high) return true
  }
  return false
}

export type TableExpressionOutcome =
  | { ok: true; result: TableRollResult; dice: DiceRollResult }
  | { ok: false; message: string }

export function rollTableExpression(
  table: RandomTable,
  expression: string,
  random: RandomSource = Math.random,
): TableExpressionOutcome {
  const parsed = parseDiceExpression(expression)
  if (!parsed.ok) return parsed
  const assigned = assignedRanges(table)
  if (!assigned.ok) return assigned
  const span = diceValueSpan(parsed.value.count, parsed.value.sides, parsed.value.modifier)
  if (!spanCovered(assigned.ranges, span.min, span.max)) {
    return { ok: false, message: TABLE_COVERAGE_ERROR }
  }
  const rolled = rollDice(expression, random)
  if (!rolled.ok) return rolled
  const matched = matchAssignedValue(table, rolled.result.total, assigned.ranges)
  if (!matched.ok) return matched
  return { ok: true, result: matched.result, dice: rolled.result }
}

export function matchAssignedValue(
  table: RandomTable,
  value: number,
  ranges?: readonly AssignedRange[],
): TableRollOutcome {
  if (!Number.isSafeInteger(value)) return { ok: false, message: "请输入整数。" }
  const assigned = ranges ? { ok: true as const, ranges } : assignedRanges(table)
  if (!assigned.ok) return assigned
  const range = assigned.ranges.find((item) => value >= item.min && value <= item.max)
  if (!range) return { ok: false, message: "没有命中任何区间。" }
  const entry = table.entries.find((item) => item.id === range.id)
  if (!entry) return { ok: false, message: "没有命中任何区间。" }
  return { ok: true, result: toTableRollResult(table, entry, value, range) }
}

function mergeRanges(ranges: readonly AssignedRange[]): Array<{ min: number; max: number }> {
  const sorted = [...ranges].sort((left, right) => left.min - right.min || left.max - right.max)
  const merged: Array<{ min: number; max: number }> = []
  for (const range of sorted) {
    const last = merged[merged.length - 1]
    if (!last || range.min > last.max + 1) merged.push({ min: range.min, max: range.max })
    else last.max = Math.max(last.max, range.max)
  }
  return merged
}
