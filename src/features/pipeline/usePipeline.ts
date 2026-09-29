import { useState } from "react"
import { useCatalog } from "../storage/useCatalog.ts"
import { composeDicePipeline, composeValuePipeline, type PipelineResult } from "./composePipeline.ts"

export function usePipeline() {
  const catalog = useCatalog()
  const tables = catalog.tables
  const entries = catalog.entries
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [expression, setExpression] = useState("1d100")
  const [valueInput, setValueInput] = useState("")
  const [result, setResult] = useState<PipelineResult | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const preferred = tables.find((table) => table.mode === "range") ?? tables[0] ?? null
  const selected = tables.find((table) => table.id === selectedId) ?? (selectedId === null ? preferred : null)

  function selectTable(id: string) {
    setSelectedId(id)
    setResult(null)
    setActionError(null)
  }

  function apply(outcome: { ok: true; result: PipelineResult } | { ok: false; message: string }) {
    if (!outcome.ok) {
      setResult(null)
      setActionError(outcome.message)
      return
    }
    setActionError(null)
    setResult(outcome.result)
    if (outcome.result.source.kind === "dice") setExpression(outcome.result.source.dice.expression)
    setValueInput(String(outcome.result.value))
  }

  function rollAndMatch() {
    if (!selected) return
    const outcome = composeDicePipeline(selected, entries, expression)
    apply(outcome)
    return outcome
  }

  function matchTypedValue() {
    if (!selected) return
    const outcome = composeValuePipeline(selected, entries, valueInput)
    apply(outcome)
    return outcome
  }

  return {
    status: catalog.status,
    loadError: catalog.loadError,
    tables,
    selected,
    selectTable,
    expression,
    setExpression,
    valueInput,
    setValueInput,
    result: selected && result?.tableId === selected.id ? result : null,
    actionError: selected ? actionError : null,
    rollAndMatch,
    matchTypedValue,
  }
}
