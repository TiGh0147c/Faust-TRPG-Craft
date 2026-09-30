import type { RandomTable, TableEntry, TableRollResult } from "../../types/table.ts"

export type TableRollOutcome =
  | { ok: true; result: TableRollResult }
  | { ok: false; message: string }

export function toTableRollResult(
  table: RandomTable,
  entry: TableEntry,
  value?: number,
  span?: { min: number; max: number },
): TableRollResult {
  return {
    tableId: table.id,
    tableName: table.name,
    rowId: entry.id,
    text: entry.text,
    entryId: entry.entryId,
    mode: table.mode,
    value,
    min: span?.min ?? ("min" in entry ? entry.min : undefined),
    max: span?.max ?? ("max" in entry ? entry.max : undefined),
  }
}
