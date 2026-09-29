import type { DiceRollResult } from "../../types/dice.ts"
import type { Entry } from "../../types/entry.ts"
import type { RandomTable, TableRollResult } from "../../types/table.ts"
import { resolveLinkedEntry } from "../../utils/entry/resolveLinkedEntry.ts"
import { rollDice, type RandomSource } from "../../utils/dice/rollDice.ts"
import { matchTableByValue, matchTableInput } from "../../utils/table/matchTable.ts"

export type PipelineSource =
  | { kind: "value"; value: number }
  | { kind: "dice"; dice: DiceRollResult }

export type PipelineResult = {
  tableId: string
  tableName: string
  source: PipelineSource
  value: number
  min: number
  max: number
  rowId: string
  rowText: string
  entry: Entry | null
  missingEntryId?: string
  output: string
  summary: string
}

export type PipelineOutcome =
  | { ok: true; result: PipelineResult }
  | { ok: false; message: string }

export function composeValuePipeline(
  table: RandomTable,
  entries: readonly Entry[],
  raw: string,
): PipelineOutcome {
  const matched = matchTableInput(table, raw)
  if (!matched.ok) return matched
  if (matched.result.value === undefined) return { ok: false, message: "随机表的区间无效。" }
  return composeFromMatch(entries, matched.result, { kind: "value", value: matched.result.value })
}

export function composeDicePipeline(
  table: RandomTable,
  entries: readonly Entry[],
  expression: string,
  random: RandomSource = Math.random,
): PipelineOutcome {
  const rolled = rollDice(expression, random)
  if (!rolled.ok) return rolled
  const matched = matchTableByValue(table, rolled.result.total)
  if (!matched.ok) return matched
  return composeFromMatch(entries, matched.result, { kind: "dice", dice: rolled.result })
}

function composeFromMatch(
  entries: readonly Entry[],
  roll: TableRollResult,
  source: PipelineSource,
): PipelineOutcome {
  if (roll.value === undefined || roll.min === undefined || roll.max === undefined) {
    return { ok: false, message: "随机表的区间无效。" }
  }
  const value = source.kind === "dice" ? source.dice.total : source.value
  if (value !== roll.value) return { ok: false, message: "匹配数值不一致。" }

  const linked = resolveLinkedEntry(roll.entryId, entries)
  const entry = linked.status === "found" ? linked.entry : null
  const missingEntryId = linked.status === "missing" ? linked.entryId : undefined
  const output = entry?.content ?? roll.text
  const head = source.kind === "dice" ? `${source.dice.expression} → ${value}` : String(value)

  return {
    ok: true,
    result: {
      tableId: roll.tableId,
      tableName: roll.tableName,
      source,
      value,
      min: roll.min,
      max: roll.max,
      rowId: roll.rowId,
      rowText: roll.text,
      entry,
      missingEntryId,
      output,
      summary: `${head} → ${roll.min}-${roll.max} → ${output}`,
    },
  }
}
