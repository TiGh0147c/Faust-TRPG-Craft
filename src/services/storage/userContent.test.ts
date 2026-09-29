import "fake-indexeddb/auto"
import { IDBFactory } from "fake-indexeddb"
import { beforeEach, describe, expect, it } from "vitest"
import { exampleCityNightTable, exampleEntry, exampleNpcGenerator } from "../../types/examples.ts"
import { createEmptyUserData, type BuiltinData } from "../../types/data.ts"
import { clearHistory } from "./mutateHistory.ts"
import {
  deleteGenerator,
  deleteTable,
  insertGenerator,
  insertTable,
  updateTable,
  type GeneratorDraft,
  type TableDraft,
} from "./mutateUserData.ts"
import { readUserData, writeUserData } from "./userDataStore.ts"

const builtinIds = new Set([exampleCityNightTable.id])
const generatorIds = new Set([exampleNpcGenerator.id])

const alleyTable: TableDraft = {
  name: "巷口事件",
  description: "巷口的两段遭遇",
  category: "event",
  tags: ["城市"],
  mode: "range",
  rows: [
    { id: "row-calm", text: "巷口平静", entryId: "", min: 1, max: 50, weight: 1 },
    { id: "row-loud", text: "巷口喧闹", entryId: exampleEntry.id, min: 51, max: 100, weight: 1 },
  ],
}

const alleyGenerator: GeneratorDraft = {
  name: "巷口生成",
  description: "",
  category: "event",
  tags: [],
  template: "{{event}}",
  steps: [{ id: "step-event", label: "事件", tableId: "user-table", variable: "event", expression: "1d100" }],
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

describe("user tables and generators", () => {
  it("saves a table without changing builtin content or the previous document", () => {
    const original = createEmptyUserData()
    const builtin: BuiltinData = {
      tables: [exampleCityNightTable],
      entries: [exampleEntry],
      generators: [exampleNpcGenerator],
    }
    const created = insertTable(original, builtinIds, alleyTable, () => "user-table")
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(original.tables).toEqual([])
    expect(exampleCityNightTable.entries[0]?.text).toBe("平静无事")
    expect(builtin.tables[0]).toBe(exampleCityNightTable)
    expect(created.data.tables[0]).toMatchObject({
      id: "user-table",
      name: "巷口事件",
      entries: [
        { id: "row-calm", text: "巷口平静", min: 1, max: 50 },
        { id: "row-loud", text: "巷口喧闹", entryId: exampleEntry.id, min: 51, max: 100 },
      ],
    })

    const updated = updateTable(created.data, builtinIds, "user-table", {
      ...alleyTable,
      rows: alleyTable.rows.map((row) => (row.id === "row-loud" ? { ...row, text: "巷口热闹" } : row)),
    })
    expect(updated.ok).toBe(true)
    if (!updated.ok) return
    expect(created.data.tables[0]?.entries[1]?.text).toBe("巷口喧闹")
    expect(updated.data.tables[0]?.entries[1]?.text).toBe("巷口热闹")
    expect(updateTable(updated.data, builtinIds, exampleCityNightTable.id, alleyTable)).toMatchObject({
      ok: false,
      message: "内置内容不能修改。",
    })
    expect(deleteTable(updated.data, builtinIds, exampleCityNightTable.id)).toMatchObject({
      ok: false,
      message: "内置内容不能删除。",
    })
  })

  it("rejects an incomplete generator and keeps entries when a table is deleted", () => {
    const table = insertTable(createEmptyUserData(), builtinIds, alleyTable, () => "user-table")
    expect(table.ok).toBe(true)
    if (!table.ok) return
    const withEntry = { ...table.data, entries: [exampleEntry] }
    const tables = [exampleCityNightTable, ...withEntry.tables]
    expect(
      insertGenerator(withEntry, generatorIds, { ...alleyGenerator, steps: [{ ...alleyGenerator.steps[0]!, expression: "" }] }, tables, () => "user-generator"),
    ).toMatchObject({ ok: false, message: "「事件」需要骰子表达式。" })
    expect(
      insertGenerator(withEntry, generatorIds, { ...alleyGenerator, template: "{{missing}}" }, tables, () => "user-generator"),
    ).toMatchObject({ ok: false, message: "模板引用了没有步骤的变量「missing」。" })

    const generator = insertGenerator(withEntry, generatorIds, alleyGenerator, tables, () => "user-generator")
    expect(generator.ok).toBe(true)
    if (!generator.ok) return
    expect(withEntry.generators).toEqual([])
    const removed = deleteTable(generator.data, builtinIds, "user-table")
    expect(removed.ok).toBe(true)
    if (!removed.ok) return
    expect(removed.data.tables).toEqual([])
    expect(removed.data.entries).toEqual([exampleEntry])
    expect(removed.data.generators).toHaveLength(1)
    expect(deleteGenerator(removed.data, generatorIds, exampleNpcGenerator.id)).toMatchObject({
      ok: false,
      message: "内置内容不能删除。",
    })
  })

  it("keeps user tables and generators after history is cleared", async () => {
    const table = insertTable({ ...createEmptyUserData(), entries: [exampleEntry] }, new Set(), alleyTable, () => "user-table")
    expect(table.ok).toBe(true)
    if (!table.ok) return
    const generator = insertGenerator(table.data, new Set(), alleyGenerator, table.data.tables, () => "user-generator")
    expect(generator.ok).toBe(true)
    if (!generator.ok) return
    const cleared = clearHistory(generator.data)
    expect(cleared.ok).toBe(true)
    if (!cleared.ok) return
    expect((await writeUserData(cleared.data)).ok).toBe(true)
    const loaded = await readUserData()
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.data.tables.map((item) => item.name)).toEqual(["巷口事件"])
    expect(loaded.data.generators.map((item) => item.name)).toEqual(["巷口生成"])
    expect(loaded.data.entries.map((item) => item.id)).toEqual([exampleEntry.id])
    expect(loaded.data.history).toEqual([])
  })
})
