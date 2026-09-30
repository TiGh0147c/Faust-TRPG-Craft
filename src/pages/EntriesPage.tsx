import { useEffect, useState } from "react"
import { HistoryNoteField } from "../components/HistoryNoteField.tsx"
import { SourceColumn } from "../components/SourceColumn.tsx"
import { EntryEditor } from "../features/entries/EntryEditor.tsx"
import { entryHistoryDraft } from "../features/history/historyDrafts.ts"
import { useEntries } from "../features/entries/useEntries.ts"
import { RecordTransferButtons } from "../features/storage/RecordTransferButtons.tsx"
import { useCatalog } from "../features/storage/useCatalog.ts"
import type { EntryDraft } from "../services/storage/mutateUserData.ts"
import { formatEntry } from "../utils/entry/index.ts"

export function EntriesPage() {
  const entries = useEntries()
  const catalog = useCatalog()
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [editor, setEditor] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState("")
  const [historyError, setHistoryError] = useState<string | null>(null)

  function run(action: () => void) {
    setCopied(false)
    setCopyError(null)
    action()
  }

  async function drawAndRecord() {
    setCopied(false)
    setCopyError(null)
    setHistoryError(null)
    const outcome = entries.drawFiltered()
    if (!outcome.ok) return
    const saved = await catalog.recordHistory(entryHistoryDraft(outcome.entry, note))
    if (!saved.ok) setHistoryError(saved.message)
  }

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  function openEntry(id: string | undefined) {
    if (!id) return
    setFormError(null)
    setEditor(id)
  }

  async function saveEntry(draft: EntryDraft) {
    if (saving) return
    setSaving(true)
    setFormError(null)
    const previous = new Set(catalog.user.entries.map((entry) => entry.id))
    const result = editor !== null && editor !== "new" ? await catalog.updateEntry({ ...draft, id: editor }) : await catalog.createEntry(draft)
    setSaving(false)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    const created = result.data.entries.find((entry) => !previous.has(entry.id))
    const nextId = created?.id ?? (editor !== "new" ? editor : null)
    setEditor(null)
    if (nextId) entries.select(nextId)
  }

  async function removeEntry(id: string) {
    if (!id || saving) return
    setSaving(true)
    setFormError(null)
    const result = await catalog.deleteEntry(id)
    setSaving(false)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    setEditor(null)
    const fallback = result.data.entries[0]?.id ?? (catalog.showBuiltin ? catalog.builtin.entries[0]?.id : undefined)
    if (fallback) entries.select(fallback)
  }

  async function copySelected() {
    if (!entries.selected) return
    try {
      await navigator.clipboard.writeText(formatEntry(entries.selected))
      setCopyError(null)
      setCopied(true)
    } catch {
      setCopied(false)
      setCopyError("复制失败，请手动选择结果。")
    }
  }

  return (
    <section className="page">
      <h1>词条</h1>
      <p className="lead">按关键词、分类和标签查找，并按权重随机抽取。内置词条只读，用户词条可以在这里添加和修改。</p>

      <div className="filters">
        <label className="field" htmlFor="entry-keyword">
          关键词
          <input
            id="entry-keyword"
            value={entries.keyword}
            onChange={(event) => entries.setKeyword(event.target.value)}
          />
        </label>
        <label className="field" htmlFor="entry-category">
          分类
          <select
            id="entry-category"
            value={entries.category}
            onChange={(event) => entries.setCategory(event.target.value)}
          >
            <option value="">全部分类</option>
            {entries.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="entry-tag">
          标签
          <select id="entry-tag" value={entries.tag} onChange={(event) => entries.setTag(event.target.value)}>
            <option value="">全部标签</option>
            {entries.tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      </div>
      <HistoryNoteField className="note-row" id="entry-note" value={note} onChange={setNote} />
      <button className="button" type="button" onClick={() => void drawAndRecord()}>
        随机抽取
      </button>
      {historyError ? (
        <p className="form-error" role="alert">
          没有写入历史。{historyError}
        </p>
      ) : null}

      {entries.actionError ? (
        <p className="form-error" role="alert">
          {entries.actionError}
        </p>
      ) : null}
      {entries.status === "loading" ? <p className="note">正在读取词条…</p> : null}
      {entries.loadError ? (
        <p className="form-error" role="alert">
          {entries.loadError}
        </p>
      ) : null}

      {entries.status === "ready" ? (
        <div className="table-workspace">
          <SourceColumn
            items={entries.filtered}
            showBuiltin={catalog.showBuiltin}
            userNote={userListNote(catalog.entries, entries.filtered, "还没有用户词条。", "没有符合条件的用户词条。")}
            createLabel="新建词条"
            onCreate={() => {
              setFormError(null)
              setEditor("new")
            }}
            renderItem={(entry) => (
              <button
                type="button"
                aria-pressed={editor === null && entries.selected?.id === entry.id}
                onClick={() => {
                  setEditor(null)
                  setFormError(null)
                  run(() => entries.select(entry.id))
                }}
              >
                <strong>{entry.name}</strong>
                <span>{entry.category}</span>
              </button>
            )}
          />

          {editor !== null ? (
            <EntryEditor
              key={editor}
              initial={editor === "new" ? null : (catalog.user.entries.find((entry) => entry.id === editor) ?? null)}
              saving={saving}
              error={formError}
              onCancel={() => {
                setEditor(null)
                setFormError(null)
              }}
              onSubmit={(draft) => void saveEntry(draft)}
            />
          ) : entries.selected ? (
            <article className="panel" aria-live="polite">
              <div className="panel-header">
                <h2>{entries.selected.name}</h2>
                <div className="inline-form">
                  {entries.selected.origin === "user" ? (
                    <UserEntryActions
                      entry={catalog.user.entries.find((entry) => entry.id === entries.selected?.id) ?? null}
                      onEdit={() => openEntry(entries.selected?.id)}
                      onDelete={() => void removeEntry(entries.selected?.id ?? "")}
                    />
                  ) : null}
                  <button className="button button-secondary" type="button" onClick={() => void copySelected()}>
                    {copied ? "已复制" : "复制"}
                  </button>
                </div>
              </div>
              {formError ? (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              ) : null}
              {copyError ? <p className="form-error">{copyError}</p> : null}
              <p className="entry-content">{entries.selected.content}</p>
              <p className="table-meta">
                {entries.selected.category}
                {entries.selected.tags.length > 0 ? ` · ${entries.selected.tags.join("、")}` : ""}
                {` · 权重 ${entries.selected.weight}`}
              </p>
            </article>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function UserEntryActions({
  entry,
  onEdit,
  onDelete,
}: {
  entry: { id: string; name: string; content: string; category: string; tags: string[]; weight: number } | null
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <>
      {entry ? <RecordTransferButtons scope="entries" record={entry} /> : null}
      <button className="button button-secondary" type="button" onClick={onEdit}>
        编辑
      </button>
      <button className="button button-secondary" type="button" onClick={onDelete}>
        删除
      </button>
    </>
  )
}

function userListNote<T extends { origin: string }>(
  all: readonly T[],
  filtered: readonly T[],
  empty: string,
  noMatch: string,
): string {
  const hasUser = all.some((item) => item.origin === "user")
  const filteredUser = filtered.some((item) => item.origin === "user")
  return hasUser && !filteredUser ? noMatch : empty
}
