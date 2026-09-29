import type { HistoryDraft } from "../../services/storage/mutateHistory.ts"
import type { DiceRollResult } from "../../types/dice.ts"
import type { Entry } from "../../types/entry.ts"
import type { TableRollResult } from "../../types/table.ts"
import { formatDiceResult } from "../../utils/dice/formatDiceResult.ts"
import { formatTableResult } from "../../utils/table/formatTableResult.ts"
import type { GeneratorRunResult } from "../generators/runGenerator.ts"
import type { PipelineResult } from "../pipeline/composePipeline.ts"
import { formatPipelineResult } from "../pipeline/formatPipeline.ts"

export function diceHistoryDraft(result: DiceRollResult): HistoryDraft {
  return {
    kind: "dice",
    input: result.expression,
    output: formatDiceResult(result),
    diceResult: result,
  }
}

export function tableHistoryDraft(
  result: TableRollResult,
  entry: Entry | undefined,
  source: "match" | "draw",
): HistoryDraft {
  const input =
    source === "draw"
      ? result.value === undefined
        ? "随机抽取"
        : `随机抽取 ${result.value}`
      : result.value === undefined
        ? result.tableName
        : String(result.value)
  return {
    kind: "table",
    input,
    output: formatTableResult(result, entry),
  }
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

export function generatorHistoryDraft(result: GeneratorRunResult): HistoryDraft {
  return {
    kind: "generator",
    input: result.generatorName,
    output: result.output,
  }
}
