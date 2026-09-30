const MIN_ITEMS = 1
const MAX_ITEMS = 100
export const COLLECTION_WORKSPACE_KEY = "faust-custom-collection-workspace"

export type CollectionItemDraft = {
  id: string
  name: string
  weight: string
}

export type CollectionWorkspace = {
  source: "range" | "custom"
  start: string
  end: string
  itemCount: string
  items: CollectionItemDraft[]
  selectedItem: number
  weightDraft: string
  count: string
  limit: string
  orderMode: "all" | "prefix"
  orderCount: string
  note: string
}

export function defaultCollectionWorkspace(): CollectionWorkspace {
  return {
    source: "range",
    start: "1",
    end: "10",
    itemCount: "1",
    items: [blankCollectionItem()],
    selectedItem: 0,
    weightDraft: "1",
    count: "1",
    limit: "1",
    orderMode: "all",
    orderCount: "1",
    note: "",
  }
}

export function collectionScheme(items: readonly CollectionItemDraft[]) {
  return {
    kind: "custom-collection" as const,
    items: items.map(({ name, weight }) => ({ name, weight })),
  }
}

export function parseCollectionScheme(text: string): { ok: true; items: CollectionItemDraft[] } | { ok: false; message: string } {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return { ok: false, message: "无法识别这份方案。" }
  }
  if (!value || typeof value !== "object" || (value as { kind?: unknown }).kind !== "custom-collection") {
    return { ok: false, message: "这不是自定义集合方案。" }
  }
  const rows = (value as { items?: unknown }).items
  if (!Array.isArray(rows)) return { ok: false, message: "无法识别这份方案。" }
  if (rows.length < MIN_ITEMS) return { ok: false, message: "元素数量至少为 1。" }
  if (rows.length > MAX_ITEMS) return { ok: false, message: `元素数量不能超过 ${MAX_ITEMS}。` }
  const items: CollectionItemDraft[] = []
  for (const row of rows) {
    const item = readItem(row)
    if (!item) return { ok: false, message: "无法识别这份方案。" }
    items.push(item)
  }
  return { ok: true, items }
}

export function readCollectionWorkspace(): CollectionWorkspace {
  const stored = readStored(COLLECTION_WORKSPACE_KEY)
  if (!stored) return defaultCollectionWorkspace()
  const parsed = parseCollectionScheme(JSON.stringify({ kind: "custom-collection", items: stored.items }))
  const fallback = defaultCollectionWorkspace()
  const items = parsed.ok
    ? parsed.items.map((item, index) => ({ ...item, id: readId(storedItemId(stored.items, index)) }))
    : fallback.items
  const selectedItem = clampIndex(stored.selectedItem, items.length)
  return {
    source: stored.source === "custom" ? "custom" : "range",
    start: readText(stored.start, fallback.start),
    end: readText(stored.end, fallback.end),
    itemCount: String(items.length),
    items,
    selectedItem,
    weightDraft: readText(stored.weightDraft, items[selectedItem]?.weight ?? "1"),
    count: readText(stored.count, fallback.count),
    limit: readText(stored.limit, fallback.limit),
    orderMode: stored.orderMode === "prefix" ? "prefix" : "all",
    orderCount: readText(stored.orderCount, fallback.orderCount),
    note: readText(stored.note, ""),
  }
}

export function writeCollectionWorkspace(workspace: CollectionWorkspace) {
  writeStored(COLLECTION_WORKSPACE_KEY, workspace)
}

function blankCollectionItem(weight = "1"): CollectionItemDraft {
  return { id: createId(), name: "", weight }
}

function readItem(value: unknown): CollectionItemDraft | null {
  if (!value || typeof value !== "object") return null
  const row = value as Record<string, unknown>
  if (typeof row.name !== "string" || typeof row.weight !== "string") return null
  return { id: createId(), name: row.name, weight: row.weight }
}

function storedItemId(items: unknown, index: number): unknown {
  if (!Array.isArray(items)) return undefined
  const row = items[index]
  if (!row || typeof row !== "object") return undefined
  return (row as { id?: unknown }).id
}

function readText(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback
}

function readId(value: unknown): string {
  return typeof value === "string" && value.trim() !== "" ? value : createId()
}

function clampIndex(value: unknown, length: number): number {
  const index = typeof value === "number" && Number.isInteger(value) ? value : 0
  return Math.min(Math.max(index, 0), Math.max(length - 1, 0))
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

function createId(): string {
  return crypto.randomUUID()
}
