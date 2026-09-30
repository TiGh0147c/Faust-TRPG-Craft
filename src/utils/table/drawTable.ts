import type { RandomTable, RangeTableEntry } from "../../types/table.ts"
import { readRandomUnit, type RandomSource } from "../random.ts"
import { matchTableByValue } from "./matchTable.ts"
import { toTableRollResult, type TableRollOutcome } from "./result.ts"

const MAX_COVERED_VALUES = 1_000_000

export function drawTable(
  table: RandomTable,
  random: RandomSource = Math.random,
): TableRollOutcome {
  if (table.entries.length === 0) {
    return { ok: false, message: "这张表没有可抽取的项目。" }
  }

  if (table.mode === "collection") {
    if (table.entries.some((entry) => !Number.isFinite(entry.weight) || entry.weight <= 0)) {
      return { ok: false, message: "权重必须大于 0。" }
    }
    const total = table.entries.reduce((sum, entry) => sum + entry.weight, 0)
    let pick = readRandomUnit(random) * total
    for (const entry of table.entries) {
      pick -= entry.weight
      if (pick < 0) return { ok: true, result: toTableRollResult(table, entry) }
    }
    const last = table.entries[table.entries.length - 1]
    if (!last) return { ok: false, message: "这张表没有可抽取的项目。" }
    return { ok: true, result: toTableRollResult(table, last) }
  }

  const covered = randomCoveredValue(table.entries, random)
  if (!covered.ok) return covered
  return matchTableByValue(table, covered.value)
}

function randomCoveredValue(
  entries: RangeTableEntry[],
  random: RandomSource,
): { ok: true; value: number } | { ok: false; message: string } {
  for (const entry of entries) {
    if (!Number.isSafeInteger(entry.min) || !Number.isSafeInteger(entry.max) || entry.min > entry.max) {
      return { ok: false, message: "随机表的区间无效。" }
    }
  }
  if (rangesOverlap(entries)) {
    return { ok: false, message: "区间有重叠，无法随机抽取。" }
  }

  let total = 0
  for (const entry of entries) {
    total += entry.max - entry.min + 1
  }
  if (total > MAX_COVERED_VALUES) {
    return { ok: false, message: "区间太大，无法随机抽取。" }
  }

  let pick = randomIndex(total, random)
  for (const entry of entries) {
    const width = entry.max - entry.min + 1
    if (pick < width) return { ok: true, value: entry.min + pick }
    pick -= width
  }
  return { ok: false, message: "没有命中任何区间。" }
}

function rangesOverlap(entries: RangeTableEntry[]): boolean {
  const sorted = [...entries].sort((left, right) => left.min - right.min || left.max - right.max)
  for (let index = 1; index < sorted.length; index += 1) {
    const previous = sorted[index - 1]
    const current = sorted[index]
    if (previous && current && current.min <= previous.max) return true
  }
  return false
}

function randomIndex(total: number, random: RandomSource): number {
  return Math.floor(readRandomUnit(random) * total)
}
