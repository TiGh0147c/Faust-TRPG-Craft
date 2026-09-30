import { useState } from "react"
import type { DiceRollResult } from "../../types/dice.ts"
import { expressionWithSides, formatDiceExpression, parseDiceExpression, rollDice } from "../../utils/dice/index.ts"

export function useDiceRoll(initialExpression = "1d20") {
  const initial = parseDiceExpression(initialExpression)
  const [expression, setExpression] = useState(initialExpression)
  const [customSides, setCustomSides] = useState(initial.ok ? String(initial.value.sides) : "20")
  const [customCount, setCustomCount] = useState(initial.ok ? String(initial.value.count) : "1")
  const [customModifier, setCustomModifier] = useState(initial.ok ? String(initial.value.modifier) : "0")
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
    applyParsed(outcome.result.expression)
    return outcome
  }

  function rollExpression() {
    return rollInput(expression)
  }

  function rollFields() {
    const sides = customSides.trim()
    const count = customCount.trim()
    const modifier = customModifier.trim()
    if (!/^\d+$/.test(sides)) {
      const message = sides === "" ? "请输入面数。" : "面数需要是整数。"
      setResult(null)
      setError(message)
      return { ok: false as const, message }
    }
    if (!/^\d+$/.test(count)) {
      const message = count === "" ? "请输入颗数。" : "颗数需要是整数。"
      setResult(null)
      setError(message)
      return { ok: false as const, message }
    }
    if (!/^-?\d+$/.test(modifier)) {
      const message = modifier === "" ? "请输入数值补正。" : "数值补正需要是整数。"
      setResult(null)
      setError(message)
      return { ok: false as const, message }
    }
    return rollInput(
      formatDiceExpression({ count: Number(count), sides: Number(sides), modifier: Number(modifier) }),
    )
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
    rollExpression,
    rollFields,
  }
}
