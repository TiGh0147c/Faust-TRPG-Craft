import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { loadBuiltinEntries } from "../../services/builtinEntries.ts"
import { loadBuiltinGenerators } from "../../services/builtinGenerators.ts"
import { loadBuiltinTables } from "../../services/builtinTables.ts"
import { mergeCatalog } from "../../services/storage/mergeCatalog.ts"
import { appendHistory, clearHistory, deleteHistory, deleteHistoryRecords, setHistoryFavorite } from "../../services/storage/mutateHistory.ts"
import type { HistoryDraft } from "../../services/storage/mutateHistory.ts"
import {
  clearSettings,
  clearUserContent,
  deleteEntry,
  deleteGenerator,
  deleteTable,
  insertEntry,
  insertGenerator,
  insertTable,
  updateEntry,
  updateGenerator,
  updateTable,
} from "../../services/storage/mutateUserData.ts"
import type { EntryDraft, GeneratorDraft, TableDraft } from "../../services/storage/mutateUserData.ts"
import { applyTransfer, builtinIdsFrom } from "../../services/storage/transfer.ts"
import { createEmptyUserData, type BuiltinData, type UserData } from "../../types/data.ts"
import type { TransferEnvelope } from "../../types/transfer.ts"
import type { RandomTable } from "../../types/table.ts"
import type { Entry } from "../../types/entry.ts"
import type { UserDataMutation } from "../../services/storage/mutateUserData.ts"
import { readUserData, writeUserData } from "../../services/storage/userDataStore.ts"
import { CatalogContext, type CatalogValue } from "./catalogContext.ts"

