export {
  TABLE_COVERAGE_ERROR,
  assignedRanges,
  formatAssignedSpan,
  rollTableExpression,
} from "./assignedRanges.ts"
export type { AssignedRange, TableExpressionOutcome } from "./assignedRanges.ts"
export { drawTable } from "./drawTable.ts"
export { filterTables } from "./filterTables.ts"
export type { TableQuery } from "./filterTables.ts"
export { formatTableResult } from "./formatTableResult.ts"
export { drawCollectionTable, orderCollectionTable } from "./orderRows.ts"
export { matchTableByValue, matchTableInput } from "./matchTable.ts"
export { parseRandomTables } from "./parseRandomTables.ts"
export type { ParseTablesOutcome } from "./parseRandomTables.ts"
export type { TableRollOutcome } from "./result.ts"
