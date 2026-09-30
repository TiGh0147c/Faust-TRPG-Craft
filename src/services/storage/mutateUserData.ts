import type { UserData } from "../../types/data.ts"
import type { Entry } from "../../types/entry.ts"
import type { Generator, GeneratorStep } from "../../types/generator.ts"
import type { RandomTable, TableMode } from "../../types/table.ts"
import { parseDiceExpression } from "../../utils/dice/parseDiceExpression.ts"
import { parseEntries } from "../../utils/entry/parseEntries.ts"
import { parseGenerators } from "../../utils/generator/parseGenerators.ts"
import { unknownTemplateVariable } from "../../utils/generator/template.ts"
import { parseRandomTables } from "../../utils/table/parseRandomTables.ts"

export type EntryDraft = {
  name: string
  content: string
  category: string
  tags: string[]
  weight: number
}

export type UserDataMutation =
  | { ok: true; data: UserData }
  | { ok: false; message: string }

export function insertEntry(
  user: UserData,
  builtinIds: ReadonlySet<string>,
  draft: EntryDraft,
  createId: () => string = () => crypto.randomUUID(),
): UserDataMutation {
  const built = buildEntry(draft, createId())
  if (!built.ok) return built
  const next = insertRecord(user.entries, built.entry, builtinIds)
  if (!next.ok) return next
  return { ok: true, data: { ...user, entries: next.records } }
}

export function updateEntry(
  user: UserData,
  builtinIds: ReadonlySet<string>,
  entry: Entry,
): UserDataMutation {
  const built = buildEntry(entry, entry.id)
  if (!built.ok) return built
  const next = replaceRecord(user.entries, built.entry, builtinIds)
  if (!next.ok) return next
  return { ok: true, data: { ...user, entries: next.records } }
}

export function deleteEntry(user: UserData, builtinIds: ReadonlySet<string>, id: string): UserDataMutation {
  const next = removeRecord(user.entries, id, builtinIds)
  if (!next.ok) return next
  return { ok: true, data: { ...user, entries: next.records } }
}

export type TableRowDraft = {
  id: string
  text: string
  entryId: string
  min: number
  max: number
  weight: number
}

export type TableDraft = {
  name: string
  description: string
  category: string
  tags: string[]
  mode: TableMode
  rows: TableRowDraft[]
}

export type GeneratorStepDraft = {
  id: string
  label: string
  tableId: string
  variable: string
  expression: string
}

export type GeneratorDraft = {
  name: string
  description: string
  category: string
  tags: string[]
  template: string
  steps: GeneratorStepDraft[]
}

export function insertTable(
  user: UserData,
  builtinIds: ReadonlySet<string>,
  draft: TableDraft,
  createId: () => string = () => crypto.randomUUID(),
): UserDataMutation {
  const built = buildTable(draft, createId())
  if (!built.ok) return built
  const next = insertRecord(user.tables, built.table, builtinIds)
  if (!next.ok) return next
  return { ok: true, data: { ...user, tables: next.records } }
}

export function updateTable(user: UserData, builtinIds: ReadonlySet<string>, id: string, draft: TableDraft): UserDataMutation {
  const built = buildTable(draft, id)
  if (!built.ok) return built
  const next = replaceRecord(user.tables, built.table, builtinIds)
  if (!next.ok) return next
  return { ok: true, data: { ...user, tables: next.records } }
}

export function deleteTable(user: UserData, builtinIds: ReadonlySet<string>, id: string): UserDataMutation {
  const next = removeRecord(user.tables, id, builtinIds)
  if (!next.ok) return next
  return { ok: true, data: { ...user, tables: next.records } }
}

export function insertGenerator(
  user: UserData,
  builtinIds: ReadonlySet<string>,
  draft: GeneratorDraft,
  tables: readonly RandomTable[],
  createId: () => string = () => crypto.randomUUID(),
): UserDataMutation {
  const built = buildGenerator(draft, createId(), tables)
  if (!built.ok) return built
  const next = insertRecord(user.generators, built.generator, builtinIds)
  if (!next.ok) return next
  return { ok: true, data: { ...user, generators: next.records } }
}

