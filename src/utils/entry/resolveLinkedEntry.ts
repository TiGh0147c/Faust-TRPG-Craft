import type { Entry } from "../../types/entry.ts"

export type LinkedEntry =
  | { status: "none" }
  | { status: "loading" }
  | { status: "missing"; entryId: string }
  | { status: "found"; entry: Entry }

export function resolveLinkedEntry(entryId: string | undefined, entries: readonly Entry[] | null): LinkedEntry {
  if (!entryId) return { status: "none" }
  if (!entries) return { status: "loading" }
  const entry = entries.find((item) => item.id === entryId)
  if (!entry) return { status: "missing", entryId }
  return { status: "found", entry }
}
