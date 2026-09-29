import { APP_ID, DATA_VERSION, type BuiltinData, type UserData, type UserSetting } from "../../types/data.ts"
import type { Entry } from "../../types/entry.ts"
import type { Generator } from "../../types/generator.ts"
import type { HistoryRecord } from "../../types/history.ts"
import type { RandomTable } from "../../types/table.ts"
import { TRANSFER_MODES, TRANSFER_SCOPES, type TransferEnvelope, type TransferMode, type TransferScope } from "../../types/transfer.ts"
import { parseEntries } from "../../utils/entry/parseEntries.ts"
import { parseGenerators } from "../../utils/generator/parseGenerators.ts"
import { parseRandomTables } from "../../utils/table/parseRandomTables.ts"
import type { UserDataMutation } from "./mutateUserData.ts"
import { parseHistoryRecords, parseSettingsList } from "./parseUserData.ts"

export type BuiltinIds = {
  tables: ReadonlySet<string>
  entries: ReadonlySet<string>
  generators: ReadonlySet<string>
}

export type TransferExpected = {
  scope: TransferScope
  mode?: TransferMode
}

export type ParseTransferOutcome = { ok: true; envelope: TransferEnvelope } | { ok: false; message: string }

const SCOPE_LABEL: Record<TransferScope, string> = {
  user: "用户数据",
  history: "历史",
  tables: "随机表",
  entries: "词条",
  generators: "生成器",
  settings: "设置",
}

export function builtinIdsFrom(builtin: BuiltinData): BuiltinIds {
  return {
    tables: new Set(builtin.tables.map((item) => item.id)),
    entries: new Set(builtin.entries.map((item) => item.id)),
    generators: new Set(builtin.generators.map((item) => item.id)),
  }
}

export function exportUserSnapshot(
  user: UserData,
  exportedAt = new Date().toISOString(),
): Extract<TransferEnvelope, { scope: "user" }> {
  return {
    app: APP_ID,
    version: DATA_VERSION,
    exportedAt,
    scope: "user",
    mode: "snapshot",
    data: {
      tables: user.tables,
      entries: user.entries,
      generators: user.generators,
      settings: user.settings,
    },
  }
}

export function exportHistorySnapshot(
  user: UserData,
  exportedAt = new Date().toISOString(),
): Extract<TransferEnvelope, { scope: "history" }> {
  return {
    app: APP_ID,
    version: DATA_VERSION,
    exportedAt,
    scope: "history",
    mode: "snapshot",
    data: { history: user.history },
  }
}

export function exportTablesSnapshot(user: UserData, exportedAt = new Date().toISOString()): TransferEnvelope {
  return envelope("tables", "snapshot", { tables: user.tables }, exportedAt)
}

export function exportEntriesSnapshot(user: UserData, exportedAt = new Date().toISOString()): TransferEnvelope {
  return envelope("entries", "snapshot", { entries: user.entries }, exportedAt)
}

export function exportGeneratorsSnapshot(user: UserData, exportedAt = new Date().toISOString()): TransferEnvelope {
  return envelope("generators", "snapshot", { generators: user.generators }, exportedAt)
}

export function exportSettingsSnapshot(user: UserData, exportedAt = new Date().toISOString()): TransferEnvelope {
  return envelope("settings", "snapshot", { settings: user.settings }, exportedAt)
}

export function exportTablesMerge(tables: readonly RandomTable[], exportedAt = new Date().toISOString()): TransferEnvelope {
  return envelope("tables", "merge", { tables: [...tables] }, exportedAt)
}

export function exportEntriesMerge(entries: readonly Entry[], exportedAt = new Date().toISOString()): TransferEnvelope {
  return envelope("entries", "merge", { entries: [...entries] }, exportedAt)
}

export function exportGeneratorsMerge(
  generators: readonly Generator[],
  exportedAt = new Date().toISOString(),
): TransferEnvelope {
  return envelope("generators", "merge", { generators: [...generators] }, exportedAt)
}

export function exportHistoryMerge(history: readonly HistoryRecord[], exportedAt = new Date().toISOString()): TransferEnvelope {
  return envelope("history", "merge", { history: [...history] }, exportedAt)
}

