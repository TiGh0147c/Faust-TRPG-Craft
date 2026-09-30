import type { RandomTable, TableSequenceResult } from "../../types/table.ts"
import { drawByWeight, orderBySortWeight } from "../collection/orderCollection.ts"
import { SORT_WEIGHT_OFF, type SortWeightSetting } from "../collection/sortWeight.ts"
import type { RandomSource } from "../random.ts"

export function orderCollectionTable(
  table: RandomTable,
  random: RandomSource = Math.random,
  ids?: readonly string[],
  prefix?: number,
  sortWeight: SortWeightSetting = SORT_WEIGHT_OFF,
): { ok: true; result: TableSequenceResult } | { ok: false; message: string } {
  if (table.mode !== "collection") return { ok: false, message: "这张表不是集合。" }
  const picked = pickEntries(table, ids)
  if (!picked.ok) return picked
  const ordered = orderBySortWeight(
    picked.entries,
    picked.entries.map((entry) => entry.weight),
    sortWeight,
    random,
  )
  if (prefix === undefined) {
    return { ok: true, result: { tableId: table.id, tableName: table.name, action: "order", rows: ordered } }
  }
  if (!Number.isSafeInteger(prefix) || prefix < 1) return { ok: false, message: "输出个数至少为 1。" }
  if (prefix > ordered.length) return { ok: false, message: "输出个数不能超过集合大小。" }
  return {
    ok: true,
    result: { tableId: table.id, tableName: table.name, action: "order", rows: ordered.slice(0, prefix), prefix },
  }
}

export function drawCollectionTable(
  table: RandomTable,
  countText: string,
  limitText: string,
  random: RandomSource = Math.random,
  ids?: readonly string[],
): { ok: true; result: TableSequenceResult } | { ok: false; message: string } {
  if (table.mode !== "collection") return { ok: false, message: "这张表不是集合。" }
  const picked = pickEntries(table, ids)
  if (!picked.ok) return picked
  const tableEntries = picked.entries
  const count = readPositive(countText, "请输入抽取个数。", "抽取个数需要是整数。", "抽取个数至少为 1。")
  if (!count.ok) return count
  const limit = readPositive(limitText, "请输入每项最多抽取次数。", "每项最多抽取次数需要是整数。", "每项最多抽取次数至少为 1。")
  if (!limit.ok) return limit
  const drawn = drawByWeight(
    tableEntries,
    tableEntries.map((entry) => entry.weight),
    count.value,
    limit.value,
    random,
  )
  if (!drawn.ok) return drawn
  return {
    ok: true,
    result: { tableId: table.id, tableName: table.name, action: "draw", rows: drawn.values, limit: limit.value },
  }
}

function pickEntries(table: RandomTable, ids: readonly string[] | undefined) {
  if (table.mode !== "collection") return { ok: false as const, message: "这张表不是集合。" }
  const entries = ids ? table.entries.filter((entry) => ids.includes(entry.id)) : table.entries
  if (entries.length === 0) {
    return { ok: false as const, message: ids ? "请至少开启一项。" : "这张表没有可抽取的项目。" }
  }
  if (entries.some((entry) => !Number.isFinite(entry.weight) || entry.weight <= 0)) {
    return { ok: false as const, message: "权重必须大于 0。" }
  }
  return { ok: true as const, entries }
}

function readPositive(
  input: string,
  empty: string,
  invalid: string,
  tooSmall: string,
): { ok: true; value: number } | { ok: false; message: string } {
  const trimmed = input.trim()
  if (trimmed === "") return { ok: false, message: empty }
  if (!/^\d+$/.test(trimmed)) return { ok: false, message: invalid }
  const value = Number(trimmed)
  if (!Number.isSafeInteger(value)) return { ok: false, message: invalid }
  if (value < 1) return { ok: false, message: tooSmall }
  return { ok: true, value }
}
