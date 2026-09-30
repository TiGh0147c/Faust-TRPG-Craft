export const MAX_DICE_COUNT = 100
export const MAX_DIE_SIDES = 10_000
export const MAX_MODIFIER = 1_000_000

const DICE_EXPRESSION = /^\s*(\d*)\s*d\s*(\d+)\s*(?:([+-])\s*(\d+))?\s*$/i

export type ParsedDiceExpression = {
  count: number
  sides: number
  modifier: number
}

export type DiceParseOutcome =
  | { ok: true; value: ParsedDiceExpression }
  | { ok: false; message: string }

export function parseDiceExpression(input: string): DiceParseOutcome {
  const trimmed = input.trim()
  if (trimmed.length === 0) {
    return { ok: false, message: "请输入骰子表达式。" }
  }

  const match = DICE_EXPRESSION.exec(trimmed)
  if (!match) {
    return {
      ok: false,
      message: "无法识别表达式。示例：1d20、2d6+3、4d6-1。",
    }
  }

  const countText = match[1] ?? ""
  const sidesText = match[2] ?? ""
  const sign = match[3]
  const modifierText = match[4]

  const count = countText === "" ? 1 : Number(countText)
  const sides = Number(sidesText)
  const magnitude = modifierText === undefined ? 0 : Number(modifierText)
  const modifier = sign === "-" ? -magnitude : magnitude

  if (!Number.isSafeInteger(count)) {
    return { ok: false, message: "骰子数量无效。" }
  }
  if (count < 1) {
    return { ok: false, message: "骰子数量至少为 1。" }
  }
  if (count > MAX_DICE_COUNT) {
    return { ok: false, message: `骰子数量不能超过 ${MAX_DICE_COUNT}。` }
  }

  if (!Number.isSafeInteger(sides)) {
    return { ok: false, message: "骰子面数无效。" }
  }
  if (sides < 2) {
    return { ok: false, message: "骰子面数至少为 2。" }
  }
  if (sides > MAX_DIE_SIDES) {
    return { ok: false, message: `骰子面数不能超过 ${MAX_DIE_SIDES}。` }
  }

  if (!Number.isSafeInteger(magnitude) || magnitude > MAX_MODIFIER) {
    return { ok: false, message: `修正值不能超过 ${MAX_MODIFIER}。` }
  }

  return { ok: true, value: { count, sides, modifier } }
}

export function expressionWithSides(input: string, sides: number): string {
  const parsed = parseDiceExpression(input)
  if (!parsed.ok) return `1d${sides}`
  return formatDiceExpression({ ...parsed.value, sides })
}

export function composeDiceExpression(
  count: string,
  sides: string,
  modifier: string,
): { ok: true; expression: string } | { ok: false; message: string } {
  const countText = count.trim()
  const sidesText = sides.trim()
  const modifierText = modifier.trim()
  if (!/^\d+$/.test(sidesText)) {
    return { ok: false, message: sidesText === "" ? "请输入面数。" : "面数需要是整数。" }
  }
  if (!/^\d+$/.test(countText)) {
    return { ok: false, message: countText === "" ? "请输入颗数。" : "颗数需要是整数。" }
  }
  if (!/^-?\d+$/.test(modifierText)) {
    return { ok: false, message: modifierText === "" ? "请输入数值补正。" : "数值补正需要是整数。" }
  }
  const expression = formatDiceExpression({
    count: Number(countText),
    sides: Number(sidesText),
    modifier: Number(modifierText),
  })
  const parsed = parseDiceExpression(expression)
  if (!parsed.ok) return parsed
  return { ok: true, expression }
}

export function formatDiceExpression(parsed: ParsedDiceExpression): string {
  const base = `${parsed.count}d${parsed.sides}`
  if (parsed.modifier > 0) return `${base}+${parsed.modifier}`
  if (parsed.modifier < 0) return `${base}${parsed.modifier}`
  return base
}