export function updateGenerator(
  user: UserData,
  builtinIds: ReadonlySet<string>,
  id: string,
  draft: GeneratorDraft,
  tables: readonly RandomTable[],
): UserDataMutation {
  const built = buildGenerator(draft, id, tables)
  if (!built.ok) return built
  const next = replaceRecord(user.generators, built.generator, builtinIds)
  if (!next.ok) return next
  return { ok: true, data: { ...user, generators: next.records } }
}

export function deleteGenerator(user: UserData, builtinIds: ReadonlySet<string>, id: string): UserDataMutation {
  const next = removeRecord(user.generators, id, builtinIds)
  if (!next.ok) return next
  return { ok: true, data: { ...user, generators: next.records } }
}

export function clearUserContent(user: UserData): UserDataMutation {
  return { ok: true, data: { ...user, tables: [], entries: [], generators: [] } }
}

export function clearSettings(user: UserData): UserDataMutation {
  return { ok: true, data: { ...user, settings: [] } }
}

function buildEntry(draft: EntryDraft, id: string): { ok: true; entry: Entry } | { ok: false; message: string } {
  const name = draft.name.trim()
  const content = draft.content.trim()
  const category = draft.category.trim()
  if (name === "") return { ok: false, message: "请填写名称。" }
  if (content === "") return { ok: false, message: "请填写正文。" }
  if (category === "") return { ok: false, message: "请填写分类。" }
  const parsed = parseEntries([
    {
      id,
      name,
      content,
      category,
      tags: draft.tags.map((tag) => tag.trim()).filter((tag) => tag !== ""),
      weight: draft.weight,
    },
  ])
  if (!parsed.ok) return parsed
  const entry = parsed.entries[0]
  if (!entry) return { ok: false, message: "本地数据格式不正确。" }
  return { ok: true, entry }
}

function buildTable(draft: TableDraft, id: string): { ok: true; table: RandomTable } | { ok: false; message: string } {
  const name = draft.name.trim()
  const category = draft.category.trim()
  if (name === "") return { ok: false, message: "请填写名称。" }
  if (category === "") return { ok: false, message: "请填写分类。" }
  if (draft.rows.length === 0) return { ok: false, message: "请至少添加一行。" }

  const rows = []
  const rowIds = new Set<string>()
  for (const row of draft.rows) {
    const text = row.text.trim()
    const entryId = row.entryId.trim()
    if (text === "") return { ok: false, message: "请填写表项文本。" }
    if (rowIds.has(row.id)) return { ok: false, message: "表项 id 重复了。" }
    rowIds.add(row.id)
    const base = entryId === "" ? { id: row.id, text } : { id: row.id, text, entryId }
    if (draft.mode === "range") {
      if (!Number.isSafeInteger(row.min) || !Number.isSafeInteger(row.max)) {
        return { ok: false, message: "请填写整数区间。" }
      }
      if (row.min > row.max) return { ok: false, message: "区间的最小值不能大于最大值。" }
      rows.push({ ...base, min: row.min, max: row.max })
    } else {
      if (!Number.isFinite(row.weight) || row.weight <= 0) return { ok: false, message: "权重必须大于 0。" }
      rows.push({ ...base, weight: row.weight })
    }
  }

  const parsed = parseRandomTables([
    {
      id,
      name,
      description: draft.description.trim(),
      category,
      tags: cleanTags(draft.tags),
      mode: draft.mode,
      entries: rows,
    },
  ])
  if (!parsed.ok) {
    return { ok: false, message: parsed.message === "内置随机表格式不正确。" ? "随机表格式不正确。" : parsed.message }
  }
  const table = parsed.tables[0]
  if (!table) return { ok: false, message: "随机表格式不正确。" }
  return { ok: true, table }
}

