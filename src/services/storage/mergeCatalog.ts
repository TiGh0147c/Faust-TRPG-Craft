import type { AvailableData, BuiltinData, Sourced, UserData } from "../../types/data.ts"

export function mergeCatalog(builtin: BuiltinData, user: UserData): AvailableData {
  return {
    tables: mergeRecords(builtin.tables, user.tables),
    entries: mergeRecords(builtin.entries, user.entries),
    generators: mergeRecords(builtin.generators, user.generators),
  }
}

function mergeRecords<T extends { id: string }>(builtin: readonly T[], user: readonly T[]): Sourced<T>[] {
  const builtinIds = new Set(builtin.map((item) => item.id))
  return [
    ...builtin.map((item) => ({ ...item, origin: "builtin" as const })),
    ...user.filter((item) => !builtinIds.has(item.id)).map((item) => ({ ...item, origin: "user" as const })),
  ]
}
