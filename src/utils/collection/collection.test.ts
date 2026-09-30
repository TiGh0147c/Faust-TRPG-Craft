import { describe, expect, it } from "vitest"
import type { RandomSource } from "../random.ts"
import {
  collectionFromRange,
  drawLimited,
  formatSequence,
  orderBySortWeight,
  readNamedItems,
  readOrderCount,
  shuffleValues,
} from "./orderCollection.ts"

function sequence(values: number[]): RandomSource {
  let index = 0
  return () => {
    const value = values[index]
    index += 1
    return value ?? 0
  }
}

describe("collections", () => {
  it("builds an inclusive range and named items with weights", () => {
    expect(collectionFromRange("1", "5")).toEqual({ ok: true, values: [1, 2, 3, 4, 5] })
    expect(collectionFromRange("3", "1")).toMatchObject({ ok: false, message: "起始不能大于结束。" })
    expect(readNamedItems([])).toMatchObject({ ok: false, message: "请至少加入一项。" })
    expect(readNamedItems([{ name: "  ", weight: "1" }])).toEqual({
      ok: true,
      items: [{ name: "元素 1", weight: 1 }],
    })
    expect(readNamedItems([{ name: "剑", weight: "0" }])).toMatchObject({ ok: false, message: "权重必须大于 0。" })
    expect(
      readNamedItems([
        { name: " 剑 ", weight: "2" },
        { name: "盾", weight: "1" },
      ]),
    ).toEqual({
      ok: true,
      items: [
        { name: "剑", weight: 2 },
        { name: "盾", weight: 1 },
      ],
    })
  })

  it("shuffles every element once and caps repeated draws", () => {
    const shuffled = shuffleValues([1, 2, 3, 4, 5], sequence([0, 0, 0, 0]))
    expect(shuffled.slice().sort((left, right) => left - right)).toEqual([1, 2, 3, 4, 5])
    const drawn = drawLimited([1, 2], "3", "2", sequence([0, 0, 0, 0, 0, 0]))
    expect(drawn.ok).toBe(true)
    if (!drawn.ok) return
    expect(drawn.values).toHaveLength(3)
    expect(drawn.values.filter((value) => value === 1).length).toBeLessThanOrEqual(2)
    expect(drawn.values.filter((value) => value === 2).length).toBeLessThanOrEqual(2)
    expect(drawLimited([1, 2], "5", "2")).toMatchObject({
      ok: false,
      message: "抽取个数超过了每个元素允许出现的次数。",
    })
    expect(readOrderCount("2", 5)).toEqual({ ok: true, value: 2 })
    expect(readOrderCount("6", 5)).toMatchObject({ ok: false, message: "输出个数不能超过集合大小。" })
    expect(formatSequence("自定义集合 随机排序", ["元素 1", "剑"], "order")).toBe(
      ["自定义集合 随机排序", "最终结果：元素 1 -> 剑", "个数：2", "1. 元素 1", "2. 剑"].join("\n"),
    )
    expect(formatSequence("自定义集合 抽取 2", ["元素 1", "剑"], "draw")).toContain("最终结果：元素 1 & 剑")
    const heavyFirst = ["常见", "少见"]
    const heavyWeights = [3, 1]
    expect(orderBySortWeight(heavyFirst, heavyWeights, { enabled: false, bias: "front" }, sequence([0.99]))).toEqual(["常见", "少见"])
    expect(orderBySortWeight(heavyFirst, heavyWeights, { enabled: true, bias: "front" }, sequence([0.99]))).toEqual(["少见", "常见"])
    expect(orderBySortWeight(heavyFirst, heavyWeights, { enabled: true, bias: "back" }, sequence([0.99]))).toEqual(["常见", "少见"])
  })
})
