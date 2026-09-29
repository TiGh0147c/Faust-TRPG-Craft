import { describe, expect, it } from "vitest"
import builtinGenerators from "../../../public/data/generators.json" with { type: "json" }
import builtinTables from "../../../public/data/tables.json" with { type: "json" }
import { generatorHistoryDraft } from "../history/historyDrafts.ts"
import { parseUserData } from "../../services/storage/parseUserData.ts"
import { exampleEntry } from "../../types/examples.ts"
import type { Generator } from "../../types/generator.ts"
import type { RandomTable } from "../../types/table.ts"
import { filterGenerators } from "../../utils/generator/filterGenerators.ts"
import { parseGenerators } from "../../utils/generator/parseGenerators.ts"
import { parseRandomTables } from "../../utils/table/parseRandomTables.ts"
import { runGenerator } from "./runGenerator.ts"

const weightTable = {
  id: "weights",
  name: "权重",
  description: "",
  category: "test",
  tags: [],
  mode: "weight",
  entries: [
    { id: "first", text: "先", weight: 1 },
    { id: "second", text: "后", weight: 1 },
  ],
} satisfies RandomTable

const rangeTable = {
  id: "ranges",
  name: "区间",
  description: "",
  category: "test",
  tags: [],
  mode: "range",
  entries: [
    { id: "low", text: "低", min: 1, max: 3 },
    { id: "high", text: "高", min: 4, max: 6 },
  ],
} satisfies RandomTable

function generator(steps: Generator["steps"], template = "{{item}}"): Generator {
  return {
    id: "generator",
    name: "测试生成器",
    description: "",
    category: "test",
    tags: [],
    steps,
    template,
  }
}

describe("runGenerator", () => {
  it("fills a template from table rows and keeps every step", () => {
    const outcome = runGenerator(
      generator(
        [
          { id: "one", label: "甲", tableId: "weights", variable: "item" },
          { id: "two", label: "乙", tableId: "ranges", variable: "other", expression: "1d6" },
        ],
        "{{item}}-{{other}}",
      ),
      [weightTable, rangeTable],
      [],
      () => 0,
    )
    expect(outcome.ok).toBe(true)
    if (!outcome.ok) return
    expect(outcome.result.output).toBe("先-低")
    expect(outcome.result.steps.map((step) => step.label)).toEqual(["甲", "乙"])
    expect(outcome.result.steps[1]).toMatchObject({ expression: "1d6", total: 1, text: "低" })
  })

  it("uses the dice expression for range tables and ignores it for weight tables", () => {
    const ranged = runGenerator(
      generator([{ id: "one", label: "区间", tableId: "ranges", variable: "item", expression: "1d6" }]),
      [rangeTable],
      [],
      () => 0.9,
    )
    expect(ranged.ok).toBe(true)
    if (!ranged.ok) return
    expect(ranged.result.output).toBe("高")
    expect(ranged.result.steps[0]).toMatchObject({ total: 6, expression: "1d6" })

    let calls = 0
    const weighted = runGenerator(
      generator([{ id: "one", label: "权重", tableId: "weights", variable: "item", expression: "1d6" }]),
      [weightTable],
      [],
      () => {
        calls += 1
        return 0.9
      },
    )
    expect(weighted.ok).toBe(true)
    if (!weighted.ok) return
    expect(weighted.result.output).toBe("后")
    expect(weighted.result.steps[0]?.expression).toBeUndefined()
    expect(calls).toBe(1)
  })

  it("uses linked entry content and reports a missing link", () => {
    const linkedTable = {
      id: "linked",
      name: "关联",
      description: "",
      category: "test",
      tags: [],
      mode: "uniform",
      entries: [{ id: "row", text: "表项原文", entryId: exampleEntry.id }],
    } satisfies RandomTable
    const found = runGenerator(
      generator([{ id: "one", label: "关联", tableId: "linked", variable: "item" }]),
      [linkedTable],
      [exampleEntry],
      () => 0,
    )
    expect(found.ok).toBe(true)
    if (!found.ok) return
    expect(found.result.output).toBe("在街角发现异常踪迹")

    const missing = runGenerator(
      generator([{ id: "one", label: "关联", tableId: "linked", variable: "item" }]),
      [{ ...linkedTable, entries: [{ id: "row", text: "表项原文", entryId: "missing" }] }],
      [],
      () => 0,
    )
    expect(missing).toMatchObject({ ok: false, message: "未找到关联词条（missing）。" })
  })

  it("rejects incomplete configuration without rolling later steps", () => {
    expect(runGenerator(generator([]), [], [])).toMatchObject({ ok: false, message: "这个生成器没有步骤。" })
    expect(
      runGenerator(generator([{ id: "one", label: "甲", tableId: "missing", variable: "item" }], "  "), [], []),
    ).toMatchObject({ ok: false, message: "这个生成器没有输出模板。" })
    expect(
      runGenerator(
        generator([
          { id: "one", label: "甲", tableId: "weights", variable: "item" },
          { id: "one", label: "乙", tableId: "weights", variable: "other" },
        ]),
        [weightTable],
        [],
      ),
    ).toMatchObject({ ok: false, message: "存在重复的步骤 id。" })
    expect(
      runGenerator(
        generator([
          { id: "one", label: "甲", tableId: "weights", variable: "item" },
          { id: "two", label: "乙", tableId: "weights", variable: "item" },
        ]),
        [weightTable],
        [],
      ),
    ).toMatchObject({ ok: false, message: "变量「item」重复了。" })
    expect(
      runGenerator(generator([{ id: "one", label: "区间", tableId: "ranges", variable: "item" }]), [rangeTable], []),
    ).toMatchObject({ ok: false, message: "「区间」需要骰子表达式。" })
    expect(
      runGenerator(generator([{ id: "one", label: "甲", tableId: "missing", variable: "item" }]), [], []),
    ).toMatchObject({ ok: false, message: "找不到随机表「missing」。" })
    expect(
      runGenerator(
        generator([{ id: "one", label: "甲", tableId: "weights", variable: "item" }], "{{other}}"),
        [weightTable],
        [],
        () => 0,
      ),
    ).toMatchObject({ ok: false, message: "模板引用了没有步骤的变量「other」。" })
  })
})

