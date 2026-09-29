import type { Generator } from "../../types/generator.ts"

export type GeneratorQuery = {
  keyword: string
  category: string
  tag: string
}

export function filterGenerators<T extends Generator>(generators: readonly T[], query: GeneratorQuery): T[] {
  const keyword = query.keyword.trim().toLocaleLowerCase()
  return generators.filter((generator) => {
    if (query.category !== "" && generator.category !== query.category) return false
    if (query.tag !== "" && !generator.tags.includes(query.tag)) return false
    if (keyword === "") return true
    const haystack = [
      generator.name,
      generator.description,
      generator.category,
      generator.template,
      ...generator.tags,
      ...generator.steps.map((step) => `${step.label}\n${step.variable}`),
    ]
      .join("\n")
      .toLocaleLowerCase()
    return haystack.includes(keyword)
  })
}
