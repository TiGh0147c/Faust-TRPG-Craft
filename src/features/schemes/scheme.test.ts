import { describe, expect, it } from "vitest"
import { compareScheme, parseCompareScheme } from "./compareScheme.ts"
import { collectionScheme, parseCollectionScheme } from "./collectionScheme.ts"

describe("saved schemes", () => {
  it("reads a dice comparison and rejects the wrong kind", () => {
    const text = JSON.stringify(
      compareScheme([
        { slotId: "a", name: "先手", expression: "2d6", sides: "6", count: "2", modifier: "0" },
        { slotId: "b", name: "", expression: "1d20", sides: "20", count: "1", modifier: "1" },
      ]),
    )
    const parsed = parseCompareScheme(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.slots.map((slot) => slot.name)).toEqual(["先手", ""])
    expect(parsed.slots[0]?.expression).toBe("2d6")
    expect(parseCompareScheme(JSON.stringify({ kind: "custom-collection", items: [] }))).toMatchObject({
      ok: false,
      message: "这不是多次比较方案。",
    })
  })

  it("reads a custom collection and rejects an empty list", () => {
    const text = JSON.stringify(
      collectionScheme([
        { id: "a", name: "", weight: "2" },
        { id: "b", name: "剑", weight: "1" },
      ]),
    )
    const parsed = parseCollectionScheme(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.items.map((item) => [item.name, item.weight])).toEqual([
      ["", "2"],
      ["剑", "1"],
    ])
    expect(parseCollectionScheme(JSON.stringify({ kind: "custom-collection", items: [] }))).toMatchObject({
      ok: false,
      message: "元素数量至少为 1。",
    })
  })
})
