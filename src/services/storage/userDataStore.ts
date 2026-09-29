import { createEmptyUserData, type UserData } from "../../types/data.ts"
import { parseUserData } from "./parseUserData.ts"

const DB_NAME = "faust-trpg-craft"
const DB_VERSION = 1
const STORE = "documents"
const KEY = "user-data"

export type UserDataStore = {
  load(): Promise<unknown>
  save(data: UserData): Promise<void>
}

export type StoredUserDataResult =
  | { ok: true; data: UserData }
  | { ok: false; message: string }

export async function readUserData(store: UserDataStore = idbStore): Promise<StoredUserDataResult> {
  let raw: unknown
  try {
    raw = await store.load()
  } catch (error) {
    return { ok: false, message: storageErrorMessage(error) }
  }
  if (raw === undefined || raw === null) return { ok: true, data: createEmptyUserData() }
  const parsed = parseUserData(raw)
  if (!parsed.ok) {
    return {
      ok: false,
      message: "本地用户数据无法识别，当前只显示内置数据。原来的数据仍留在浏览器里。",
    }
  }
  return parsed
}

export async function writeUserData(data: UserData, store: UserDataStore = idbStore): Promise<StoredUserDataResult> {
  const parsed = parseUserData(data)
  if (!parsed.ok) return parsed
  try {
    await store.save(parsed.data)
  } catch (error) {
    return { ok: false, message: storageErrorMessage(error) }
  }
  return parsed
}

export const idbStore: UserDataStore = {
  load() {
    return withStore("readonly", (store) => store.get(KEY))
  },
  async save(data) {
    await withStore("readwrite", (store) => store.put(data, KEY))
  },
}

export function storageErrorMessage(error: unknown): string {
  if (isQuotaError(error)) return "本地存储空间不足，数据没有写入。"
  return "本地数据读写失败。"
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, mode)
        const request = run(transaction.objectStore(STORE))
        const fail = () => {
          const error = request.error ?? transaction.error ?? new Error("本地数据读写失败。")
          db.close()
          reject(error)
        }
        request.onerror = fail
        transaction.onabort = fail
        transaction.oncomplete = () => {
          db.close()
          resolve(request.result)
        }
      }),
  )
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("本地数据读写失败。"))
  })
}

function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED")
}