describe("builtin generator presets", () => {
  const tables = parseRandomTables(builtinTables)
  const generators = parseGenerators(builtinGenerators)

  it("builds both presets from the published JSON", () => {
    expect(tables.ok).toBe(true)
    expect(generators.ok).toBe(true)
    if (!tables.ok || !generators.ok) return
    const npc = generators.generators.find((item) => item.id === "generator-npc")
    const night = generators.generators.find((item) => item.id === "generator-night-city")
    expect(npc).toBeDefined()
    expect(night).toBeDefined()
    if (!npc || !night) return

    const npcResult = runGenerator(npc, tables.tables, [], () => 0)
    expect(npcResult.ok).toBe(true)
    if (!npcResult.ok) return
    expect(npcResult.result.output).toBe("市集守卫，谨慎。左眼有一道旧疤。动机是寻找失散的亲人。随身带着一本湿掉的账册")
    expect(generatorHistoryDraft(npcResult.result)).toMatchObject({
      kind: "generator",
      input: "NPC",
      output: npcResult.result.output,
    })

    const nightResult = runGenerator(night, tables.tables, [], () => 0)
    expect(nightResult.ok).toBe(true)
    if (!nightResult.ok) return
    expect(nightResult.result.output).toBe("天气：晴冷\n地点：废弃市场\n遭遇：陌生人拦路\n强度：平静\n特殊情况：发现一条隐藏通道")
    expect(nightResult.result.steps.filter((step) => step.expression === "1d6").map((step) => step.total)).toEqual([1, 1])
    expect(filterGenerators(generators.generators, { keyword: "夜间", category: "", tag: "" }).map((item) => item.id)).toEqual([
      "generator-night-city",
    ])
    expect(filterGenerators(generators.generators, { keyword: "", category: "npc", tag: "人物" }).map((item) => item.id)).toEqual([
      "generator-npc",
    ])
  })
})

describe("parseGenerators", () => {
  it("keeps a duplicate id distinct from a malformed document", () => {
    const parsed = parseGenerators(builtinGenerators)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const duplicate = parsed.generators[0]
    expect(
      parseUserData({
        version: 1,
        tables: [],
        entries: [],
        generators: [duplicate, duplicate],
        history: [],
        settings: [],
      }),
    ).toMatchObject({ ok: false, message: "存在重复的生成器 id。" })
    expect(
      parseUserData({
        version: 1,
        tables: [],
        entries: [],
        generators: [{}],
        history: [],
        settings: [],
      }),
    ).toMatchObject({ ok: false, message: "本地数据格式不正确。" })
  })
})
