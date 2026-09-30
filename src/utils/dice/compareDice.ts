import type { DiceRollResult } from "../../types/dice.ts"
import type { RandomSource } from "../random.ts"
import { formatDiceResult } from "./formatDiceResult.ts"
import { rollDice } from "./rollDice.ts"

export const MIN_COMPARE_COUNT = 2
export const MAX_COMPARE_COUNT = 20

export type CompareEntry = {
  name: string
  expression: string
}

export type NamedDiceRoll = {
  name: string
  result: DiceRollResult
}

export function readCompareCount(input: string): { ok: true; value: number } | { ok: false; message: string } {
  const text = input.trim()
  if (!/^\d+$/.test(text)) return { ok: false, message: "投掷次数至少为 2。" }
  const value = Number(text)
  if (value < MIN_COMPARE_COUNT) return { ok: false, message: "投掷次数至少为 2。" }
  if (value > MAX_COMPARE_COUNT) return { ok: false, message: `投掷次数不能超过 ${MAX_COMPARE_COUNT}。` }
  return { ok: true, value }
}

export function compareSlotLabel(name: string, index: number): string {
  const trimmed = name.trim()
  return trimmed || `第 ${index + 1} 组`
}

export function sortNamedDiceRolls(results: readonly NamedDiceRoll[]): NamedDiceRoll[] {
  return results
    .map((item, index) => ({ item, index }))
    .sort((left, right) => right.item.result.total - left.item.result.total || left.index - right.index)
    .map((entry) => entry.item)
}

export function rollDiceComparison(
  entries: readonly CompareEntry[],
  random: RandomSource = Math.random,
): { ok: true; ordered: NamedDiceRoll[]; results: NamedDiceRoll[] } | { ok: false; message: string } {
  const rolled: NamedDiceRoll[] = []
  for (const [index, entry] of entries.entries()) {
    const outcome = rollDice(entry.expression, random)
    if (!outcome.ok) return { ok: false, message: `${compareSlotLabel(entry.name, index)}：${outcome.message}` }
    rolled.push({ name: compareSlotLabel(entry.name, index), result: outcome.result })
  }
  return {
    ok: true,
    ordered: rolled,
    results: sortNamedDiceRolls(rolled),
  }
}

export function formatComparisonScore(total: number): string {
  return `[ ${total} ]`
}

export function formatComparisonSummary(results: readonly NamedDiceRoll[]): string {
  return results.map((item) => `${item.name} ${formatComparisonScore(item.result.total)}`).join(" > ")
}

export function formatDiceComparison(results: readonly NamedDiceRoll[]): string {
  const details = results
    .map((item, index) => {
      const lines = formatDiceResult(item.result).split("\n")
      return [`${index + 1}. ${item.name}`, ...lines].join("\n")
    })
    .join("\n\n")
  return `${formatComparisonSummary(results)}\n\n${details}`
}

export function formatComparisonInput(ordered: readonly NamedDiceRoll[]): string {
  const parts = ordered.map((item) => (item.name ? `${item.name}：${item.result.expression}` : item.result.expression))
  return `多次比较 ${parts.join("、")}`
}
