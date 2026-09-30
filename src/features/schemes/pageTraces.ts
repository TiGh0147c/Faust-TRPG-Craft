import { COLLECTION_WORKSPACE_KEY } from "./collectionScheme.ts"
import { DICE_WORKSPACE_KEY } from "./compareScheme.ts"

export type ListTrace = {
  keyword: string
  category: string
  tag: string
  selectedId: string | null
  note: string
}

export type TableFormTrace = {
  mode: "" | "match" | "random" | "expression"
  rangeInput: string
  expression: string
  sides: string
  count: string
  modifier: string
  drawCount: string
  drawLimit: string
  orderMode: "all" | "prefix"
  orderCount: string
  included: string[]
}

const ENTRIES_KEY = "faust-entries-trace"
const GENERATORS_KEY = "faust-generators-trace"
const TABLES_KEY = "faust-tables-trace"
const TABLE_FORMS_KEY = "faust-table-forms"
const TRACE_KEYS = [
  DICE_WORKSPACE_KEY,
  COLLECTION_WORKSPACE_KEY,
  ENTRIES_KEY,
  GENERATORS_KEY,
  TABLES_KEY,
  TABLE_FORMS_KEY,
]

export function clearWorkingTraces() {
  try {
    for (const key of TRACE_KEYS) sessionStorage.removeItem(key)
  } catch {
    // Nothing else can remove the traces when this tab cannot use session storage.
  }
}

export function emptyListTrace(): ListTrace {
  return { keyword: "", category: "", tag: "", selectedId: null, note: "" }
}

export function readEntriesTrace(): ListTrace {
  return readList(ENTRIES_KEY)
}

export function writeEntriesTrace(patch: Partial<ListTrace>) {
  writeStored(ENTRIES_KEY, { ...readEntriesTrace(), ...patch })
}

export function readGeneratorsTrace(): ListTrace {
  return readList(GENERATORS_KEY)
}

export function writeGeneratorsTrace(patch: Partial<ListTrace>) {
  writeStored(GENERATORS_KEY, { ...readGeneratorsTrace(), ...patch })
}

export function readTablesTrace(): ListTrace {
  return readList(TABLES_KEY)
}

export function writeTablesTrace(patch: Partial<ListTrace>) {
  writeStored(TABLES_KEY, { ...readTablesTrace(), ...patch })
}

export function readTableForm(id: string): Partial<TableFormTrace> {
  const stored = readStored(TABLE_FORMS_KEY)
  const forms = stored?.forms
  if (!forms || typeof forms !== "object") return {}
  const form = (forms as Record<string, unknown>)[id]
  if (!form || typeof form !== "object") return {}
  return form as Partial<TableFormTrace>
}

export function writeTableForm(id: string, form: TableFormTrace) {
  const stored = readStored(TABLE_FORMS_KEY)
  const forms = stored?.forms && typeof stored.forms === "object" ? { ...(stored.forms as Record<string, unknown>) } : {}
  forms[id] = form
  writeStored(TABLE_FORMS_KEY, { forms })
}

function readList(key: string): ListTrace {
  const stored = readStored(key)
  if (!stored) return emptyListTrace()
  return {
    keyword: readText(stored.keyword),
    category: readText(stored.category),
    tag: readText(stored.tag),
    selectedId: typeof stored.selectedId === "string" ? stored.selectedId : null,
    note: readText(stored.note),
  }
}

function readText(value: unknown): string {
  return typeof value === "string" ? value : ""
}

function readStored(key: string): Record<string, unknown> | null {
  try {
    const text = sessionStorage.getItem(key)
    if (!text) return null
    const value = JSON.parse(text) as unknown
    if (!value || typeof value !== "object") return null
    return value as Record<string, unknown>
  } catch {
    return null
  }
}

function writeStored(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value))
  } catch {
    // The page still keeps the current values when this tab cannot store them.
  }
}
