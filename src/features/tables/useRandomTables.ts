import { useMemo, useState } from "react"
import { useCatalog } from "../storage/useCatalog.ts"
import type { DiceRollResult } from "../../types/dice.ts"
import type { TableRollResult, TableSequenceResult } from "../../types/table.ts"
import { drawCollectionTable, drawTable, filterTables, matchTableInput, orderCollectionTable, rollTableExpression } from "../../utils/table/index.ts"

export function useRandomTables() {
  const catalog = useCatalog()
  const tables = catalog.tables
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [keyword, setKeyword] = useState("")
  const [category, setCategory] = useState("")
  const [tag, setTag] = useState("")
  const [rangeInput, setRangeInput] = useState("")
  const [result, setResult] = useState<TableRollResult | null>(null)
  const [expressionDice, setExpressionDice] = useState<DiceRollResult | null>(null)
  const [sequence, setSequence] = useState<TableSequenceResult | null>(null)
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
    setExpressionDice(null)
    setSequence(null)
    setActionError(null)
    setRangeInput("")
  }

  function apply(outcome: { ok: true; result: TableRollResult } | { ok: false; message: string }) {
    if (!outcome.ok) {
      setResult(null)
      setExpressionDice(null)
      setActionError(outcome.message)
      return
    }
    setActionError(null)
    setSequence(null)
    setExpressionDice(null)
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

  function rollExpressionSelected(expression: string) {
    if (!selected) return
    const outcome = rollTableExpression(selected, expression)
    if (outcome.ok && outcome.result.value !== undefined) {
      setRangeInput(String(outcome.result.value))
    }
    if (!outcome.ok) {
      apply(outcome)
      return outcome
    }
    setActionError(null)
    setSequence(null)
    setResult(outcome.result)
    setExpressionDice(outcome.dice)
    if (outcome.result.value !== undefined) setRangeInput(String(outcome.result.value))
    return outcome
  }

  function orderSelected(ids?: readonly string[], prefix?: number) {
    if (!selected) return
    const outcome = orderCollectionTable(selected, Math.random, ids, prefix)
    if (!outcome.ok) {
      setSequence(null)
      setActionError(outcome.message)
      return outcome
    }
    setActionError(null)
    setResult(null)
    setExpressionDice(null)
    setSequence(outcome.result)
    return outcome
  }

  function drawRowsSelected(count: string, limit: string, ids?: readonly string[]) {
    if (!selected) return
    const outcome = drawCollectionTable(selected, count, limit, Math.random, ids)
    if (!outcome.ok) {
      setSequence(null)
      setActionError(outcome.message)
      return outcome
    }
    setActionError(null)
    setResult(null)
    setExpressionDice(null)
    setSequence(outcome.result)
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
    expressionDice: selected && result?.tableId === selected.id ? expressionDice : null,
    sequence: selected && sequence?.tableId === selected.id ? sequence : null,
    actionError: selected ? actionError : null,
    matchSelected,
    drawSelected,
    rollExpressionSelected,
    orderSelected,
    drawRowsSelected,
  }
}
