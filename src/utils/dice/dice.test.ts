import { describe, expect, it } from "vitest"
import { formatDiceResult } from "./formatDiceResult.ts"
import {
  MAX_DICE_COUNT,
  MAX_DIE_SIDES,
  MAX_MODIFIER,
  parseDiceExpression,
} from "./parseDiceExpression.ts"
import { rollDice, type RandomSource } from "./rollDice.ts"

function sequence(values: number[]): RandomSource {
  let index = 0
  return () => {
    const value = values[index]
    index += 1
    return value ?? 0
  }
}

describe("parseDiceExpression", () => {
  it("parses NdM, NdM+X, and NdM-X", () => {
    expect(parseDiceExpression("1d20")).toEqual({
      ok: true,
      value: { count: 1, sides: 20, modifier: 0 },
    })
    expect(parseDiceExpression("2d6+3")).toEqual({
      ok: true,
      value: { count: 2, sides: 6, modifier: 3 },
    })
    expect(parseDiceExpression("4d6-1")).toEqual({
      ok: true,
      value: { count: 4, sides: 6, modifier: -1 },
    })
  })

  it("treats a missing count as 1 and ignores surrounding spaces and case", () => {
    expect(parseDiceExpression("d20")).toEqual({
      ok: true,
      value: { count: 1, sides: 20, modifier: 0 },
    })
    expect(parseDiceExpression("  2D6 + 3  ")).toEqual({
      ok: true,
      value: { count: 2, sides: 6, modifier: 3 },
    })
  })

  it("rejects expressions outside the supported form", () => {
    expect(parseDiceExpression("")).toMatchObject({ ok: false })
    expect(parseDiceExpression("   ")).toMatchObject({ ok: false })
    expect(parseDiceExpression("abc")).toMatchObject({ ok: false })
    expect(parseDiceExpression("2d6+")).toMatchObject({ ok: false })
    expect(parseDiceExpression("2d6+3+1")).toMatchObject({ ok: false })
    expect(parseDiceExpression("0d6")).toMatchObject({
      ok: false,
      message: "骰子数量至少为 1。",
    })
    expect(parseDiceExpression("2d1")).toMatchObject({
      ok: false,
      message: "骰子面数至少为 2。",
    })
    expect(parseDiceExpression(`${MAX_DICE_COUNT + 1}d6`)).toMatchObject({
      ok: false,
    })
    expect(parseDiceExpression(`1d${MAX_DIE_SIDES + 1}`)).toMatchObject({
      ok: false,
    })
    expect(parseDiceExpression(`1d6+${MAX_MODIFIER + 1}`)).toMatchObject({
      ok: false,
    })
  })
})

describe("rollDice", () => {
  it("returns each roll, the subtotal, the modifier, and the total", () => {
    const outcome = rollDice("2d6+3", sequence([0, 0.999]))
    expect(outcome).toEqual({
      ok: true,
      result: {
        expression: "2d6+3",
        rolls: [
          { sides: 6, value: 1 },
          { sides: 6, value: 6 },
        ],
        subtotal: 7,
        modifier: 3,
        total: 10,
      },
    })
  })

  it("applies a negative modifier", () => {
    const outcome = rollDice("4d6-1", sequence([0, 0.5, 0.999, 0]))
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.result.rolls.map((roll) => roll.value)).toEqual([1, 4, 6, 1])
    expect(outcome.result.subtotal).toBe(12)
    expect(outcome.result.modifier).toBe(-1)
    expect(outcome.result.total).toBe(11)
    expect(outcome.result.expression).toBe("4d6-1")
  })

  it("keeps a plain roll free of a modifier", () => {
    const outcome = rollDice("1d20", sequence([0.5]))
    expect(outcome).toMatchObject({
      ok: true,
      result: {
        expression: "1d20",
        rolls: [{ sides: 20, value: 11 }],
        subtotal: 11,
        modifier: 0,
        total: 11,
      },
    })
  })

  it("returns the parser error without rolling", () => {
    expect(rollDice("abc", () => {
      throw new Error("should not roll")
    })).toMatchObject({
      ok: false,
      message: "无法识别表达式。示例：1d20、2d6+3、4d6-1。",
    })
  })
})

describe("formatDiceResult", () => {
  it("writes a copyable summary", () => {
    expect(
      formatDiceResult({
        expression: "4d6-1",
        rolls: [
          { sides: 6, value: 1 },
          { sides: 6, value: 4 },
          { sides: 6, value: 6 },
          { sides: 6, value: 1 },
        ],
        subtotal: 12,
        modifier: -1,
        total: 11,
      }),
    ).toBe(["4d6-1", "骰子：1、4、6、1", "基础总值：12", "修正值：-1", "最终结果：11"].join("\n"))
  })
})
