import "fake-indexeddb/auto"
import { IDBFactory } from "fake-indexeddb"
import { beforeEach, describe, expect, it } from "vitest"
import { composeValuePipeline } from "../pipeline/composePipeline.ts"
import { exampleCityNightTable, exampleEntry } from "../../types/examples.ts"
import { createEmptyUserData } from "../../types/data.ts"
import { appendHistory, clearHistory, deleteHistory, setHistoryFavorite } from "../../services/storage/mutateHistory.ts"
import { readUserData, writeUserData } from "../../services/storage/userDataStore.ts"
import { rollDice } from "../../utils/dice/rollDice.ts"
import { matchTableByValue } from "../../utils/table/matchTable.ts"
import { diceHistoryDraft, pipelineHistoryDraft, tableHistoryDraft } from "./historyDrafts.ts"
import { filterHistory, formatHistoryTime } from "./filterHistory.ts"

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
})

describe("history drafts", () => {
  it("builds dice, table, and pipeline records", () => {
    const rolled = rollDice("1d6", () => 0)
    expect(rolled.ok).toBe(true)
    if (!rolled.ok) return
    const dice = diceHistoryDraft(rolled.result)
    expect(dice.kind).toBe("dice")
    expect(dice.input).toBe("1d6")
    expect(dice.output).toContain("最终结果：1")
    expect(dice.diceResult?.total).toBe(1)

    const matched = matchTableByValue(exampleCityNightTable, 20)
    expect(matched.ok).toBe(true)
    if (!matched.ok) return
    const table = tableHistoryDraft(matched.result, undefined, "match")
    expect(table).toMatchObject({ kind: "table", input: "20" })
    expect(table.output).toContain("平静无事")

    const pipeline = composeValuePipeline(exampleCityNightTable, [exampleEntry], "73")
    expect(pipeline.ok).toBe(true)
    if (!pipeline.ok) return
    const linked = pipelineHistoryDraft(pipeline.result)
    expect(linked.kind).toBe("pipeline")
    expect(linked.input).toBe("73")
    expect(linked.output).toContain("在街角发现异常踪迹")
    expect(linked.diceResult).toBeUndefined()
  })
})

describe("history mutations", () => {
  it("prepends records and leaves the previous document unchanged", () => {
    const original = {
      ...createEmptyUserData(),
      entries: [exampleEntry],
    }
    const first = appendHistory(
      original,
      { kind: "dice", input: "1d6", output: "最终结果：1" },
      () => "history-1",
      () => "2026-09-30T01:00:00.000Z",
    )
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const second = appendHistory(
      first.data,
      { kind: "table", input: "20", output: "平静无事" },
      () => "history-2",
      () => "2026-09-30T01:01:00.000Z",
    )
    expect(second.ok).toBe(true)
    if (!second.ok) return
    expect(original.history).toEqual([])
    expect(first.data.history).toHaveLength(1)
    expect(second.data.history.map((item) => item.id)).toEqual(["history-2", "history-1"])
    expect(second.data.entries).toEqual([exampleEntry])
    expect(second.data.history[0]).toMatchObject({ favorite: false, createdAt: "2026-09-30T01:01:00.000Z" })
    const noted = appendHistory(second.data, { kind: "dice", input: "1d6", output: "结果", note: "  夜间检定  " }, () => "history-3")
    expect(noted.ok).toBe(true)
    if (!noted.ok) return
    expect(noted.data.history[0]?.note).toBe("夜间检定")
    const blank = appendHistory(noted.data, { kind: "dice", input: "1d6", output: "结果", note: "   " }, () => "history-4")
    expect(blank.ok).toBe(true)
    if (!blank.ok) return
    expect(blank.data.history[0]?.note).toBeUndefined()
    expect(filterHistory(noted.data.history, { keyword: "夜间", kind: "", favoritesOnly: false })).toHaveLength(1)
  })

  it("toggles a favorite, deletes one record, and clears only history", () => {
    const created = appendHistory(
      { ...createEmptyUserData(), entries: [exampleEntry], tables: [exampleCityNightTable] },
      { kind: "pipeline", input: "73", output: "在街角发现异常踪迹" },
      () => "history-1",
      () => "2026-09-30T01:00:00.000Z",
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return
    const favorite = setHistoryFavorite(created.data, "history-1", true)
    expect(favorite.ok).toBe(true)
    if (!favorite.ok) return
    expect(created.data.history[0]?.favorite).toBe(false)
    expect(favorite.data.history[0]?.favorite).toBe(true)
    expect(filterHistory(favorite.data.history, { keyword: "街角", kind: "pipeline", favoritesOnly: true })).toHaveLength(1)
    expect(filterHistory(favorite.data.history, { keyword: "", kind: "dice", favoritesOnly: false })).toEqual([])

    const removed = deleteHistory(favorite.data, "history-1")
    expect(removed.ok).toBe(true)
    if (!removed.ok) return
    expect(removed.data.history).toEqual([])
    expect(removed.data.entries).toEqual([exampleEntry])
    expect(favorite.data.history).toHaveLength(1)

    const again = appendHistory(removed.data, { kind: "dice", input: "1d20", output: "最终结果：8" }, () => "history-2")
    expect(again.ok).toBe(true)
    if (!again.ok) return
    const cleared = clearHistory(again.data)
    expect(cleared.ok).toBe(true)
    if (!cleared.ok) return
    expect(cleared.data.history).toEqual([])
    expect(cleared.data.entries).toEqual([exampleEntry])
    expect(cleared.data.tables).toEqual([exampleCityNightTable])
    expect(again.data.history).toHaveLength(1)
    expect(deleteHistory(cleared.data, "missing")).toMatchObject({ ok: false, message: "找不到这条历史记录。" })
  })

  it("keeps user entries after history is cleared in storage", async () => {
    const created = appendHistory(
      { ...createEmptyUserData(), entries: [exampleEntry] },
      { kind: "dice", input: "1d6", output: "最终结果：1" },
      () => "history-1",
    )
    expect(created.ok).toBe(true)
    if (!created.ok) return
    expect((await writeUserData(created.data)).ok).toBe(true)
    const cleared = clearHistory(created.data)
    expect(cleared.ok).toBe(true)
    if (!cleared.ok) return
    expect((await writeUserData(cleared.data)).ok).toBe(true)
    const loaded = await readUserData()
    expect(loaded).toMatchObject({
      ok: true,
      data: { history: [], entries: [{ id: exampleEntry.id, content: exampleEntry.content }] },
    })
  })
})

describe("formatHistoryTime", () => {
  it("keeps an unreadable timestamp and formats a valid one", () => {
    expect(formatHistoryTime("不是时间")).toBe("不是时间")
    expect(formatHistoryTime("2026-06-15T12:00:00.000Z")).toContain("2026")
  })
})
