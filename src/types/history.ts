import type { DiceRollResult } from "./dice.ts"

export type HistoryKind = "dice" | "table" | "pipeline" | "generator"

export type HistoryRecord = {
  id: string
  /** ISO 8601 时间。 */
  createdAt: string
  kind: HistoryKind
  input: string
  diceResult?: DiceRollResult
  output: string
  favorite: boolean
}

export type FavoriteRecord = HistoryRecord & {
  favorite: true
}
