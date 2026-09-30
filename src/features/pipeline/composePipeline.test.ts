import { describe, expect, it } from "vitest"
import builtinEntries from "../../../public/data/entries.json" with { type: "json" }
import builtinTables from "../../../public/data/tables.json" with { type: "json" }
import { exampleCityNightTable, exampleEntry, exampleWeightTable } from "../../types/examples.ts"
import { parseEntries } from "../../utils/entry/parseEntries.ts"
import { parseRandomTables } from "../../utils/table/parseRandomTables.ts"
import { composeDicePipeline, composeValuePipeline } from "./composePipeline.ts"
import { formatPipelineResult } from "./formatPipeline.ts"

describe("composePipeline", () => {
  it("reproduces 1d100 → 73 → 61-80 → the linked entry", () => {
    const tables = parseRandomTables(builtinTables)
    const entries = parseEntries(builtinEntries)
    expect(tables.ok && entries.ok).toBe(true)
    if (!tables.ok || !entries.ok) return
    const table = tables.tables[0]
    if (!table) return

    const outcome = composeDicePipeline(table, entries.entries, "1d100", () => 0.72)
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.result.value).toBe(73)
    expect(outcome.result.min).toBe(61)
    expect(outcome.result.max).toBe(80)
    expect(outcome.result.rowText).toBe("遭遇突发事件")
    expect(outcome.result.entry).toEqual(exampleEntry)
    expect(outcome.result.output).toBe("在街角发现异常踪迹")
    expect(outcome.result.summary).toBe("1d100 → 73 → 61-80 → 在街角发现异常踪迹")
    expect(formatPipelineResult(outcome.result)).toBe(
      [
        "1d100 → 73",
        "骰子：73",
        "基础总值：73",
        "修正值：0",
        "匹配 61-80",
        "表项：遭遇突发事件",
        "词条：异常踪迹",
        "在街角发现异常踪迹",
      ].join("\n"),
    )
  })

  it("matches a typed value without rolling", () => {
    const outcome = composeValuePipeline(exampleCityNightTable, [exampleEntry], "73")
    expect(outcome).toMatchObject({
      ok: true,
      result: {
        summary: "73 → 61-80 → 在街角发现异常踪迹",
        output: "在街角发现异常踪迹",
      },
    })
  })

  it("uses the row text when the row has no entry", () => {
    const outcome = composeValuePipeline(exampleCityNightTable, [exampleEntry], "20")
    expect(outcome).toMatchObject({
      ok: true,
      result: {
        rowText: "平静无事",
        entry: null,
        output: "平静无事",
        summary: "20 → 1-20 → 平静无事",
      },
    })
  })

  it("returns a clear error for a miss, a bad expression, or a collection table", () => {
    expect(composeValuePipeline(exampleCityNightTable, [exampleEntry], "0")).toMatchObject({
      ok: false,
      message: "没有命中任何区间。",
    })
    expect(composeDicePipeline(exampleCityNightTable, [exampleEntry], "abc", () => 0)).toMatchObject({
      ok: false,
      message: "无法识别表达式。示例：1d20、2d6+3、4d6-1。",
    })
    expect(composeValuePipeline(exampleWeightTable, [exampleEntry], "1")).toMatchObject({
      ok: false,
      message: "这张表不是按数值区间匹配的。",
    })
  })

  it("keeps the row when the linked entry is missing", () => {
    const outcome = composeValuePipeline(exampleCityNightTable, [], "73")
    expect(outcome).toMatchObject({
      ok: true,
      result: {
        output: "遭遇突发事件",
        missingEntryId: "example-entry",
        summary: "73 → 61-80 → 遭遇突发事件",
      },
    })
  })
})
