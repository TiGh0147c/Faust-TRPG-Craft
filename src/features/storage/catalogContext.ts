import { createContext } from "react"
import type { AvailableData, BuiltinData, UserData } from "../../types/data.ts"
import type { Entry } from "../../types/entry.ts"
import type { HistoryDraft } from "../../services/storage/mutateHistory.ts"
import type {
  EntryDraft,
  GeneratorDraft,
  TableDraft,
  UserDataMutation,
} from "../../services/storage/mutateUserData.ts"
import type { TransferEnvelope } from "../../types/transfer.ts"

export type CatalogValue = {
  status: "loading" | "ready" | "error"
  loadError: string | null
  storageError: string | null
  builtin: BuiltinData
  user: UserData
  tables: AvailableData["tables"]
  entries: AvailableData["entries"]
  generators: AvailableData["generators"]
  createEntry: (draft: EntryDraft) => Promise<UserDataMutation>
  updateEntry: (entry: Entry) => Promise<UserDataMutation>
  deleteEntry: (id: string) => Promise<UserDataMutation>
  createTable: (draft: TableDraft) => Promise<UserDataMutation>
  updateTable: (id: string, draft: TableDraft) => Promise<UserDataMutation>
  deleteTable: (id: string) => Promise<UserDataMutation>
  createGenerator: (draft: GeneratorDraft) => Promise<UserDataMutation>
  updateGenerator: (id: string, draft: GeneratorDraft) => Promise<UserDataMutation>
  deleteGenerator: (id: string) => Promise<UserDataMutation>
  clearUserContent: () => Promise<UserDataMutation>
  clearSettings: () => Promise<UserDataMutation>
  clearAllData: () => Promise<UserDataMutation>
  importTransfer: (envelope: TransferEnvelope) => Promise<UserDataMutation>
  recordHistory: (draft: HistoryDraft) => Promise<UserDataMutation>
  setHistoryFavorite: (id: string, favorite: boolean) => Promise<UserDataMutation>
  deleteHistory: (id: string) => Promise<UserDataMutation>
  deleteHistoryRecords: (ids: readonly string[]) => Promise<UserDataMutation>
  clearHistory: () => Promise<UserDataMutation>
}

export const CatalogContext = createContext<CatalogValue | null>(null)
