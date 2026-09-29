import type { DiceRollResult } from "../../types/dice.ts"

export function formatModifier(modifier: number): string {
  if (modifier > 0) return `+${modifier}`
  return String(modifier)
}

export function formatDiceResult(result: DiceRollResult): string {
  const rolls = result.rolls.map((roll) => String(roll.value)).join("、")
  return [
    result.expression,
    `骰子：${rolls}`,
    `基础总值：${result.subtotal}`,
    `修正值：${formatModifier(result.modifier)}`,
    `最终结果：${result.total}`,
  ].join("\n")
}