const emptyBuiltin: BuiltinData = { tables: [], entries: [], generators: [] }

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<CatalogValue["status"]>("loading")
  const [loadError, setLoadError] = useState<string | null>(null)
  const [storageError, setStorageError] = useState<string | null>(null)
  const [builtin, setBuiltin] = useState<BuiltinData>(emptyBuiltin)
  const [user, setUser] = useState<UserData>(createEmptyUserData())
  const builtinRef = useRef(emptyBuiltin)
  const userRef = useRef(createEmptyUserData())
  const statusRef = useRef<CatalogValue["status"]>("loading")
  const writeBlockedRef = useRef<string | null>(null)
  const queueRef = useRef(Promise.resolve())

  useEffect(() => {
    let active = true
    Promise.all([loadBuiltinTables(), loadBuiltinEntries(), loadBuiltinGenerators()])
      .then(async ([tables, entries, generators]) => {
        if (!active) return
        const nextBuiltin = { tables, entries, generators }
        builtinRef.current = nextBuiltin
        setBuiltin(nextBuiltin)
        const stored = await readUserData()
        if (!active) return
        if (!stored.ok) {
          writeBlockedRef.current = stored.message
          userRef.current = createEmptyUserData()
          setStorageError(stored.message)
          setUser(createEmptyUserData())
        } else {
          writeBlockedRef.current = null
          userRef.current = stored.data
          setUser(stored.data)
        }
        statusRef.current = "ready"
        setStatus("ready")
      })
      .catch((error: unknown) => {
        if (!active) return
        statusRef.current = "error"
        setLoadError(error instanceof Error ? error.message : "无法读取内置数据。")
        setStatus("error")
      })
    return () => {
      active = false
    }
  }, [])

  const available = useMemo(() => mergeCatalog(builtin, user), [builtin, user])

  function enqueue(mutate: (current: UserData) => UserDataMutation): Promise<UserDataMutation> {
    const task = queueRef.current.then(async () => {
      if (statusRef.current === "loading") return { ok: false as const, message: "本地数据还在读取，这次没有写入。" }
      if (statusRef.current === "error") return { ok: false as const, message: "内置数据没有读出来，这次没有写入。" }
      if (writeBlockedRef.current) return { ok: false as const, message: writeBlockedRef.current }
      try {
        const changed = mutate(userRef.current)
        if (!changed.ok) return changed
        const written = await writeUserData(changed.data)
        if (!written.ok) return written
        userRef.current = written.data
        setUser(written.data)
        return written
      } catch {
        return { ok: false as const, message: "本地数据读写失败。" }
      }
    })
    queueRef.current = task.then(
      () => undefined,
      () => undefined,
    )
    return task
  }

  function createEntry(draft: EntryDraft): Promise<UserDataMutation> {
    return enqueue((current) => insertEntry(current, entryIds(builtinRef.current), draft))
  }

  function saveEntry(entry: Entry): Promise<UserDataMutation> {
    return enqueue((current) => updateEntry(current, entryIds(builtinRef.current), entry))
  }

  function removeEntry(id: string): Promise<UserDataMutation> {
    return enqueue((current) => deleteEntry(current, entryIds(builtinRef.current), id))
  }

  function createTable(draft: TableDraft): Promise<UserDataMutation> {
    return enqueue((current) => insertTable(current, idsOf(builtinRef.current.tables), draft))
  }

  function saveTable(id: string, draft: TableDraft): Promise<UserDataMutation> {
    return enqueue((current) => updateTable(current, idsOf(builtinRef.current.tables), id, draft))
  }

  function removeTable(id: string): Promise<UserDataMutation> {
    return enqueue((current) => deleteTable(current, idsOf(builtinRef.current.tables), id))
  }

  function createGenerator(draft: GeneratorDraft): Promise<UserDataMutation> {
    return enqueue((current) =>
      insertGenerator(current, idsOf(builtinRef.current.generators), draft, visibleTables(builtinRef.current.tables, current)),
    )
  }

  function saveGenerator(id: string, draft: GeneratorDraft): Promise<UserDataMutation> {
    return enqueue((current) =>
      updateGenerator(current, idsOf(builtinRef.current.generators), id, draft, visibleTables(builtinRef.current.tables, current)),
    )
  }

  function removeGenerator(id: string): Promise<UserDataMutation> {
    return enqueue((current) => deleteGenerator(current, idsOf(builtinRef.current.generators), id))
  }

  function clearSavedContent(): Promise<UserDataMutation> {
    return enqueue((current) => clearUserContent(current))
  }

  function clearSavedSettings(): Promise<UserDataMutation> {
    return enqueue((current) => clearSettings(current))
  }

  function clearEverything(): Promise<UserDataMutation> {
    return enqueue(() => ({ ok: true, data: createEmptyUserData() }))
  }

  function importSaved(envelope: TransferEnvelope): Promise<UserDataMutation> {
    return enqueue((current) => applyTransfer(current, envelope, builtinIdsFrom(builtinRef.current)))
  }

  function recordHistory(draft: HistoryDraft): Promise<UserDataMutation> {
    return enqueue((current) => appendHistory(current, draft))
  }

  function markHistory(id: string, favorite: boolean): Promise<UserDataMutation> {
    return enqueue((current) => setHistoryFavorite(current, id, favorite))
  }

  function removeHistory(id: string): Promise<UserDataMutation> {
    return enqueue((current) => deleteHistory(current, id))
  }

  function removeHistoryRecords(ids: readonly string[]): Promise<UserDataMutation> {
    return enqueue((current) => deleteHistoryRecords(current, ids))
  }

  function removeAllHistory(): Promise<UserDataMutation> {
    return enqueue((current) => clearHistory(current))
  }

  const value: CatalogValue = {
    status,
    loadError,
    storageError,
    builtin,
    user,
    tables: available.tables,
    entries: available.entries,
    generators: available.generators,
    createEntry,
    updateEntry: saveEntry,
    deleteEntry: removeEntry,
    createTable,
    updateTable: saveTable,
    deleteTable: removeTable,
    createGenerator,
    updateGenerator: saveGenerator,
    deleteGenerator: removeGenerator,
    clearUserContent: clearSavedContent,
    clearSettings: clearSavedSettings,
    clearAllData: clearEverything,
    importTransfer: importSaved,
    recordHistory,
    setHistoryFavorite: markHistory,
    deleteHistory: removeHistory,
    deleteHistoryRecords: removeHistoryRecords,
    clearHistory: removeAllHistory,
  }

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

function entryIds(builtin: BuiltinData): Set<string> {
  return idsOf(builtin.entries)
}

function idsOf(records: readonly { id: string }[]): Set<string> {
  return new Set(records.map((record) => record.id))
}

function visibleTables(builtinTables: readonly RandomTable[], user: UserData): RandomTable[] {
  const builtinIds = idsOf(builtinTables)
  return [...builtinTables, ...user.tables.filter((table) => !builtinIds.has(table.id))]
}
