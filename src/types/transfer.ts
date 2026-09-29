import type { APP_ID, DATA_VERSION, UserSetting } from "./data.ts"
import type { Entry } from "./entry.ts"
import type { Generator } from "./generator.ts"
import type { HistoryRecord } from "./history.ts"
import type { RandomTable } from "./table.ts"

export const TRANSFER_SCOPES = ["user", "history", "tables", "entries", "generators", "settings"] as const
export type TransferScope = (typeof TRANSFER_SCOPES)[number]
export const TRANSFER_MODES = ["snapshot", "merge"] as const
export type TransferMode = (typeof TRANSFER_MODES)[number]

type EnvelopeBase = {
  app: typeof APP_ID
  version: typeof DATA_VERSION
  exportedAt: string
  mode: TransferMode
}

export type TransferEnvelope =
  | (EnvelopeBase & {
      scope: "user"
      data: { tables: RandomTable[]; entries: Entry[]; generators: Generator[]; settings: UserSetting[] }
    })
  | (EnvelopeBase & { scope: "history"; data: { history: HistoryRecord[] } })
  | (EnvelopeBase & { scope: "tables"; data: { tables: RandomTable[] } })
  | (EnvelopeBase & { scope: "entries"; data: { entries: Entry[] } })
  | (EnvelopeBase & { scope: "generators"; data: { generators: Generator[] } })
  | (EnvelopeBase & { scope: "settings"; data: { settings: UserSetting[] } })
