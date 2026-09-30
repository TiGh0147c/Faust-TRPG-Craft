import { readRandomUnit, type RandomSource } from "../random.ts"
import { SORT_WEIGHT_OFF, type SortWeightSetting } from "./sortWeight.ts"

export const MAX_COLLECTION_SIZE = 10_000

export function collectionFromRange(
  startText: string,
  endText: string,
): { ok: true; values: number[] } | { ok: false; message: string } {
  const start = readInteger(startText, "请输入起始。", "起始需要是整数。")
  if (!start.ok) return start
  const end = readInteger(endText, "请输入结束。", "结束需要是整数。")
  if (!end.ok) return end
  if (start.value > end.value) return { ok: false, message: "起始不能大于结束。" }
  const size = end.value - start.value + 1
  if (size > MAX_COLLECTION_SIZE) return { ok: false, message: "区间太大，无法生成。" }
  return { ok: true, values: Array.from({ length: size }, (_, index) => start.value + index) }
}

export type NamedCollectionItem = {
  name: string
  weight: number
}

export function readNamedItems(
  rows: readonly { name: string; weight: string }[],
): { ok: true; items: NamedCollectionItem[] } | { ok: false; message: string } {
  if (rows.length === 0) return { ok: false, message: "请至少加入一项。" }
  if (rows.length > MAX_COLLECTION_SIZE) return { ok: false, message: "元素太多，无法生成。" }
  const items: NamedCollectionItem[] = []
  for (const row of rows) {
    const name = row.name.trim() || `元素 ${items.length + 1}`
    const weight = readWeight(row.weight)
    if (!weight.ok) return weight
    items.push({ name, weight: weight.value })
  }
  return { ok: true, items }
}

export function shuffleItems<T>(items: readonly T[], random: RandomSource = Math.random): T[] {
  const next = [...items]
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(readRandomUnit(random) * (index + 1))
    const current = next[index]
    const other = next[swap]
    if (current === undefined || other === undefined) continue
    next[index] = other
    next[swap] = current
  }
  return next
}

export function shuffleValues(values: readonly number[], random: RandomSource = Math.random): number[] {
  return shuffleItems(values, random)
}

export function readOrderCount(
  input: string,
  size: number,
): { ok: true; value: number } | { ok: false; message: string } {
  const trimmed = input.trim()
  if (trimmed === "") return { ok: false, message: "请输入输出个数。" }
  if (!/^\d+$/.test(trimmed)) return { ok: false, message: "输出个数需要是整数。" }
  const value = Number(trimmed)
  if (!Number.isSafeInteger(value)) return { ok: false, message: "输出个数需要是整数。" }
  if (value < 1) return { ok: false, message: "输出个数至少为 1。" }
  if (value > size) return { ok: false, message: "输出个数不能超过集合大小。" }
  return { ok: true, value }
}

export function orderBySortWeight<T>(
  items: readonly T[],
  weights: readonly number[],
  setting: SortWeightSetting = SORT_WEIGHT_OFF,
  random: RandomSource = Math.random,
): T[] {
  if (!setting.enabled) return shuffleItems(items, random)
  const ordered = shuffleByWeight(items, weights, random)
  return setting.bias === "back" ? [...ordered].reverse() : ordered
}

export function shuffleByWeight<T>(items: readonly T[], weights: readonly number[], random: RandomSource = Math.random): T[] {
  if (weightsEqual(weights)) return shuffleItems(items, random)
  const pool = items.map((item, index) => ({ item, weight: weights[index] ?? 0 }))
  const ordered: T[] = []
  while (pool.length > 0) {
    const index = pickWeighted(pool.map((entry) => entry.weight), random)
    const chosen = pool.splice(index, 1)[0]
    if (!chosen) break
    ordered.push(chosen.item)
  }
  return ordered
}

export function drawWithCap<T>(items: readonly T[], count: number, limit: number, random: RandomSource = Math.random): T[] {
  const bag = items.flatMap((item) => Array.from({ length: limit }, () => item))
  return shuffleItems(bag, random).slice(0, count)
}

