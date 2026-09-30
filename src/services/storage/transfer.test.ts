import "fake-indexeddb/auto"
import { IDBFactory } from "fake-indexeddb"
import { beforeEach, describe, expect, it } from "vitest"
import { clearSettings, clearUserContent } from "./mutateUserData.ts"
import { deleteHistoryRecords } from "./mutateHistory.ts"
import {
  applyTransfer,
  describeImport,
  exportEntriesSnapshot,
  exportGeneratorsMerge,
  exportHistoryMerge,
  exportHistorySnapshot,
  exportTablesSnapshot,
  exportUserSnapshot,
  parseTransferText,
  transferFilename,
  type BuiltinIds,
} from "./transfer.ts"
import { readUserData, writeUserData } from "./userDataStore.ts"
import { createEmptyUserData, type UserData } from "../../types/data.ts"
import type { Generator } from "../../types/generator.ts"

const builtin: BuiltinIds = {
  tables: new Set(["example-table"]),
  entries: new Set(["example-entry"]),
  generators: new Set(["example-npc"]),
}

const exportedAt = "2026-09-30T02:00:00.000Z"

const otherGenerator: Generator = {
  id: "other-generator",
  name: "另一生成器",
  description: "",
  category: "event",
  tags: [],
  steps: [{ id: "step-other", label: "其他", tableId: "user-table", variable: "other" }],
  template: "{{other}}",
}

