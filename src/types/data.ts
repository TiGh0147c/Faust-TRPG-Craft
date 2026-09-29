import type { Entry } from "./entry.ts"
import type { Generator } from "./generator.ts"
import type { HistoryRecord } from "./history.ts"
import type { RandomTable } from "./table.ts"

export const APP_ID = "faust-trpg-craft" as const
export const DATA_VERSION = 1 as const

export type DataOrigin = "builtin" | "user"

/** 合并后的当前可用数据。origin 只出现在这一层，不写进内置文件或用户存档。 */
export type Sourced<T> = T & {
  readonly origin: DataOrigin
}

export type BuiltinData = {
  tables: RandomTable[]
  entries: Entry[]
  generators: Generator[]
}

export type SettingValue = string | number | boolean | null

export type UserSetting = {
  key: string
  value: SettingValue
}

export type UserData = {
  version: typeof DATA_VERSION
  tables: RandomTable[]
  entries: Entry[]
  generators: Generator[]
  history: HistoryRecord[]
  settings: UserSetting[]
}

export type AvailableData = {
  tables: Sourced<RandomTable>[]
  entries: Sourced<Entry>[]
  generators: Sourced<Generator>[]
}

export function createEmptyUserData(): UserData {
  return {
    version: DATA_VERSION,
    tables: [],
    entries: [],
    generators: [],
    history: [],
    settings: [],
  }
}
