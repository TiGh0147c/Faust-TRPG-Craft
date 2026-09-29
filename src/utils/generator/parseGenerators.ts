import type { Generator, GeneratorStep } from "../../types/generator.ts"

export type ParseGeneratorsOutcome =
  | { ok: true; generators: Generator[] }
  | { ok: false; message: string }

export function parseGenerators(input: unknown): ParseGeneratorsOutcome {
  if (!Array.isArray(input)) return invalid()
  const generators: Generator[] = []
  const ids = new Set<string>()
  for (const item of input) {
    if (!isRecord(item)) return invalid()
    const id = readString(item.id)
    const name = readString(item.name)
    const description = readText(item.description)
    const category = readString(item.category)
    const tags = readStringList(item.tags)
    const template = readText(item.template)
    if (!id || !name || description === null || !category || !tags || template === null || !Array.isArray(item.steps)) {
      return invalid()
    }
    if (ids.has(id)) return { ok: false, message: "存在重复的生成器 id。" }
    ids.add(id)
    const steps: GeneratorStep[] = []
    for (const step of item.steps) {
      if (!isRecord(step)) return invalid()
      const stepId = readString(step.id)
      const label = readString(step.label)
      const tableId = readString(step.tableId)
      const variable = readString(step.variable)
      if (!stepId || !label || !tableId || !variable) return invalid()
      if (step.expression !== undefined && typeof step.expression !== "string") return invalid()
      steps.push({
        id: stepId,
        label,
        tableId,
        variable,
        expression: typeof step.expression === "string" ? step.expression : undefined,
      })
    }
    generators.push({ id, name, description, category, tags, steps, template })
  }
  return { ok: true, generators }
}

function invalid(): { ok: false; message: string } {
  return { ok: false, message: "生成器格式不正确。" }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null
}

function readText(value: unknown): string | null {
  return typeof value === "string" ? value : null
}

function readStringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return null
  return value
}
