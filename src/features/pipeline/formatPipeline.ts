import { formatModifier } from "../../utils/dice/formatDiceResult.ts"
import type { PipelineResult } from "./composePipeline.ts"

export function formatPipelineResult(result: PipelineResult): string {
  const lines: string[] = []
  if (result.source.kind === "dice") {
    const dice = result.source.dice
    lines.push(`${dice.expression} → ${result.value}`)
    lines.push(`骰子：${dice.rolls.map((roll) => String(roll.value)).join("、")}`)
    lines.push(`基础总值：${dice.subtotal}`)
    lines.push(`修正值：${formatModifier(dice.modifier)}`)
  } else {
    lines.push(String(result.value))
  }
  lines.push(`匹配 ${result.min}-${result.max}`)
  lines.push(`表项：${result.rowText}`)
  if (result.entry) {
    lines.push(`词条：${result.entry.name}`, result.entry.content)
  } else if (result.missingEntryId) {
    lines.push(`未找到关联词条（${result.missingEntryId}）。`)
  }
  return lines.join("\n")
}