export function transferFilename(file: TransferEnvelope, itemName?: string): string {
  const day = file.exportedAt.slice(0, 10)
  const date = /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : "backup"
  const kind = file.mode === "merge" ? `${file.scope}-selection` : file.scope
  const name = itemName ? `-${fileSlug(itemName)}` : ""
  return `faust-trpg-craft-${kind}${name}-${date}.json`
}

export function parseTransferText(text: string, expected: TransferExpected, builtin: BuiltinIds): ParseTransferOutcome {
  try {
    return parseTransfer(JSON.parse(text) as unknown, expected, builtin)
  } catch {
    return { ok: false, message: "文件不是有效的 JSON。" }
  }
}

export function parseTransfer(input: unknown, expected: TransferExpected, builtin: BuiltinIds): ParseTransferOutcome {
  if (!isRecord(input)) return invalid()
  if (typeof input.app !== "string" || input.app.trim() === "") return invalid()
  if (input.app !== APP_ID) return { ok: false, message: "这不是本工具的备份文件。" }
  if (typeof input.version !== "number") return invalid()
  if (input.version !== DATA_VERSION) return { ok: false, message: "数据版本不兼容。" }
  if (typeof input.exportedAt !== "string" || input.exportedAt.trim() === "") return invalid()
  if (!isScope(input.scope) || !isMode(input.mode) || !isRecord(input.data)) return invalid()
  if (input.scope !== expected.scope) return { ok: false, message: `这份文件是${SCOPE_LABEL[input.scope]}备份。` }
  if (expected.mode && input.mode !== expected.mode) {
    return {
      ok: false,
      message: expected.mode === "snapshot" ? "这份文件是合并备份，请使用导入并合并。" : "这份文件是整份覆盖备份，请使用导入并覆盖。",
    }
  }

  const payload = readPayload(input.scope, input.mode, input.exportedAt, input.data)
  if (!payload.ok) return payload
  const envelope = migrate(payload.envelope)
  if (collidesWithBuiltin(envelope, builtin)) return { ok: false, message: "与内置内容 id 相同，不能导入。" }
  return { ok: true, envelope }
}

export function applyTransfer(user: UserData, file: TransferEnvelope, builtin: BuiltinIds): UserDataMutation {
  if (collidesWithBuiltin(file, builtin)) return { ok: false, message: "与内置内容 id 相同，不能导入。" }
  if (file.scope === "user") {
    return {
      ok: true,
      data: {
        ...user,
        tables: file.mode === "snapshot" ? file.data.tables : mergeById(user.tables, file.data.tables),
        entries: file.mode === "snapshot" ? file.data.entries : mergeById(user.entries, file.data.entries),
        generators: file.mode === "snapshot" ? file.data.generators : mergeById(user.generators, file.data.generators),
        settings: file.mode === "snapshot" ? file.data.settings : mergeSettings(user.settings, file.data.settings),
      },
    }
  }
  if (file.scope === "history") {
    return {
      ok: true,
      data: { ...user, history: file.mode === "snapshot" ? file.data.history : mergeById(user.history, file.data.history) },
    }
  }
  if (file.scope === "tables") {
    return { ok: true, data: { ...user, tables: file.mode === "snapshot" ? file.data.tables : mergeById(user.tables, file.data.tables) } }
  }
  if (file.scope === "entries") {
    return {
      ok: true,
      data: { ...user, entries: file.mode === "snapshot" ? file.data.entries : mergeById(user.entries, file.data.entries) },
    }
  }
  if (file.scope === "generators") {
    return {
      ok: true,
      data: {
        ...user,
        generators: file.mode === "snapshot" ? file.data.generators : mergeById(user.generators, file.data.generators),
      },
    }
  }
  return {
    ok: true,
    data: { ...user, settings: file.mode === "snapshot" ? file.data.settings : mergeSettings(user.settings, file.data.settings) },
  }
}

