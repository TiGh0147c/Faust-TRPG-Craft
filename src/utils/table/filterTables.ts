import type { RandomTable } from "../../types/table.ts"

export type TableQuery = {
  keyword: string
  category: string
  tag: string
}

export function filterTables<T extends RandomTable>(tables: readonly T[], query: TableQuery): T[] {
  const keyword = query.keyword.trim().toLocaleLowerCase()
  return tables.filter((table) => {
    if (query.category !== "" && table.category !== query.category) return false
    if (query.tag !== "" && !table.tags.includes(query.tag)) return false
    if (keyword === "") return true
    const haystack = [
      table.name,
      table.description,
      table.category,
      ...table.tags,
      ...table.entries.map((entry) => entry.text),
    ]
      .join("\n")
      .toLocaleLowerCase()
    return haystack.includes(keyword)
  })
}
