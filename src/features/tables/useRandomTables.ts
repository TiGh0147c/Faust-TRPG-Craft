import { useMemo, useState } from "react"
import { useCatalog } from "../storage/useCatalog.ts"
import type { TableRollResult } from "../../types/table.ts"
import { drawTable, filterTables, matchTableInput } from "../../utils/table/index.ts"

export function useRandomTables() {
  const catalog = useCatalog()
  const tables = catalog.tables
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [keyword, setKeyword] = useState("")
  const [category, setCategory] = useState("")
  const [tag, setTag] = useState("")
  const [rangeInput, setRangeInput] = useState("")
  const [result, setResult] = useState<TableRollResult | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const filtered = useMemo(
    () => filterTables(tables, { keyword, category, tag }),
    [tables, keyword, category, tag],
  )
  const categories = useMemo(
    () => [...new Set(tables.map((table) => table.category))].sort((left, right) => left.localeCompare(right, "zh")),
    [tables],
  )
  const tags = useMemo(
    () => [...new Set(tables.flatMap((table) => table.tags))].sort((left, right) => left.localeCompare(right, "zh")),
    [tables],
  )
  const selected =
    filtered.find((table) => table.id === selectedId) ?? (selectedId === null ? (filtered[0] ?? null) : null)

  function select(id: string) {
    if (id === selectedId) return
    setSelectedId(id)
    setResult(null)
    setActionError(null)
    setRangeInput("")
  }

  function apply(outcome: { ok: true; result: TableRollResult } | { ok: false; message: string }) {
    if (!outcome.ok) {
      setResult(null)
      setActionError(outcome.message)
      return
    }
    setActionError(null)
    setResult(outcome.result)
  }

  function matchSelected() {
    if (!selected) return
    const outcome = matchTableInput(selected, rangeInput)
    apply(outcome)
    return outcome
  }

  function drawSelected() {
    if (!selected) return
    const outcome = drawTable(selected)
    if (outcome.ok && outcome.result.value !== undefined) {
      setRangeInput(String(outcome.result.value))
    }
    apply(outcome)
    return outcome
  }

  return {
    status: catalog.status,
    loadError: catalog.loadError,
    filtered,
    categories,
    tags,
    keyword,
    setKeyword,
    category,
    setCategory,
    tag,
    setTag,
    selected,
    select,
    rangeInput,
    setRangeInput,
    result: selected && result?.tableId === selected.id ? result : null,
    actionError: selected ? actionError : null,
    matchSelected,
    drawSelected,
  }
}