function sampleUser(): UserData {
  return {
    ...createEmptyUserData(),
    tables: [
      {
        id: "user-table",
        name: "巷口事件",
        description: "巷口",
        category: "event",
        tags: ["城市"],
        mode: "range",
        entries: [
          { id: "row-calm", text: "巷口平静", min: 1, max: 50 },
          { id: "row-loud", text: "巷口喧闹", min: 51, max: 100 },
        ],
      },
    ],
    entries: [
      { id: "user-entry", name: "测试路人", content: "巷口的路人", category: "npc", tags: ["人物"], weight: 1 },
    ],
    generators: [
      {
        id: "user-generator",
        name: "巷口生成",
        description: "",
        category: "event",
        tags: [],
        steps: [{ id: "step-event", label: "事件", tableId: "deleted-table", variable: "event", expression: "1d100" }],
        template: "{{event}}",
      },
    ],
    history: [
      {
        id: "history-fav",
        createdAt: "2026-09-30T01:00:00.000Z",
        kind: "pipeline",
        input: "73",
        output: "在街角发现异常踪迹",
        favorite: true,
      },
      {
        id: "history-dice",
        createdAt: "2026-09-30T01:01:00.000Z",
        kind: "dice",
        input: "1d100",
        output: "1d100 = 73",
        favorite: false,
        diceResult: { expression: "1d100", rolls: [{ sides: 100, value: 73 }], subtotal: 73, modifier: 0, total: 73 },
      },
    ],
    settings: [{ key: "density", value: "compact" }],
  }
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

describe("transfer backups", () => {
  it("round-trips user content and leaves history in place", () => {
    const source = sampleUser()
    const file = exportUserSnapshot(source, exportedAt)
    expect(Object.keys(file.data)).toEqual(["tables", "entries", "generators", "settings"])
    expect(transferFilename(file)).toBe("faust-trpg-craft-user-2026-09-30.json")
    const target = { ...createEmptyUserData(), history: source.history }
    const parsed = parseTransferText(JSON.stringify(file), { scope: "user", mode: "snapshot" }, builtin)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const applied = applyTransfer(target, parsed.envelope, builtin)
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    expect(applied.data.tables).toEqual(source.tables)
    expect(applied.data.entries).toEqual(source.entries)
    expect(applied.data.generators).toEqual(source.generators)
    expect(applied.data.settings).toEqual(source.settings)
    expect(applied.data.history).toEqual(source.history)
    expect(target.tables).toEqual([])
  })

  it("round-trips history, including favorites, without changing user content", () => {
    const source = sampleUser()
    const file = exportHistorySnapshot(source, exportedAt)
    expect(file.data.history.map((record) => record.favorite)).toEqual([true, false])
    const target = { ...sampleUser(), history: [], tables: [] }
    const parsed = parseTransferText(JSON.stringify(file), { scope: "history" }, builtin)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(describeImport(target, parsed.envelope)).toContain("将覆盖全部历史")
    const applied = applyTransfer(target, parsed.envelope, builtin)
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    expect(applied.data.history).toEqual(source.history)
    expect(applied.data.entries).toEqual(source.entries)
    expect(target.history).toEqual([])
  })

  it("replaces one type and merges a single generator by id", () => {
    const source = sampleUser()
    const tablesFile = exportTablesSnapshot(source, exportedAt)
    const keeper = { ...sampleUser(), tables: [] }
    const parsedTables = parseTransferText(JSON.stringify(tablesFile), { scope: "tables", mode: "snapshot" }, builtin)
    expect(parsedTables.ok).toBe(true)
    if (!parsedTables.ok) return
    const replaced = applyTransfer(keeper, parsedTables.envelope, builtin)
    expect(replaced.ok).toBe(true)
    if (!replaced.ok) return
    expect(replaced.data.tables).toEqual(source.tables)
    expect(replaced.data.entries).toEqual(source.entries)

    const renamed = { ...source.generators[0]!, name: "巷口夜谈" }
    const mergeFile = exportGeneratorsMerge([renamed, otherGenerator], exportedAt)
    expect(transferFilename(mergeFile, renamed.name)).toBe("faust-trpg-craft-generators-selection-巷口夜谈-2026-09-30.json")
    const parsedMerge = parseTransferText(JSON.stringify(mergeFile), { scope: "generators", mode: "merge" }, builtin)
    expect(parsedMerge.ok).toBe(true)
    if (!parsedMerge.ok) return
    expect(describeImport(source, parsedMerge.envelope)).toBe("将合并生成器：新增 1 个，更新 1 个。")
    const merged = applyTransfer(source, parsedMerge.envelope, builtin)
    expect(merged.ok).toBe(true)
    if (!merged.ok) return
    expect(merged.data.generators.map((item) => item.name)).toEqual(["巷口夜谈", "另一生成器"])
    expect(source.generators[0]?.name).toBe("巷口生成")
    expect(merged.data.tables).toEqual(source.tables)
  })

  it("merges selected history and can delete only those ids", () => {
    const source = sampleUser()
    const selected = source.history[0]!
    const file = exportHistoryMerge([selected, { ...selected, id: "history-new", favorite: false }], exportedAt)
    const parsed = parseTransferText(JSON.stringify(file), { scope: "history" }, builtin)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const merged = applyTransfer(source, parsed.envelope, builtin)
    expect(merged.ok).toBe(true)
    if (!merged.ok) return
    expect(merged.data.history.map((record) => record.id)).toEqual(["history-fav", "history-dice", "history-new"])
    const removed = deleteHistoryRecords(merged.data, ["history-fav", "history-new"])
    expect(removed.ok).toBe(true)
    if (!removed.ok) return
    expect(removed.data.history.map((record) => record.id)).toEqual(["history-dice"])
    expect(merged.data.history).toHaveLength(3)
    expect(deleteHistoryRecords(removed.data, [])).toMatchObject({ ok: false, message: "请先选择历史记录。" })
  })

  it("clears user content or settings while keeping the other set", () => {
    const source = sampleUser()
    const content = clearUserContent(source)
    expect(content.ok).toBe(true)
    if (!content.ok) return
    expect(content.data.tables).toEqual([])
    expect(content.data.entries).toEqual([])
    expect(content.data.generators).toEqual([])
    expect(content.data.settings).toEqual(source.settings)
    expect(content.data.history).toEqual(source.history)
    expect(source.tables).toHaveLength(1)
    const settings = clearSettings(source)
    expect(settings.ok).toBe(true)
    if (!settings.ok) return
    expect(settings.data.settings).toEqual([])
    expect(settings.data.tables).toEqual(source.tables)
    expect(settings.data.history).toEqual(source.history)
  })

  it("rejects a bad file before anything is written", async () => {
    const source = sampleUser()
    await writeUserData(source)
    const cases = [
      ["{", "文件不是有效的 JSON。"],
      [JSON.stringify({ app: APP_WRONG, version: 1, exportedAt, scope: "user", mode: "snapshot", data: {} }), "这不是本工具的备份文件。"],
      [JSON.stringify({ app: "faust-trpg-craft", version: 2, exportedAt, scope: "user", mode: "snapshot", data: {} }), "数据版本不兼容。"],
      [JSON.stringify({ app: "faust-trpg-craft", version: 1, scope: "user", mode: "snapshot", data: {} }), "备份格式不正确。"],
      [JSON.stringify({ ...exportUserSnapshot(source, exportedAt), data: { ...exportUserSnapshot(source, exportedAt).data, tables: "nope" } }), "随机表格式不正确。"],
      [JSON.stringify(exportHistorySnapshot(source, exportedAt)), "这份文件是历史备份。"],
      [JSON.stringify(exportTablesSnapshot(source, exportedAt)), "这份文件是整份覆盖备份，请使用导入并覆盖。"],
    ] as const
    for (const [text, message] of cases) {
      const expected = text.includes("\"scope\":\"tables\"") || text.includes('"scope": "tables"')
        ? { scope: "tables" as const, mode: "merge" as const }
        : { scope: "user" as const, mode: "snapshot" as const }
      expect(parseTransferText(text, expected, builtin)).toMatchObject({ ok: false, message })
    }
    const duplicate = exportUserSnapshot(source, exportedAt)
    duplicate.data.tables = [...duplicate.data.tables, { ...duplicate.data.tables[0]! }]
    expect(parseTransferText(JSON.stringify(duplicate), { scope: "user", mode: "snapshot" }, builtin)).toMatchObject({
      ok: false,
      message: "存在重复的随机表 id。",
    })
    const builtinClash = exportEntriesSnapshot(
      { ...source, entries: [{ ...source.entries[0]!, id: "example-entry" }] },
      exportedAt,
    )
    expect(parseTransferText(JSON.stringify(builtinClash), { scope: "entries", mode: "snapshot" }, builtin)).toMatchObject({
      ok: false,
      message: "与内置内容 id 相同，不能导入。",
    })
    expect(await readUserData()).toMatchObject({ ok: true, data: source })
  })
})

const APP_WRONG = "TRPG Tool"
