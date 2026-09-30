import type { DiceRollResult } from "./dice.ts"

export type HistoryKind = "dice" | "table" | "pipeline" | "generator" | "entry" | "collection"

export type HistoryRecord = {
  id: string
  /** ISO 8601 时间。 */
  createdAt: string
  kind: HistoryKind
  input: string
  diceResult?: DiceRollResult
  output: string
  /** 这次投掷或抽取的可选说明。为空时不保存。 */
  note?: string
  favorite: boolean
}

export type FavoriteRecord = HistoryRecord & {
  favorite: true
}
