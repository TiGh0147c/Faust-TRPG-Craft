import type { Entry } from "../../types/entry.ts"

export type EntryQuery = {
  keyword: string
  category: string
  tag: string
}

export function filterEntries<T extends Entry>(entries: readonly T[], query: EntryQuery): T[] {
  const keyword = query.keyword.trim().toLocaleLowerCase()
  return entries.filter((entry) => {
    if (query.category !== "" && entry.category !== query.category) return false
    if (query.tag !== "" && !entry.tags.includes(query.tag)) return false
    if (keyword === "") return true
    const haystack = [entry.name, entry.content, entry.category, ...entry.tags].join("\n").toLocaleLowerCase()
    return haystack.includes(keyword)
  })
}