export function drawByWeight<T>(
  items: readonly T[],
  weights: readonly number[],
  count: number,
  limit: number,
  random: RandomSource = Math.random,
): { ok: true; values: T[] } | { ok: false; message: string } {
  if (items.length === 0) return { ok: false, message: "集合是空的。" }
  if (count < 1) return { ok: false, message: "抽取个数至少为 1。" }
  if (limit < 1) return { ok: false, message: "每项最多抽取次数至少为 1。" }
  if (count > items.length * limit) return { ok: false, message: "抽取个数超过了每个元素允许出现的次数。" }
  if (count > MAX_COLLECTION_SIZE) return { ok: false, message: "抽取个数太大。" }
  if (weightsEqual(weights)) return { ok: true, values: drawWithCap(items, count, limit, random) }

  const remaining = items.map(() => limit)
  const values: T[] = []
  for (let drawn = 0; drawn < count; drawn += 1) {
    const available = items.flatMap((_, index) => ((remaining[index] ?? 0) > 0 ? [index] : []))
    const index = pickWeighted(
      available.map((itemIndex) => weights[itemIndex] ?? 0),
      random,
    )
    const chosen = available[index]
    const item = chosen === undefined ? undefined : items[chosen]
    if (chosen === undefined || item === undefined) return { ok: false, message: "集合是空的。" }
    remaining[chosen] = (remaining[chosen] ?? 0) - 1
    values.push(item)
  }
  return { ok: true, values }
}

export function formatSequenceHeadline(action: "order" | "draw", values: readonly (string | number)[]): string {
  return values.map(String).join(action === "order" ? " -> " : " & ")
}

export function formatSequence(summary: string, values: readonly (string | number)[], action: "order" | "draw"): string {
  const lines = [summary, `最终结果：${formatSequenceHeadline(action, values)}`, `个数：${values.length}`]
  values.forEach((value, index) => {
    lines.push(`${index + 1}. ${value}`)
  })
  return lines.join("\n")
}

export function drawLimited(
  values: readonly number[],
  countText: string,
  limitText: string,
  random: RandomSource = Math.random,
): { ok: true; values: number[] } | { ok: false; message: string } {
  if (values.length === 0) return { ok: false, message: "集合是空的。" }
  const request = readDrawRequest(countText, limitText, values.length)
  if (!request.ok) return request
  return { ok: true, values: drawWithCap(values, request.count, request.limit, random) }
}

export function drawWeightedLimited<T>(
  items: readonly T[],
  weights: readonly number[],
  countText: string,
  limitText: string,
  random: RandomSource = Math.random,
): { ok: true; values: T[] } | { ok: false; message: string } {
  if (items.length === 0) return { ok: false, message: "集合是空的。" }
  const request = readDrawRequest(countText, limitText, items.length)
  if (!request.ok) return request
  return drawByWeight(items, weights, request.count, request.limit, random)
}

function weightsEqual(weights: readonly number[]): boolean {
  const first = weights[0]
  return weights.every((weight) => weight === first)
}

function pickWeighted(weights: readonly number[], random: RandomSource): number {
  const total = weights.reduce((sum, weight) => sum + weight, 0)
  let cursor = readRandomUnit(random) * total
  for (let index = 0; index < weights.length; index += 1) {
    cursor -= weights[index] ?? 0
    if (cursor < 0) return index
  }
  return Math.max(0, weights.length - 1)
}

function readWeight(input: string): { ok: true; value: number } | { ok: false; message: string } {
  const trimmed = input.trim()
  if (trimmed === "") return { ok: false, message: "请输入权重。" }
  const value = Number(trimmed)
  if (!Number.isFinite(value) || value <= 0) return { ok: false, message: "权重必须大于 0。" }
  return { ok: true, value }
}

function readDrawRequest(
  countText: string,
  limitText: string,
  size: number,
): { ok: true; count: number; limit: number } | { ok: false; message: string } {
  const count = readInteger(countText, "请输入抽取个数。", "抽取个数需要是整数。")
  if (!count.ok) return count
  const limit = readInteger(limitText, "请输入每项最多抽取次数。", "每项最多抽取次数需要是整数。")
  if (!limit.ok) return limit
  if (count.value < 1) return { ok: false, message: "抽取个数至少为 1。" }
  if (limit.value < 1) return { ok: false, message: "每项最多抽取次数至少为 1。" }
  if (count.value > size * limit.value) {
    return { ok: false, message: "抽取个数超过了每个元素允许出现的次数。" }
  }
  if (count.value > MAX_COLLECTION_SIZE) return { ok: false, message: "抽取个数太大。" }
  return { ok: true, count: count.value, limit: limit.value }
}

function readInteger(
  input: string,
  empty: string,
  invalid: string,
): { ok: true; value: number } | { ok: false; message: string } {
  const trimmed = input.trim()
  if (trimmed === "") return { ok: false, message: empty }
  if (!/^-?\d+$/.test(trimmed)) return { ok: false, message: invalid }
  const value = Number(trimmed)
  if (!Number.isSafeInteger(value)) return { ok: false, message: invalid }
  return { ok: true, value }
}
