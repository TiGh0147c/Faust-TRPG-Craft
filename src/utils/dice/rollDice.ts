import type { DiceRollResult } from "../../types/dice.ts"
import { readRandomUnit, type RandomSource } from "../random.ts"
import {
  formatDiceExpression,
  parseDiceExpression,
} from "./parseDiceExpression.ts"

export type { RandomSource }

export type DiceRollOutcome =
  | { ok: true; result: DiceRollResult }
  | { ok: false; message: string }

export function rollDice(
  input: string,
  random: RandomSource = Math.random,
): DiceRollOutcome {
  const parsed = parseDiceExpression(input)
  if (!parsed.ok) return parsed

  const { count, sides, modifier } = parsed.value
  const rolls = Array.from({ length: count }, () => ({
    sides,
    value: rollOne(sides, random),
  }))
  const subtotal = rolls.reduce((sum, roll) => sum + roll.value, 0)

  return {
    ok: true,
    result: {
      expression: formatDiceExpression(parsed.value),
      rolls,
      subtotal,
      modifier,
      total: subtotal + modifier,
    },
  }
}

function rollOne(sides: number, random: RandomSource): number {
  return Math.floor(readRandomUnit(random) * sides) + 1
}