export function describeImport(user: UserData, file: TransferEnvelope): string {
  if (file.scope === "user" && file.mode === "snapshot") {
    return `将覆盖当前的用户数据：随机表 ${file.data.tables.length} 张、词条 ${file.data.entries.length} 条、生成器 ${file.data.generators.length} 个、设置 ${file.data.settings.length} 项。历史会保留。`
  }
  if (file.scope === "user") {
    const tables = countById(user.tables, file.data.tables)
    const entries = countById(user.entries, file.data.entries)
    const generators = countById(user.generators, file.data.generators)
    const settings = countSettings(user.settings, file.data.settings)
    return `将合并用户数据：随机表新增 ${tables.added} 张、更新 ${tables.updated} 张，词条新增 ${entries.added} 条、更新 ${entries.updated} 条，生成器新增 ${generators.added} 个、更新 ${generators.updated} 个，设置新增 ${settings.added} 项、更新 ${settings.updated} 项。历史会保留。`
  }
  if (file.scope === "history" && file.mode === "snapshot") {
    return `将覆盖全部历史，导入后有 ${file.data.history.length} 条。用户内容会保留。`
  }
  if (file.scope === "history") {
    const history = countById(user.history, file.data.history)
    return `将合并历史记录：新增 ${history.added} 条，更新 ${history.updated} 条。`
  }
  if (file.scope === "tables" && file.mode === "snapshot") {
    return `将覆盖当前的用户随机表，导入后有 ${file.data.tables.length} 张。`
  }
  if (file.scope === "tables") {
    const tables = countById(user.tables, file.data.tables)
    return `将合并随机表：新增 ${tables.added} 张，更新 ${tables.updated} 张。`
  }
  if (file.scope === "entries" && file.mode === "snapshot") {
    return `将覆盖当前的用户词条，导入后有 ${file.data.entries.length} 条。`
  }
  if (file.scope === "entries") {
    const entries = countById(user.entries, file.data.entries)
    return `将合并词条：新增 ${entries.added} 条，更新 ${entries.updated} 条。`
  }
  if (file.scope === "generators" && file.mode === "snapshot") {
    return `将覆盖当前的用户生成器，导入后有 ${file.data.generators.length} 个。`
  }
  if (file.scope === "generators") {
    const generators = countById(user.generators, file.data.generators)
    return `将合并生成器：新增 ${generators.added} 个，更新 ${generators.updated} 个。`
  }
  if (file.mode === "snapshot") return `将覆盖当前设置，导入后有 ${file.data.settings.length} 项。`
  const settings = countSettings(user.settings, file.data.settings)
  return `将合并设置：新增 ${settings.added} 项，更新 ${settings.updated} 项。`
}

function envelope<S extends TransferScope>(
  scope: S,
  mode: TransferMode,
  data: Extract<TransferEnvelope, { scope: S }>["data"],
  exportedAt: string,
): Extract<TransferEnvelope, { scope: S }> {
  return { app: APP_ID, version: DATA_VERSION, exportedAt, scope, mode, data } as Extract<TransferEnvelope, { scope: S }>
}

function migrate(file: TransferEnvelope): TransferEnvelope {
  return file
}

function readPayload(
  scope: TransferScope,
  mode: TransferMode,
  exportedAt: string,
  data: Record<string, unknown>,
): ParseTransferOutcome {
  if (scope === "user") {
    const tables = readTables(data.tables)
    if (!tables.ok) return tables
    const entries = readEntries(data.entries)
    if (!entries.ok) return entries
    const generators = readGenerators(data.generators)
    if (!generators.ok) return generators
    const settings = readSettings(data.settings)
    if (!settings.ok) return settings
    return {
      ok: true,
      envelope: {
        app: APP_ID,
        version: DATA_VERSION,
        exportedAt,
        scope,
        mode,
        data: {
          tables: tables.tables,
          entries: entries.entries,
          generators: generators.generators,
          settings: settings.settings,
        },
      },
    }
  }
  if (scope === "history") {
    const history = readHistory(data.history)
    if (!history.ok) return history
    return { ok: true, envelope: { app: APP_ID, version: DATA_VERSION, exportedAt, scope, mode, data: { history: history.history } } }
  }
  if (scope === "tables") {
    const tables = readTables(data.tables)
    if (!tables.ok) return tables
    return { ok: true, envelope: { app: APP_ID, version: DATA_VERSION, exportedAt, scope, mode, data: { tables: tables.tables } } }
  }
  if (scope === "entries") {
    const entries = readEntries(data.entries)
    if (!entries.ok) return entries
    return { ok: true, envelope: { app: APP_ID, version: DATA_VERSION, exportedAt, scope, mode, data: { entries: entries.entries } } }
  }
  if (scope === "generators") {
    const generators = readGenerators(data.generators)
    if (!generators.ok) return generators
    return {
      ok: true,
      envelope: { app: APP_ID, version: DATA_VERSION, exportedAt, scope, mode, data: { generators: generators.generators } },
    }
  }
  const settings = readSettings(data.settings)
  if (!settings.ok) return settings
  return { ok: true, envelope: { app: APP_ID, version: DATA_VERSION, exportedAt, scope, mode, data: { settings: settings.settings } } }
}

