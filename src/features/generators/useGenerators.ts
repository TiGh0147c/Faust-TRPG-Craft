import { useEffect, useMemo, useState } from "react"
import { readGeneratorsTrace, writeGeneratorsTrace } from "../schemes/pageTraces.ts"
import { filterGenerators } from "../../utils/generator/filterGenerators.ts"
import { useCatalog } from "../storage/useCatalog.ts"
import { runGenerator, type GeneratorRunResult } from "./runGenerator.ts"

export function useGenerators() {
  const catalog = useCatalog()
  const generators = catalog.generators
  const [restored] = useState(readGeneratorsTrace)
  const [selectedId, setSelectedId] = useState<string | null>(restored.selectedId)
  const [keyword, setKeyword] = useState(restored.keyword)
  const [category, setCategory] = useState(restored.category)
  const [tag, setTag] = useState(restored.tag)
  const [result, setResult] = useState<GeneratorRunResult | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const filtered = useMemo(
    () => filterGenerators(generators, { keyword, category, tag }),
    [generators, keyword, category, tag],
  )
  const categories = useMemo(
    () =>
      [...new Set(generators.map((generator) => generator.category))].sort((left, right) =>
        left.localeCompare(right, "zh"),
      ),
    [generators],
  )
  const tags = useMemo(
    () =>
      [...new Set(generators.flatMap((generator) => generator.tags))].sort((left, right) =>
        left.localeCompare(right, "zh"),
      ),
    [generators],
  )
  const selected =
    filtered.find((generator) => generator.id === selectedId) ?? (selectedId === null ? (filtered[0] ?? null) : null)

  useEffect(() => {
    writeGeneratorsTrace({ keyword, category, tag, selectedId })
  }, [keyword, category, tag, selectedId])

  function select(id: string) {
    if (id === selectedId) return
    setSelectedId(id)
    setResult(null)
    setActionError(null)
  }

  function generate() {
    if (!selected) return
    const outcome = runGenerator(selected, catalog.tables, catalog.entries)
    if (!outcome.ok) {
      setResult(null)
      setActionError(outcome.message)
      return outcome
    }
    setActionError(null)
    setResult(outcome.result)
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
    result: selected && result?.generatorId === selected.id ? result : null,
    actionError: selected ? actionError : null,
    generate,
  }
}
