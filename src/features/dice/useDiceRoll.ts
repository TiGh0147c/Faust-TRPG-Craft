import { useState } from "react"
import type { DiceRollResult } from "../../types/dice.ts"
import { rollDice } from "../../utils/dice/index.ts"

export function useDiceRoll(initialExpression = "1d20") {
  const [expression, setExpression] = useState(initialExpression)
  const [customSides, setCustomSides] = useState("20")
  const [result, setResult] = useState<DiceRollResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function rollInput(input: string) {
    const outcome = rollDice(input)
    if (!outcome.ok) {
      setResult(null)
      setError(outcome.message)
      return outcome
    }
    setError(null)
    setResult(outcome.result)
    setExpression(outcome.result.expression)
    return outcome
  }

  function rollExpression() {
    return rollInput(expression)
  }

  function rollPreset(sides: number) {
    return rollInput(`1d${sides}`)
  }

  function rollCustom() {
    const trimmed = customSides.trim()
    if (!/^\d+$/.test(trimmed)) {
      setResult(null)
      const message = trimmed === "" ? "请输入面数。" : "面数需要是整数。"
      setError(message)
      return { ok: false as const, message }
    }
    return rollInput(`1d${trimmed}`)
  }

  return {
    expression,
    setExpression,
    customSides,
    setCustomSides,
    result,
    error,
    rollExpression,
    rollPreset,
    rollCustom,
  }
}