function readTables(input: unknown): { ok: true; tables: RandomTable[] } | { ok: false; message: string } {
  const parsed = parseRandomTables(input)
  if (!parsed.ok) return { ok: false, message: parsed.message === "内置随机表格式不正确。" ? "随机表格式不正确。" : parsed.message }
  return { ok: true, tables: parsed.tables }
}

function readEntries(input: unknown): { ok: true; entries: Entry[] } | { ok: false; message: string } {
  const parsed = parseEntries(input)
  if (!parsed.ok) return { ok: false, message: parsed.message === "内置词条格式不正确。" ? "词条格式不正确。" : parsed.message }
  return { ok: true, entries: parsed.entries }
}

function readGenerators(input: unknown): { ok: true; generators: Generator[] } | { ok: false; message: string } {
  const parsed = parseGenerators(input)
  if (!parsed.ok) return parsed
  return { ok: true, generators: parsed.generators }
}

function readHistory(input: unknown): { ok: true; history: HistoryRecord[] } | { ok: false; message: string } {
  const parsed = parseHistoryRecords(input)
  if (!parsed.ok) {
    return { ok: false, message: parsed.message === "本地数据格式不正确。" ? "历史记录格式不正确。" : parsed.message }
  }
  return { ok: true, history: parsed.history }
}

function readSettings(input: unknown): { ok: true; settings: UserSetting[] } | { ok: false; message: string } {
  const parsed = parseSettingsList(input)
  if (!parsed.ok) return { ok: false, message: parsed.message === "本地数据格式不正确。" ? "设置格式不正确。" : parsed.message }
  return { ok: true, settings: parsed.settings }
}

function collidesWithBuiltin(file: TransferEnvelope, builtin: BuiltinIds): boolean {
  const tables = file.scope === "user" || file.scope === "tables" ? file.data.tables : []
  const entries = file.scope === "user" || file.scope === "entries" ? file.data.entries : []
  const generators = file.scope === "user" || file.scope === "generators" ? file.data.generators : []
  return (
    tables.some((item) => builtin.tables.has(item.id)) ||
    entries.some((item) => builtin.entries.has(item.id)) ||
    generators.some((item) => builtin.generators.has(item.id))
  )
}

function mergeById<T extends { id: string }>(current: readonly T[], incoming: readonly T[]): T[] {
  const incomingById = new Map(incoming.map((item) => [item.id, item]))
  const seen = new Set(current.map((item) => item.id))
  return [...current.map((item) => incomingById.get(item.id) ?? item), ...incoming.filter((item) => !seen.has(item.id))]
}

function mergeSettings(current: readonly UserSetting[], incoming: readonly UserSetting[]): UserSetting[] {
  const incomingByKey = new Map(incoming.map((item) => [item.key, item]))
  const seen = new Set(current.map((item) => item.key))
  return [...current.map((item) => incomingByKey.get(item.key) ?? item), ...incoming.filter((item) => !seen.has(item.key))]
}

function countById(current: readonly { id: string }[], incoming: readonly { id: string }[]) {
  const ids = new Set(current.map((item) => item.id))
  const updated = incoming.filter((item) => ids.has(item.id)).length
  return { added: incoming.length - updated, updated }
}

function countSettings(current: readonly UserSetting[], incoming: readonly UserSetting[]) {
  const keys = new Set(current.map((item) => item.key))
  const updated = incoming.filter((item) => keys.has(item.key)).length
  return { added: incoming.length - updated, updated }
}

function fileSlug(name: string): string {
  const cleaned = [...name]
    .map((char) => (char.charCodeAt(0) < 32 || "\\/:*?\"<>|".includes(char) ? "-" : char))
    .join("")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
  return cleaned.slice(0, 40) || "item"
}

function invalid(): { ok: false; message: string } {
  return { ok: false, message: "备份格式不正确。" }
}

function isScope(value: unknown): value is TransferScope {
  return typeof value === "string" && TRANSFER_SCOPES.some((scope) => scope === value)
}

function isMode(value: unknown): value is TransferMode {
  return typeof value === "string" && TRANSFER_MODES.some((mode) => mode === value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