function buildGenerator(
  draft: GeneratorDraft,
  id: string,
  tables: readonly RandomTable[],
): { ok: true; generator: Generator } | { ok: false; message: string } {
  const name = draft.name.trim()
  const category = draft.category.trim()
  const template = draft.template.trim()
  if (name === "") return { ok: false, message: "请填写名称。" }
  if (category === "") return { ok: false, message: "请填写分类。" }
  if (template === "") return { ok: false, message: "请填写输出模板。" }
  if (draft.steps.length === 0) return { ok: false, message: "请至少添加一个步骤。" }

  const steps: GeneratorStep[] = []
  const stepIds = new Set<string>()
  const variables = new Set<string>()
  for (const step of draft.steps) {
    const label = step.label.trim()
    const variable = step.variable.trim()
    const expression = step.expression.trim()
    if (label === "") return { ok: false, message: "请填写步骤名称。" }
    if (variable === "") return { ok: false, message: "请填写变量名。" }
    if (variable.includes("{") || variable.includes("}") || /\s/u.test(variable)) {
      return { ok: false, message: "变量名不能包含空格或括号。" }
    }
    if (stepIds.has(step.id)) return { ok: false, message: "存在重复的步骤 id。" }
    if (variables.has(variable)) return { ok: false, message: `变量「${variable}」重复了。` }
    stepIds.add(step.id)
    variables.add(variable)
    const table = tables.find((item) => item.id === step.tableId)
    if (!table) return { ok: false, message: `找不到随机表「${step.tableId}」。` }
    if (table.mode === "range") {
      if (expression === "") return { ok: false, message: `「${label}」需要骰子表达式。` }
      const parsed = parseDiceExpression(expression)
      if (!parsed.ok) return parsed
    }
    const next: GeneratorStep = { id: step.id, label, tableId: table.id, variable }
    if (expression !== "") next.expression = expression
    steps.push(next)
  }

  const unknown = unknownTemplateVariable(template, variables)
  if (unknown === "") return { ok: false, message: "模板引用了空的变量。" }
  if (unknown !== null) return { ok: false, message: `模板引用了没有步骤的变量「${unknown}」。` }

  const parsed = parseGenerators([
    {
      id,
      name,
      description: draft.description.trim(),
      category,
      tags: cleanTags(draft.tags),
      steps,
      template,
    },
  ])
  if (!parsed.ok) return { ok: false, message: parsed.message }
  const generator = parsed.generators[0]
  if (!generator) return { ok: false, message: "生成器格式不正确。" }
  return { ok: true, generator }
}

function cleanTags(tags: string[]): string[] {
  return tags.map((tag) => tag.trim()).filter((tag) => tag !== "")
}

function insertRecord<T extends { id: string }>(
  records: readonly T[],
  record: T,
  builtinIds: ReadonlySet<string>,
): { ok: true; records: T[] } | { ok: false; message: string } {
  if (builtinIds.has(record.id)) return { ok: false, message: "这条数据与内置内容的 id 相同，不能保存。" }
  if (records.some((item) => item.id === record.id)) return { ok: false, message: "已经有相同 id 的用户数据。" }
  return { ok: true, records: [...records, record] }
}

function replaceRecord<T extends { id: string }>(
  records: readonly T[],
  record: T,
  builtinIds: ReadonlySet<string>,
): { ok: true; records: T[] } | { ok: false; message: string } {
  if (builtinIds.has(record.id)) return { ok: false, message: "内置内容不能修改。" }
  if (!records.some((item) => item.id === record.id)) return { ok: false, message: "找不到要修改的用户数据。" }
  return { ok: true, records: records.map((item) => (item.id === record.id ? record : item)) }
}

function removeRecord<T extends { id: string }>(
  records: readonly T[],
  id: string,
  builtinIds: ReadonlySet<string>,
): { ok: true; records: T[] } | { ok: false; message: string } {
  if (builtinIds.has(id)) return { ok: false, message: "内置内容不能删除。" }
  if (!records.some((item) => item.id === id)) return { ok: false, message: "找不到要删除的用户数据。" }
  return { ok: true, records: records.filter((item) => item.id !== id) }
}
