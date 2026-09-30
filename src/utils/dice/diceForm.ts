import { expressionWithSides, formatDiceExpression, parseDiceExpression } from "./parseDiceExpression.ts"

export type DiceFormValues = {
  name: string
  expression: string
  sides: string
  count: string
  modifier: string
}

export function diceForm(expression = "1d20", name = ""): DiceFormValues {
  const parsed = parseDiceExpression(expression)
  if (!parsed.ok) return { name, expression, sides: "20", count: "1", modifier: "0" }
  return {
    name,
    expression,
    sides: String(parsed.value.sides),
    count: String(parsed.value.count),
    modifier: String(parsed.value.modifier),
  }
}

export function withExpression(form: DiceFormValues, expression: string): DiceFormValues {
  const parsed = parseDiceExpression(expression)
  if (!parsed.ok) return { ...form, expression }
  return {
    ...form,
    expression,
    sides: String(parsed.value.sides),
    count: String(parsed.value.count),
    modifier: String(parsed.value.modifier),
  }
}

export function withField(
  form: DiceFormValues,
  field: "sides" | "count" | "modifier",
  value: string,
): DiceFormValues {
  const sides = field === "sides" ? value : form.sides
  const count = field === "count" ? value : form.count
  const modifier = field === "modifier" ? value : form.modifier
  const next = { ...form, sides, count, modifier }
  if (!/^\d+$/.test(count.trim()) || !/^\d+$/.test(sides.trim()) || !/^-?\d+$/.test(modifier.trim())) return next
  const formatted = formatDiceExpression({
    count: Number(count),
    sides: Number(sides),
    modifier: Number(modifier),
  })
  if (!parseDiceExpression(formatted).ok) return next
  return { ...next, expression: formatted }
}

export function withPreset(form: DiceFormValues, sides: number): DiceFormValues {
  return withExpression(form, expressionWithSides(form.expression, sides))
}
