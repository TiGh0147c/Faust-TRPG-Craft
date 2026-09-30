import { useState } from "react"
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
  | { kind: "clear-content" }
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
    const result =
      pending.kind === "import"
        ? await catalog.importTransfer(pending.envelope)
        : pending.kind === "clear-content"
          ? await catalog.clearUserContent()
          : pending.kind === "clear-settings"
            ? await catalog.clearSettings()
            : await catalog.clearAllData()
    setSaving(false)
    setPending(null)
    if (!result.ok) setActionError(result.message)
    else setNotice(pending.kind === "import" ? "已导入。" : "已清空。")
  }

  return (
    <section className="page">
      <h1>数据管理</h1>
      <p className="lead">内置数据只读。用户内容和历史分成两套备份，可以整包导入导出，也可以按类型或单条处理。</p>

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
          {pending ? (
            <div className="inline-form">
              <p className="note transfer-status">{pendingText(pending, catalog.user)}</p>
              <button className="button" type="button" disabled={saving} onClick={() => void confirmPending()}>
                {pending.kind === "import" ? "确认导入" : "确认清空"}
              </button>
              <button className="button button-secondary" type="button" disabled={saving} onClick={() => setPending(null)}>
                取消
              </button>
            </div>
          ) : null}

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
          />
          <h3 className="section-label">设置</h3>
          <p className="note">当前没有单独的设置编辑界面。设置仍可以整份导出，导入时覆盖。</p>
          <div className="inline-form">
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
          </div>

          <h2 className="section-label">清理</h2>
          <div className="inline-form">
            <button className="button button-secondary" type="button" onClick={() => ask("clear-content")}>
              删除用户数据
            </button>
            <button className="button button-secondary" type="button" onClick={() => ask("clear-settings")}>
              恢复默认
            </button>
            <button className="button button-secondary" type="button" onClick={() => ask("clear-all")}>
              清空全部
            </button>
          </div>
          <p className="note">删除用户数据会保留历史。恢复默认只清空设置。清空全部会同时删除用户内容和历史，内置内容保留。</p>
        </>
      ) : null}
    </section>
  )
}

function pendingText(pending: Pending, user: Parameters<typeof describeImport>[0]): string {
  if (pending.kind === "import") return describeImport(user, pending.envelope)
  if (pending.kind === "clear-content") return "将删除用户随机表、词条、生成器和设置。历史会保留。"
  if (pending.kind === "clear-settings") return "将清空设置。用户随机表、词条、生成器和历史会保留。"
  return "将删除用户内容和全部历史。内置内容会保留。"
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
