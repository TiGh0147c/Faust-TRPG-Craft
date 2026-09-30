import { useState, type ReactNode } from "react"
import { clearWorkingTraces } from "../features/schemes/pageTraces.ts"
import { ImportFileButton } from "../features/storage/ImportFileButton.tsx"
import { downloadJson } from "../features/storage/downloadJson.ts"
import { useCatalog } from "../features/storage/useCatalog.ts"
import {
  describeImport,
  exportEntriesMerge,
  exportEntriesSnapshot,
  exportGeneratorsMerge,
  exportGeneratorsSnapshot,
  exportSettingsSnapshot,
  exportTablesMerge,
  exportTablesSnapshot,
  exportUserSnapshot,
  transferFilename,
} from "../services/storage/transfer.ts"
import type { Entry } from "../types/entry.ts"
import type { Generator } from "../types/generator.ts"
import type { RandomTable } from "../types/table.ts"
import type { TransferEnvelope, TransferScope } from "../types/transfer.ts"

type Pending =
  | { kind: "import"; envelope: TransferEnvelope }
  | { kind: "clear-traces" }
  | { kind: "clear-content" }
  | { kind: "clear-history" }
  | { kind: "clear-settings" }
  | { kind: "clear-all" }

export function StoragePage() {
  const catalog = useCatalog()
  const [pending, setPending] = useState<Pending | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const favorites = catalog.user.history.filter((record) => record.favorite).length

  function chooseImport(envelope: TransferEnvelope) {
    setActionError(null)
    setNotice(null)
    setPending({ kind: "import", envelope })
  }

  function rejectImport(message: string) {
    setPending(null)
    setNotice(null)
    setActionError(message)
  }

  function ask(kind: Exclude<Pending["kind"], "import">) {
    setActionError(null)
    setNotice(null)
    setPending({ kind })
  }

  async function confirmPending() {
    if (!pending || saving) return
    setSaving(true)
    setActionError(null)
    if (pending.kind === "clear-traces") {
      clearWorkingTraces()
      setSaving(false)
      setPending(null)
      setNotice("已清除。")
      return
    }
    const result =
      pending.kind === "import"
        ? await catalog.importTransfer(pending.envelope)
        : pending.kind === "clear-content"
          ? await catalog.clearUserContent()
          : pending.kind === "clear-history"
            ? await catalog.clearHistory()
            : pending.kind === "clear-settings"
              ? await catalog.clearSettings()
              : await catalog.clearAllData()
    setSaving(false)
    setPending(null)
    if (!result.ok) setActionError(result.message)
    else setNotice(pending.kind === "import" ? "已导入。" : pending.kind === "clear-settings" ? "已恢复。" : "已清除。")
  }

  const confirmBox = pending ? (
    <PendingConfirm
      pending={pending}
      user={catalog.user}
      saving={saving}
      onConfirm={() => void confirmPending()}
      onCancel={() => setPending(null)}
    />
  ) : null

  function importConfirm(scope: TransferScope) {
    if (pending?.kind !== "import" || pending.envelope.scope !== scope) return null
    return confirmBox
  }

  return (
    <section className="page">
      <h1>数据管理</h1>
      <p className="lead">导入、导出或清理这台浏览器里的内容。</p>

      {catalog.status === "loading" ? <p className="note">正在读取本地数据…</p> : null}
      {catalog.loadError ? (
        <p className="form-error" role="alert">
          {catalog.loadError}
        </p>
      ) : null}

      {catalog.status === "ready" ? (
        <>
          <p className="note">
            用户随机表 {catalog.user.tables.length} 张，词条 {catalog.user.entries.length} 条，生成器 {catalog.user.generators.length}{" "}
            个。历史 {catalog.user.history.length} 条，收藏 {favorites} 条，设置 {catalog.user.settings.length} 项。
          </p>
          {actionError ? (
            <p className="form-error" role="alert">
              {actionError}
            </p>
          ) : null}
          {notice ? <p className="note">{notice}</p> : null}

          <h2 className="section-label">内置数据</h2>
          {catalog.showBuiltin ? (
            <>
              <p className="note">这些内容随网站发布，不能在这里修改，也不会写入备份。</p>
              <ul className="record-list">
                {catalog.builtin.tables.map((table) => (
                  <li key={table.id}>
                    <strong>{table.name}</strong>
                    <span>内置随机表</span>
                  </li>
                ))}
                {catalog.builtin.entries.map((entry) => (
                  <li key={entry.id}>
                    <strong>{entry.name}</strong>
                    <span>内置词条</span>
                  </li>
                ))}
                {catalog.builtin.generators.map((generator) => (
                  <li key={generator.id}>
                    <strong>{generator.name}</strong>
                    <span>内置生成器</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="note">内置数据当前已关闭。可以在设置里打开「显示内置数据」。</p>
          )}

          <h2 className="section-label">用户数据整包</h2>
          <p className="note">一份文件包含用户随机表、词条、生成器和设置。导入后覆盖这些内容，历史保留。</p>
          <div className="inline-form">
            <button
              className="button button-secondary"
              type="button"
              onClick={() => download(exportUserSnapshot(catalog.user))}
            >
              导出全部用户数据
            </button>
            <ImportFileButton
              label="导入全部用户数据"
              scope="user"
              mode="snapshot"
              disabled={saving}
              onParsed={chooseImport}
              onError={rejectImport}
            />
          </div>
          {importConfirm("user")}

          <h2 className="section-label">按类型导入导出</h2>
          <TypeSection
            title="随机表"
            scope="tables"
            empty="还没有用户随机表。"
            records={catalog.user.tables}
            saving={saving}
            onExportAll={() => download(exportTablesSnapshot(catalog.user))}
            onExportOne={(record) => download(exportTablesMerge([record]), record.name)}
            onParsed={chooseImport}
            onError={rejectImport}
            confirm={importConfirm("tables")}
          />
          <TypeSection
            title="词条"
            scope="entries"
            empty="还没有用户词条。"
            records={catalog.user.entries}
            saving={saving}
            onExportAll={() => download(exportEntriesSnapshot(catalog.user))}
            onExportOne={(record) => download(exportEntriesMerge([record]), record.name)}
            onParsed={chooseImport}
            onError={rejectImport}
            confirm={importConfirm("entries")}
          />
          <TypeSection
            title="生成器"
            scope="generators"
            empty="还没有用户生成器。"
            records={catalog.user.generators}
            saving={saving}
            onExportAll={() => download(exportGeneratorsSnapshot(catalog.user))}
            onExportOne={(record) => download(exportGeneratorsMerge([record]), record.name)}
            onParsed={chooseImport}
            onError={rejectImport}
            confirm={importConfirm("generators")}
          />
          <h3 className="section-label">设置</h3>
          <div className="action-row">
            <button className="button button-secondary" type="button" onClick={() => download(exportSettingsSnapshot(catalog.user))}>
              导出全部设置
            </button>
            <ImportFileButton
              label="导入并覆盖设置"
              scope="settings"
              mode="snapshot"
              disabled={saving}
              onParsed={chooseImport}
              onError={rejectImport}
            />
            <button className="button" type="button" onClick={() => ask("clear-settings")}>
              恢复默认设置
            </button>
          </div>
          {pending?.kind === "clear-settings" ? confirmBox : null}
          {importConfirm("settings")}

          <h2 className="section-label">清理</h2>
          <div className="action-row">
            <button className="button" type="button" onClick={() => ask("clear-traces")}>
              清除用户痕迹
            </button>
            <button className="button" type="button" onClick={() => ask("clear-content")}>
              清除用户自定义内容
            </button>
            <button className="button" type="button" onClick={() => ask("clear-history")}>
              清除所有历史记录
            </button>
            <button className="button" type="button" onClick={() => ask("clear-all")}>
              清除全部数据
            </button>
          </div>
          {pending?.kind === "clear-traces" ||
          pending?.kind === "clear-content" ||
          pending?.kind === "clear-history" ||
          pending?.kind === "clear-all"
            ? confirmBox
            : null}
        </>
      ) : null}
    </section>
  )
}

function pendingText(pending: Pending, user: Parameters<typeof describeImport>[0]): string {
  if (pending.kind === "import") return describeImport(user, pending.envelope)
  if (pending.kind === "clear-traces") return "清除用户痕迹将重置用户所有的操作痕迹使其返回默认状态。"
  if (pending.kind === "clear-content") return "清除用户自定义内容将清除所有用户自定义构建的随机表、词条和生成器等内容。"
  if (pending.kind === "clear-history") return "清除所有历史记录将清除用户所有的历史记录。"
  if (pending.kind === "clear-settings") return "恢复默认设置将重置用户的所有设置使其返回默认状态。"
  return "清除全部数据将同时重置用户操作痕迹，清除用户自定义构建内容与所有历史记录，恢复默认设置。"
}

function confirmLabel(pending: Pending): string {
  if (pending.kind === "import") return "确认导入"
  if (pending.kind === "clear-settings") return "确认恢复"
  return "确认清除"
}

function PendingConfirm({
  pending,
  user,
  saving,
  onConfirm,
  onCancel,
}: {
  pending: Pending
  user: Parameters<typeof describeImport>[0]
  saving: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="action-confirm">
      <p className="note">{pendingText(pending, user)}</p>
      <div className="inline-form">
        <button className="button" type="button" disabled={saving} onClick={onConfirm}>
          {confirmLabel(pending)}
        </button>
        <button className="button button-secondary" type="button" disabled={saving} onClick={onCancel}>
          取消
        </button>
      </div>
    </div>
  )
}

function download(envelope: TransferEnvelope, itemName?: string) {
  downloadJson(transferFilename(envelope, itemName), envelope)
}

function TypeSection<T extends RandomTable | Entry | Generator>({
  title,
  scope,
  empty,
  records,
  saving,
  onExportAll,
  onExportOne,
  onParsed,
  onError,
  confirm,
}: {
  title: string
  scope: Extract<TransferScope, "tables" | "entries" | "generators">
  empty: string
  records: readonly T[]
  saving: boolean
  onExportAll: () => void
  onExportOne: (record: T) => void
  onParsed: (envelope: TransferEnvelope) => void
  onError: (message: string) => void
  confirm?: ReactNode
}) {
  return (
    <>
      <h3 className="section-label">{title}</h3>
      <div className="inline-form">
        <button className="button button-secondary" type="button" onClick={onExportAll}>
          导出全部{title}
        </button>
        <ImportFileButton
          label={`导入并覆盖${title}`}
          scope={scope}
          mode="snapshot"
          disabled={saving}
          onParsed={onParsed}
          onError={onError}
        />
        <ImportFileButton
          label={`导入并合并${title}`}
          scope={scope}
          mode="merge"
          disabled={saving}
          onParsed={onParsed}
          onError={onError}
        />
      </div>
      {confirm}
      {records.length === 0 ? (
        <p className="note">{empty}</p>
      ) : (
        <ul className="record-list">
          {records.map((record) => (
            <li key={record.id}>
              <strong>{record.name}</strong>
              <button className="button button-secondary" type="button" onClick={() => onExportOne(record)}>
                导出这条
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
