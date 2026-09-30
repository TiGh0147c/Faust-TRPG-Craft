import { describe, expect, it } from "vitest"
import type { RandomSource } from "../random.ts"
import { collectionFromCustom, collectionFromRange, drawLimited, readOrderCount, shuffleValues } from "./orderCollection.ts"

function sequence(values: number[]): RandomSource {
  let index = 0
  return () => {
    const value = values[index]
    index += 1
    return value ?? 0
  }
}

describe("collections", () => {
  it("builds an inclusive range and a unique custom set", () => {
    expect(collectionFromRange("1", "5")).toEqual({ ok: true, values: [1, 2, 3, 4, 5] })
    expect(collectionFromRange("3", "1")).toMatchObject({ ok: false, message: "起始不能大于结束。" })
    expect(collectionFromCustom("2, 2")).toMatchObject({ ok: false, message: "集合里有重复的数值。" })
    expect(collectionFromCustom("10 4\n7")).toEqual({ ok: true, values: [10, 4, 7] })
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
  })
})
