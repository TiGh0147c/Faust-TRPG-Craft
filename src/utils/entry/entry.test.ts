import { describe, expect, it } from "vitest"
import builtinEntries from "../../../public/data/entries.json" with { type: "json" }
import builtinTables from "../../../public/data/tables.json" with { type: "json" }
import { exampleEntry } from "../../types/examples.ts"
import type { Entry } from "../../types/entry.ts"
import { matchTableByValue } from "../table/matchTable.ts"
import { formatTableResult } from "../table/formatTableResult.ts"
import { parseRandomTables } from "../table/parseRandomTables.ts"
import { drawEntry } from "./drawEntry.ts"
import { filterEntries } from "./filterEntries.ts"
import { formatEntry } from "./formatEntry.ts"
import { parseEntries } from "./parseEntries.ts"
import { resolveLinkedEntry } from "./resolveLinkedEntry.ts"
import type { RandomSource } from "../random.ts"

function sequence(values: number[]): RandomSource {
  let index = 0
  return () => {
    const value = values[index]
    index += 1
    return value ?? 0
  }
}

const rareEntry: Entry = {
  id: "rare",
  name: "少见",
  content: "少见正文",
  category: "item",
  tags: ["稀有"],
  weight: 1,
}

const commonEntry: Entry = {
  id: "common",
  name: "常见",
  content: "常见正文",
  category: "item",
  tags: ["普通"],
  weight: 3,
}

describe("resolveLinkedEntry", () => {
  it("turns the documented table row into the entry text", () => {
    const tables = parseRandomTables(builtinTables)
    const entries = parseEntries(builtinEntries)
    expect(tables.ok).toBe(true)
    expect(entries.ok).toBe(true)
    if (!tables.ok || !entries.ok) return
    const table = tables.tables[0]
    if (!table) return
    const matched = matchTableByValue(table, 73)
    expect(matched.ok).toBe(true)
    if (!matched.ok) return
    expect(resolveLinkedEntry(matched.result.entryId, entries.entries)).toEqual({
      status: "found",
      entry: exampleEntry,
    })
    expect(formatTableResult(matched.result, exampleEntry)).toBe(
      ["城市夜间事件", "数值：73", "区间：61-80", "结果：遭遇突发事件", "词条：异常踪迹", "在街角发现异常踪迹"].join(
        "\n",
      ),
    )
  })

  it("reports a missing id and ignores rows without a link", () => {
    expect(resolveLinkedEntry(undefined, [exampleEntry])).toEqual({ status: "none" })
    expect(resolveLinkedEntry("missing", null)).toEqual({ status: "loading" })
    expect(resolveLinkedEntry("missing", [exampleEntry])).toEqual({ status: "missing", entryId: "missing" })
  })
})

describe("drawEntry", () => {
  it("uses weight and rejects an empty list", () => {
    expect(drawEntry([commonEntry, rareEntry], sequence([0]))).toMatchObject({
      ok: true,
      entry: { id: "common" },
    })
    expect(drawEntry([commonEntry, rareEntry], sequence([0.75]))).toMatchObject({
      ok: true,
      entry: { id: "rare" },
    })
    expect(drawEntry([])).toMatchObject({ ok: false, message: "没有可抽取的词条。" })
    expect(drawEntry([{ ...commonEntry, weight: 0 }])).toMatchObject({ ok: false, message: "权重必须大于 0。" })
  })
})

describe("filterEntries", () => {
  const entries = [exampleEntry, commonEntry]

  it("filters by keyword, category, and tag", () => {
    expect(filterEntries(entries, { keyword: "街角", category: "", tag: "" }).map((entry) => entry.id)).toEqual([
      "example-entry",
    ])
    expect(filterEntries(entries, { keyword: "", category: "item", tag: "普通" }).map((entry) => entry.id)).toEqual([
      "common",
    ])
    expect(filterEntries(entries, { keyword: "龙", category: "", tag: "" })).toEqual([])
  })
})

describe("parseEntries", () => {
  it("accepts the published file and rejects broken data", () => {
    expect(parseEntries(builtinEntries)).toMatchObject({
      ok: true,
      entries: [exampleEntry],
    })
    expect(parseEntries([exampleEntry, exampleEntry])).toMatchObject({
      ok: false,
      message: "存在重复的词条 id。",
    })
    expect(parseEntries([{ ...exampleEntry, weight: 0 }])).toMatchObject({ ok: false })
  })
})

describe("formatEntry", () => {
  it("writes a copyable summary", () => {
    expect(formatEntry(exampleEntry)).toBe(["异常踪迹", "在街角发现异常踪迹", "分类：event", "标签：城市、探索"].join("\n"))
  })
})
