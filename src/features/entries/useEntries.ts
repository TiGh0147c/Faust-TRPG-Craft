import { useEffect, useMemo, useState } from "react"
import { readEntriesTrace, writeEntriesTrace } from "../schemes/pageTraces.ts"
import { drawEntry, filterEntries } from "../../utils/entry/index.ts"
import { useCatalog } from "../storage/useCatalog.ts"

export function useEntries() {
  const library = useCatalog()
  const [restored] = useState(readEntriesTrace)
  const [selectedId, setSelectedId] = useState<string | null>(restored.selectedId)
  const [keyword, setKeyword] = useState(restored.keyword)
  const [category, setCategory] = useState(restored.category)
  const [tag, setTag] = useState(restored.tag)
  const [actionError, setActionError] = useState<string | null>(null)

  const filtered = useMemo(
    () => filterEntries(library.entries, { keyword, category, tag }),
    [library.entries, keyword, category, tag],
  )
  const categories = useMemo(
    () =>
      [...new Set(library.entries.map((entry) => entry.category))].sort((left, right) =>
        left.localeCompare(right, "zh"),
      ),
    [library.entries],
  )
  const tags = useMemo(
    () =>
      [...new Set(library.entries.flatMap((entry) => entry.tags))].sort((left, right) =>
        left.localeCompare(right, "zh"),
      ),
    [library.entries],
  )
  const selected =
    filtered.find((entry) => entry.id === selectedId) ?? (selectedId === null ? (filtered[0] ?? null) : null)

  useEffect(() => {
    writeEntriesTrace({ keyword, category, tag, selectedId })
  }, [keyword, category, tag, selectedId])

  function select(id: string) {
    setActionError(null)
    setSelectedId(id)
  }

  function updateKeyword(value: string) {
    setActionError(null)
    setKeyword(value)
  }

  function updateCategory(value: string) {
    setActionError(null)
    setCategory(value)
  }

  function updateTag(value: string) {
    setActionError(null)
    setTag(value)
  }

  function drawFiltered() {
    const outcome = drawEntry(filtered)
    if (!outcome.ok) {
      setActionError(outcome.message)
      return outcome
    }
    setActionError(null)
    setSelectedId(outcome.entry.id)
    return outcome
  }

  return {
    status: library.status,
    loadError: library.loadError,
    filtered,
    categories,
    tags,
    keyword,
    setKeyword: updateKeyword,
    category,
    setCategory: updateCategory,
    tag,
    setTag: updateTag,
    selected,
    select,
    actionError,
    drawFiltered,
  }
}
