import type { UserData } from "../../types/data.ts"
import type { DiceRollResult } from "../../types/dice.ts"
import type { HistoryKind, HistoryRecord } from "../../types/history.ts"
import type { UserDataMutation } from "./mutateUserData.ts"

export type HistoryDraft = {
  kind: HistoryKind
  input: string
  output: string
  diceResult?: DiceRollResult
  note?: string
}

export function appendHistory(
  user: UserData,
  draft: HistoryDraft,
  createId: () => string = () => crypto.randomUUID(),
  now: () => string = () => new Date().toISOString(),
): UserDataMutation {
  const id = createId()
  if (user.history.some((item) => item.id === id)) {
    return { ok: false, message: "已经有相同 id 的历史记录。" }
  }
  const record: HistoryRecord = {
    id,
    createdAt: now(),
    kind: draft.kind,
    input: draft.input,
    output: draft.output,
    favorite: false,
  }
  if (draft.diceResult) record.diceResult = draft.diceResult
  const note = draft.note?.trim()
  if (note) record.note = note
  return { ok: true, data: { ...user, history: [record, ...user.history] } }
}

export function setHistoryFavorite(user: UserData, id: string, favorite: boolean): UserDataMutation {
  const current = user.history.find((item) => item.id === id)
  if (!current) return { ok: false, message: "找不到这条历史记录。" }
  if (current.favorite === favorite) return { ok: true, data: user }
  return {
    ok: true,
    data: {
      ...user,
      history: user.history.map((item) => (item.id === id ? { ...item, favorite } : item)),
    },
  }
}

export function deleteHistory(user: UserData, id: string): UserDataMutation {
  if (!user.history.some((item) => item.id === id)) return { ok: false, message: "找不到这条历史记录。" }
  return { ok: true, data: { ...user, history: user.history.filter((item) => item.id !== id) } }
}

export function clearHistory(user: UserData): UserDataMutation {
  return { ok: true, data: { ...user, history: [] } }
}

export function deleteHistoryRecords(user: UserData, ids: readonly string[]): UserDataMutation {
  if (ids.length === 0) return { ok: false, message: "请先选择历史记录。" }
  const unique = new Set(ids)
  if (unique.size !== ids.length) return { ok: false, message: "存在重复的历史记录 id。" }
  if ([...unique].some((id) => !user.history.some((item) => item.id === id))) {
    return { ok: false, message: "找不到要删除的历史记录。" }
  }
  return { ok: true, data: { ...user, history: user.history.filter((item) => !unique.has(item.id)) } }
}
