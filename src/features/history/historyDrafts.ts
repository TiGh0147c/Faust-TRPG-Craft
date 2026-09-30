import type { HistoryDraft } from "../../services/storage/mutateHistory.ts"
import type { DiceRollResult } from "../../types/dice.ts"
import type { Entry } from "../../types/entry.ts"
import type { TableRollResult, TableSequenceResult } from "../../types/table.ts"
import { formatSequence } from "../../utils/collection/orderCollection.ts"
import { formatDiceResult } from "../../utils/dice/formatDiceResult.ts"
import { formatEntry } from "../../utils/entry/formatEntry.ts"
import { formatTableResult } from "../../utils/table/formatTableResult.ts"
import type { GeneratorRunResult } from "../generators/runGenerator.ts"
import type { PipelineResult } from "../pipeline/composePipeline.ts"
import { formatPipelineResult } from "../pipeline/formatPipeline.ts"

export function attachNote(draft: HistoryDraft, note: string): HistoryDraft {
  const trimmed = note.trim()
  if (!trimmed) return draft
  return { ...draft, note: trimmed }
}

export function diceHistoryDraft(result: DiceRollResult, note = ""): HistoryDraft {
  return attachNote(
    {
      kind: "dice",
      input: result.expression,
      output: formatDiceResult(result),
      diceResult: result,
    },
    note,
  )
}

export function tableHistoryDraft(
  result: TableRollResult,
  entry: Entry | undefined,
  source: "match" | "draw" | "expression",
  expression = "",
  note = "",
  dice?: DiceRollResult,
): HistoryDraft {
  const input =
    source === "draw"
      ? result.value === undefined
        ? "随机抽取"
        : `随机抽取 ${result.value}`
      : source === "expression"
        ? expression
        : result.value === undefined
          ? result.tableName
          : String(result.value)
  const draft: HistoryDraft = {
    kind: "table",
    input,
    output: dice ? `${formatTableResult(result, entry)}\n${formatDiceResult(dice)}` : formatTableResult(result, entry),
  }
  if (dice) draft.diceResult = dice
  return attachNote(draft, note)
}

export function sequenceSummary(result: TableSequenceResult): string {
  if (result.action === "order") {
    return result.prefix ? `${result.tableName} 随机排序前 ${result.prefix}` : `${result.tableName} 随机排序`
  }
  return `${result.tableName} 抽取 ${result.rows.length}，每项最多 ${result.limit ?? 1}`
}

export function tableSequenceHistoryDraft(result: TableSequenceResult, note = ""): HistoryDraft {
  const summary = sequenceSummary(result)
  return attachNote(
    {
      kind: "table",
      input: summary,
      output: formatSequence(summary, result.rows.map((row) => row.text)),
    },
    note,
  )
}

export function pipelineHistoryDraft(result: PipelineResult): HistoryDraft {
  const draft: HistoryDraft = {
    kind: "pipeline",
    input: result.source.kind === "dice" ? result.source.dice.expression : String(result.value),
    output: formatPipelineResult(result),
  }
  if (result.source.kind === "dice") draft.diceResult = result.source.dice
  return draft
}

export function generatorHistoryDraft(result: GeneratorRunResult, note = ""): HistoryDraft {
  const lines = [result.output]
  for (const step of result.steps) {
    if (!step.dice) continue
    lines.push("", step.label, formatDiceResult(step.dice))
  }
  const diceSteps = result.steps.flatMap((step) => (step.dice ? [step.dice] : []))
  const draft: HistoryDraft = {
    kind: "generator",
    input: result.generatorName,
    output: lines.join("\n"),
  }
  if (diceSteps.length === 1) draft.diceResult = diceSteps[0]
  return attachNote(draft, note)
}

export function entryHistoryDraft(entry: Entry, note = ""): HistoryDraft {
  return attachNote(
    {
      kind: "entry",
      input: "随机抽取",
      output: formatEntry(entry),
    },
    note,
  )
}

export function collectionHistoryDraft(input: string, values: readonly number[], note = ""): HistoryDraft {
  return attachNote(
    {
      kind: "collection",
      input,
      output: formatSequence(input, values),
    },
    note,
  )
}
