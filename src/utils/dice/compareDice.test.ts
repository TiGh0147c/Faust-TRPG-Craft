import { describe, expect, it } from "vitest"
import { formatDiceComparison, readCompareCount, rollDiceComparison } from "./compareDice.ts"
import type { RandomSource } from "./rollDice.ts"

function sequence(values: number[]): RandomSource {
  let index = 0
  return () => {
    const value = values[index]
    index += 1
    return value ?? 0
  }
}

describe("dice comparison", () => {
  it("accepts a count from 2 through 20", () => {
    expect(readCompareCount("2")).toEqual({ ok: true, value: 2 })
    expect(readCompareCount(" 20 ")).toEqual({ ok: true, value: 20 })
    expect(readCompareCount("1")).toMatchObject({ ok: false, message: "投掷次数至少为 2。" })
    expect(readCompareCount("")).toMatchObject({ ok: false, message: "投掷次数至少为 2。" })
    expect(readCompareCount("21")).toMatchObject({ ok: false, message: "投掷次数不能超过 20。" })
  })

  it("rolls every expression and sorts totals from high to low", () => {
    const outcome = rollDiceComparison(
      [
        { name: "甲", expression: "1d20" },
        { name: "乙", expression: "1d6" },
        { name: " 丙 ", expression: "2d6+3" },
      ],
      sequence([0.95, 0, 0, 0]),
    )
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.ordered.map((item) => item.result.expression)).toEqual(["1d20", "1d6", "2d6+3"])
    expect(outcome.results.map((item) => item.result.total)).toEqual([20, 5, 1])
    expect(outcome.results.map((item) => item.name)).toEqual(["甲", "丙", "乙"])
    const formatted = formatDiceComparison(outcome.results).split("\n\n")
    expect(formatted[0]).toBe("最终结果：甲 [ 20 ] > 丙 [ 5 ] > 乙 [ 1 ]")
    expect(formatted.slice(1).map((block) => block.split("\n")[0])).toEqual(["1. 甲", "2. 丙", "3. 乙"])
  })

  it("keeps the original order when totals are equal", () => {
    const outcome = rollDiceComparison(
      [
        { name: "先", expression: "1d8" },
        { name: "后", expression: "1d6" },
      ],
      sequence([0, 0]),
    )
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.results.map((item) => item.result.expression)).toEqual(["1d8", "1d6"])
    expect(outcome.results.map((item) => item.name)).toEqual(["先", "后"])
    expect(formatDiceComparison(outcome.results).split("\n\n")[0]).toBe("最终结果：先 [ 1 ] = 后 [ 1 ]")
  })

  it("stops at the first expression that cannot be rolled", () => {
    expect(
      rollDiceComparison([
        { name: "甲", expression: "1d20" },
        { name: "", expression: "abc" },
      ]),
    ).toMatchObject({
      ok: false,
      message: "投掷 2：无法识别表达式。示例：1d20、2d6+3、4d6-1。",
    })
    expect(
      rollDiceComparison([
        { name: "甲", expression: "1d20" },
        { name: "乙", expression: "abc" },
      ]),
    ).toMatchObject({
      ok: false,
      message: "乙：无法识别表达式。示例：1d20、2d6+3、4d6-1。",
    })
  })
})
