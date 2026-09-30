import { describe, expect, it } from "vitest"
import builtinTables from "../../../public/data/tables.json" with { type: "json" }
import {
  exampleCityNightTable,
  exampleUniformTable,
  exampleWeightTable,
} from "../../types/examples.ts"
import type { RandomTable } from "../../types/table.ts"
import { rollTableExpression, TABLE_COVERAGE_ERROR } from "./assignedRanges.ts"
import { drawCollectionTable, orderCollectionTable } from "./orderRows.ts"
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

describe("assigned ranges", () => {
  it("rejects an expression whose possible values leave the table", () => {
    expect(rollTableExpression(exampleCityNightTable, "1d100", () => 0.72)).toMatchObject({
      ok: true,
      result: { value: 73, text: "遭遇突发事件" },
      dice: { rolls: [{ value: 73 }] },
    })
    expect(rollTableExpression(exampleCityNightTable, "1d100+1", () => 0)).toMatchObject({
      ok: false,
      message: TABLE_COVERAGE_ERROR,
    })
    const gapped: RandomTable = {
      ...exampleCityNightTable,
      entries: [
        { id: "low", text: "低", min: 1, max: 2 },
        { id: "high", text: "高", min: 4, max: 5 },
      ],
    }
    expect(rollTableExpression(gapped, "1d2", () => 0).ok).toBe(true)
    expect(rollTableExpression(gapped, "1d4", () => 0)).toMatchObject({
      ok: false,
      message: TABLE_COVERAGE_ERROR,
    })
    expect(rollTableExpression(exampleWeightTable, "1d4", () => 0)).toMatchObject({
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

  it("orders and draws collection rows, using weight when the weights differ", () => {
    const ordered = orderCollectionTable(exampleUniformTable, sequence([0, 0]))
    expect(ordered.ok).toBe(true)
    if (!ordered.ok) return
    expect(ordered.result.rows.map((row) => row.text).sort()).toEqual(["结果 A", "结果 B"])

    const weighted = orderCollectionTable(exampleWeightTable, sequence([0.99]))
    expect(weighted.ok).toBe(true)
    if (!weighted.ok) return
    expect(weighted.result.rows[0]?.text).toBe("少见")

    const drawn = drawCollectionTable(exampleWeightTable, "2", "1", sequence([0.99, 0]))
    expect(drawn.ok).toBe(true)
    if (!drawn.ok) return
    expect(drawn.result.rows.map((row) => row.text)).toEqual(["少见", "常见"])
    expect(drawCollectionTable(exampleUniformTable, "3", "1")).toMatchObject({
      ok: false,
      message: "抽取个数超过了每个元素允许出现的次数。",
    })
    expect(orderCollectionTable(exampleWeightTable, () => 0, ["example-weight-rare"])).toMatchObject({
      ok: true,
      result: { rows: [{ text: "少见" }] },
    })
    expect(orderCollectionTable(exampleWeightTable, () => 0, [])).toMatchObject({
      ok: false,
      message: "请至少选择一项。",
    })
    const prefixed = orderCollectionTable(exampleUniformTable, sequence([0, 0]), undefined, 1)
    expect(prefixed.ok).toBe(true)
    if (!prefixed.ok) return
    expect(prefixed.result.rows).toHaveLength(1)
    expect(prefixed.result.prefix).toBe(1)
    expect(orderCollectionTable(exampleUniformTable, () => 0, undefined, 3)).toMatchObject({
      ok: false,
      message: "输出个数不能超过集合大小。",
    })
  })

  it("draws collection rows from the same engine", () => {
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

  it("reads old weight and uniform tables as collections", () => {
    const parsed = parseRandomTables([
      {
        id: "old-uniform",
        name: "旧等概率",
        description: "",
        category: "test",
        tags: [],
        mode: "uniform",
        entries: [{ id: "a", text: "甲" }],
      },
      {
        id: "old-weight",
        name: "旧权重",
        description: "",
        category: "test",
        tags: [],
        mode: "weight",
        entries: [{ id: "b", text: "乙", weight: 2 }],
      },
    ])
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.tables[0]).toMatchObject({ mode: "collection", entries: [{ text: "甲", weight: 1 }] })
    expect(parsed.tables[1]).toMatchObject({ mode: "collection", entries: [{ text: "乙", weight: 2 }] })
    expect(parseRandomTables([{ ...exampleWeightTable, mode: "weight", entries: [{ id: "zero", text: "空" }] }])).toMatchObject({
      ok: false,
      message: "权重必须大于 0。",
    })
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
