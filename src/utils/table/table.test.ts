import { describe, expect, it } from "vitest"
import builtinTables from "../../../public/data/tables.json" with { type: "json" }
import {
  exampleCityNightTable,
  exampleUniformTable,
  exampleWeightTable,
} from "../../types/examples.ts"
import type { RandomTable } from "../../types/table.ts"
import { drawTable } from "./drawTable.ts"
import { filterTables } from "./filterTables.ts"
import { formatTableResult } from "./formatTableResult.ts"
import { matchTableByValue, matchTableInput } from "./matchTable.ts"
import { parseRandomTables } from "./parseRandomTables.ts"
import type { RandomSource } from "../random.ts"

function sequence(values: number[]): RandomSource {
  let index = 0
  return () => {
    const value = values[index]
    index += 1
    return value ?? 0
  }
}

describe("matchTableByValue", () => {
  it("matches 73 to the 61-80 row", () => {
    const outcome = matchTableByValue(exampleCityNightTable, 73)
    expect(outcome).toMatchObject({
      ok: true,
      result: {
        text: "遭遇突发事件",
        rowId: "example-table-61-80",
        entryId: "example-entry",
        value: 73,
        min: 61,
        max: 80,
      },
    })
  })

  it("includes both ends of a range", () => {
    expect(matchTableByValue(exampleCityNightTable, 1)).toMatchObject({
      ok: true,
      result: { text: "平静无事", min: 1, max: 20 },
    })
    expect(matchTableByValue(exampleCityNightTable, 20)).toMatchObject({
      ok: true,
      result: { text: "平静无事" },
    })
    expect(matchTableByValue(exampleCityNightTable, 21)).toMatchObject({
      ok: true,
      result: { text: "遇到陌生行人" },
    })
    expect(matchTableByValue(exampleCityNightTable, 100)).toMatchObject({
      ok: true,
      result: { text: "特殊事件" },
    })
  })

  it("does not match numbers outside the table", () => {
    expect(matchTableByValue(exampleCityNightTable, 0)).toMatchObject({
      ok: false,
      message: "没有命中任何区间。",
    })
    expect(matchTableByValue(exampleCityNightTable, 101)).toMatchObject({ ok: false })
  })

  it("ignores the table category", () => {
    const locationTable: RandomTable = { ...exampleCityNightTable, id: "location", category: "location" }
    expect(matchTableByValue(locationTable, 73)).toMatchObject({
      ok: true,
      result: { text: "遭遇突发事件" },
    })
    expect(matchTableByValue(exampleWeightTable, 1)).toMatchObject({
      ok: false,
      message: "这张表不是按数值区间匹配的。",
    })
  })
})

describe("drawTable", () => {
  it("draws a covered number and then matches the range", () => {
    const outcome = drawTable(exampleCityNightTable, sequence([0.72]))
    expect(outcome).toMatchObject({
      ok: true,
      result: { value: 73, text: "遭遇突发事件", min: 61, max: 80 },
    })
  })

  it("draws weight and uniform rows from the same engine", () => {
    expect(drawTable(exampleWeightTable, sequence([0]))).toMatchObject({
      ok: true,
      result: { text: "常见" },
    })
    expect(drawTable(exampleWeightTable, sequence([0.75]))).toMatchObject({
      ok: true,
      result: { text: "少见" },
    })
    expect(drawTable(exampleUniformTable, sequence([0]))).toMatchObject({
      ok: true,
      result: { text: "结果 A" },
    })
    expect(drawTable(exampleUniformTable, sequence([0.999]))).toMatchObject({
      ok: true,
      result: { text: "结果 B" },
    })
  })

  it("rejects overlapping ranges and non-positive weights", () => {
    const overlap: RandomTable = {
      ...exampleCityNightTable,
      entries: [
        { id: "a", text: "甲", min: 1, max: 10 },
        { id: "b", text: "乙", min: 10, max: 20 },
      ],
    }
    expect(drawTable(overlap, sequence([0]))).toMatchObject({
      ok: false,
      message: "区间有重叠，无法随机抽取。",
    })
    expect(matchTableByValue(overlap, 10)).toMatchObject({
      ok: true,
      result: { text: "甲" },
    })

    const badWeight: RandomTable = {
      ...exampleWeightTable,
      entries: [{ id: "zero", text: "空", weight: 0 }],
    }
    expect(drawTable(badWeight)).toMatchObject({ ok: false, message: "权重必须大于 0。" })
  })
})

describe("filterTables", () => {
  const tables = [exampleCityNightTable, exampleWeightTable, exampleUniformTable]

  it("filters by keyword, category, and tag", () => {
    expect(filterTables(tables, { keyword: "突发事件", category: "", tag: "" }).map((table) => table.id)).toEqual([
      "example-table",
    ])
    expect(filterTables(tables, { keyword: "event", category: "", tag: "" }).map((table) => table.id)).toEqual([
      "example-table",
    ])
    expect(filterTables(tables, { keyword: "", category: "example", tag: "示例" })).toHaveLength(2)
    expect(filterTables(tables, { keyword: "龙", category: "", tag: "" })).toEqual([])
  })
})

describe("parseRandomTables", () => {
  it("accepts the published builtin file and the documented examples", () => {
    const parsed = parseRandomTables(builtinTables)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const table = parsed.tables.find((item) => item.id === "example-table")
    expect(table?.name).toBe("城市夜间事件")
    if (!table) return
    expect(matchTableInput(table, "73")).toMatchObject({
      ok: true,
      result: { text: "遭遇突发事件", value: 73 },
    })
    expect(parseRandomTables([exampleCityNightTable, exampleWeightTable, exampleUniformTable]).ok).toBe(true)
  })

  it("rejects a broken file without throwing", () => {
    expect(parseRandomTables({ tables: [] })).toMatchObject({ ok: false })
    expect(parseRandomTables([{ ...exampleCityNightTable }, { ...exampleCityNightTable }])).toMatchObject({
      ok: false,
      message: "存在重复的随机表 id。",
    })
    expect(matchTableInput(exampleCityNightTable, "abc")).toMatchObject({
      ok: false,
      message: "请输入整数。",
    })
  })
})

describe("formatTableResult", () => {
  it("includes the matched number and range", () => {
    const outcome = matchTableByValue(exampleCityNightTable, 73)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(formatTableResult(outcome.result)).toBe(
      ["城市夜间事件", "数值：73", "区间：61-80", "结果：遭遇突发事件"].join("\n"),
    )
  })
})
