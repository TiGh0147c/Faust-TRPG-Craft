import { useState } from "react"
import type { DiceRollResult } from "../../types/dice.ts"
import {
  applyDiceFloor,
  composeDiceExpression,
  DICE_FLOOR_OFF,
  expressionWithSides,
  formatDiceExpression,
  parseDiceExpression,
  rollDice,
  type DiceFloorSetting,
} from "../../utils/dice/index.ts"

export const DEFAULT_DICE_EXPRESSION = "1d100"

export function useDiceRoll(initial?: string | { expression?: string; sides?: string; count?: string; modifier?: string }) {
  const fields = typeof initial === "string" ? { expression: initial } : initial
  const initialExpression = fields?.expression ?? DEFAULT_DICE_EXPRESSION
  const initialParsed = parseDiceExpression(initialExpression)
  const [expression, setExpression] = useState(initialExpression)
  const [customSides, setCustomSides] = useState(
    fields?.sides ?? (initialParsed.ok ? String(initialParsed.value.sides) : "100"),
  )
  const [customCount, setCustomCount] = useState(
    fields?.count ?? (initialParsed.ok ? String(initialParsed.value.count) : "1"),
  )
  const [customModifier, setCustomModifier] = useState(
    fields?.modifier ?? (initialParsed.ok ? String(initialParsed.value.modifier) : "0"),
  )
  const [result, setResult] = useState<DiceRollResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function applyParsed(input: string) {
    const parsed = parseDiceExpression(input)
    if (!parsed.ok) return
    setCustomSides(String(parsed.value.sides))
    setCustomCount(String(parsed.value.count))
    setCustomModifier(String(parsed.value.modifier))
  }

  function updateExpression(value: string) {
    setExpression(value)
    applyParsed(value)
  }

  function writeExpression(sides: string, count: string, modifier: string) {
    if (!/^\d+$/.test(count.trim()) || !/^\d+$/.test(sides.trim()) || !/^-?\d+$/.test(modifier.trim())) return
    const formatted = formatDiceExpression({
      count: Number(count),
      sides: Number(sides),
      modifier: Number(modifier),
    })
    if (!parseDiceExpression(formatted).ok) return
    setExpression(formatted)
  }

  function updateCustomSides(value: string) {
    setCustomSides(value)
    writeExpression(value, customCount, customModifier)
  }

  function updateCustomCount(value: string) {
    setCustomCount(value)
    writeExpression(customSides, value, customModifier)
  }

  function updateCustomModifier(value: string) {
    setCustomModifier(value)
    writeExpression(customSides, customCount, value)
  }

  function applyPreset(sides: number) {
    const next = expressionWithSides(expression, sides)
    setExpression(next)
    applyParsed(next)
  }

  function rollInput(input: string, floor: DiceFloorSetting) {
    const outcome = rollDice(input)
    if (!outcome.ok) {
      setResult(null)
      setError(outcome.message)
      return outcome
    }
    const result = applyDiceFloor(outcome.result, floor)
    setError(null)
    setResult(result)
    setExpression(result.expression)
    applyParsed(result.expression)
    return { ok: true as const, result }
  }

  function reset(next = DEFAULT_DICE_EXPRESSION) {
    const parsed = parseDiceExpression(next)
    setResult(null)
    setError(null)
    setExpression(next)
    if (!parsed.ok) return
    setCustomSides(String(parsed.value.sides))
    setCustomCount(String(parsed.value.count))
    setCustomModifier(String(parsed.value.modifier))
  }

  function rollExpression(floor: DiceFloorSetting = DICE_FLOOR_OFF) {
    return rollInput(expression, floor)
  }

  function rollFields() {
    const composed = composeDiceExpression(customCount, customSides, customModifier)
    if (!composed.ok) {
      setResult(null)
      setError(composed.message)
      return composed
    }
    return rollInput(composed.expression, DICE_FLOOR_OFF)
  }

  return {
    expression,
    setExpression: updateExpression,
    customSides,
    setCustomSides: updateCustomSides,
    customCount,
    setCustomCount: updateCustomCount,
    customModifier,
    setCustomModifier: updateCustomModifier,
    result,
    error,
    applyPreset,
    reset,
    rollExpression,
    rollFields,
  }
}
