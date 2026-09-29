import "fake-indexeddb/auto"
import { IDBFactory } from "fake-indexeddb"
import { beforeEach, describe, expect, it } from "vitest"
import { exampleCityNightTable, exampleEntry } from "../../types/examples.ts"
import { createEmptyUserData, type BuiltinData, type UserData } from "../../types/data.ts"
import { mergeCatalog } from "./mergeCatalog.ts"
import { deleteEntry, insertEntry, updateEntry } from "./mutateUserData.ts"
import { parseUserData } from "./parseUserData.ts"
import { idbStore, readUserData, writeUserData, type UserDataStore } from "./userDataStore.ts"

const builtin: BuiltinData = {
  tables: [exampleCityNightTable],
  entries: [exampleEntry],
  generators: [],
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

describe("mergeCatalog", () => {
  it("keeps builtin records read-only and appends user records", () => {
    const user = insertEntry(createEmptyUserData(), new Set([exampleEntry.id]), {
      name: "巷口路人",
      content: "巷口站着一个路人",
      category: "npc",
      tags: ["城市"],
      weight: 1,
    }, () => "user-entry-1")
    expect(user.ok).toBe(true)
    if (!user.ok) return
    const available = mergeCatalog(builtin, user.data)
    expect(available.entries.map((entry) => [entry.id, entry.origin])).toEqual([
      [exampleEntry.id, "builtin"],
      ["user-entry-1", "user"],
    ])
    expect(available.tables[0]?.origin).toBe("builtin")
    expect(builtin.entries[0]?.content).toBe("在街角发现异常踪迹")
  })

  it("does not let a user record replace a builtin id", () => {
    const user = {
      ...createEmptyUserData(),
      entries: [{ ...exampleEntry, content: "被改写的正文" }],
    }
    const available = mergeCatalog(builtin, user)
    expect(available.entries).toEqual([{ ...exampleEntry, origin: "builtin" }])
    expect(user.entries[0]?.content).toBe("被改写的正文")
  })
})

describe("entry mutations", () => {
  const builtinIds = new Set([exampleEntry.id])

  it("inserts, updates, and deletes without changing the previous document or builtin ids", () => {
    const original = createEmptyUserData()
    const created = insertEntry(original, builtinIds, {
      name: "巷口路人",
      content: "巷口站着一个路人",
      category: "npc",
      tags: ["城市"],
      weight: 2,
    }, () => "user-entry-1")
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect(original.entries).toEqual([])

    const updated = updateEntry(created.data, builtinIds, {
      id: "user-entry-1",
      name: "巷口路人",
      content: "路人递来一张纸条",
      category: "npc",
      tags: ["城市"],
      weight: 2,
    })
    expect(updated.ok).toBe(true)
    if (!updated.ok) return
    expect(created.data.entries[0]?.content).toBe("巷口站着一个路人")
    expect(updated.data.entries[0]?.content).toBe("路人递来一张纸条")

    const removed = deleteEntry(updated.data, builtinIds, "user-entry-1")
    expect(removed.ok).toBe(true)
    if (!removed.ok) return
    expect(removed.data.entries).toEqual([])
    expect(updated.data.entries).toHaveLength(1)
  })

  it("refuses to edit or delete builtin content", () => {
    const user = createEmptyUserData()
    expect(updateEntry(user, builtinIds, exampleEntry)).toMatchObject({ ok: false, message: "内置内容不能修改。" })
    expect(deleteEntry(user, builtinIds, exampleEntry.id)).toMatchObject({ ok: false, message: "内置内容不能删除。" })
    expect(user.entries).toEqual([])
    expect(insertEntry(user, builtinIds, { ...exampleEntry }, () => exampleEntry.id)).toMatchObject({
      ok: false,
      message: "这条数据与内置内容的 id 相同，不能保存。",
    })
  })
})

describe("user data store", () => {
  it("keeps a saved entry after a new read", async () => {
    const created = insertEntry(createEmptyUserData(), new Set(), {
      name: "巷口路人",
      content: "巷口站着一个路人",
      category: "npc",
      tags: [],
      weight: 1,
    }, () => "user-entry-1")
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect((await writeUserData(created.data)).ok).toBe(true)
    const loaded = await readUserData()
    expect(loaded).toMatchObject({
      ok: true,
      data: { entries: [{ id: "user-entry-1", content: "巷口站着一个路人" }] },
    })
  })

  it("does not overwrite stored data when reading fails or saving is rejected", async () => {
    await idbStore.save({ ...createEmptyUserData(), version: 2 } as unknown as UserData)
    const loaded = await readUserData()
    expect(loaded.ok).toBe(false)
    expect(await idbStore.load()).toMatchObject({ version: 2 })

    const failingStore: UserDataStore = {
      load: async () => createEmptyUserData(),
      save: async () => {
        throw new DOMException("quota", "QuotaExceededError")
      },
    }
    const written = await writeUserData(createEmptyUserData(), failingStore)
    expect(written).toMatchObject({ ok: false, message: "本地存储空间不足，数据没有写入。" })
  })

  it("rejects an incompatible document", () => {
    expect(parseUserData({ version: 2, tables: [], entries: [], generators: [], history: [], settings: [] })).toMatchObject({
      ok: false,
      message: "数据版本不兼容。",
    })
  })
})
