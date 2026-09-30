import { useState } from "react"
import type { TableDraft, TableRowDraft } from "../../services/storage/mutateUserData.ts"
import type { Entry } from "../../types/entry.ts"
import type { RandomTable, TableMode } from "../../types/table.ts"

type RowState = {
  id: string
  text: string
  entryId: string
  min: string
  max: string
  weight: string
}

const MODES: Array<{ value: TableMode; label: string }> = [
  { value: "range", label: "数值区间" },
  { value: "collection", label: "集合" },
]

export function TableEditor({
  initial,
  entries,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  initial: RandomTable | null
  entries: readonly Entry[]
  saving: boolean
  error: string | null
  onSubmit: (draft: TableDraft) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [category, setCategory] = useState(initial?.category ?? "自定义")
  const [tags, setTags] = useState(initial?.tags.join("、") ?? "")
  const [mode, setMode] = useState<TableMode>(initial?.mode ?? "range")
  const [rows, setRows] = useState<RowState[]>(() => (initial ? rowsFromTable(initial) : [emptyRow()]))

  function updateRow(id: string, patch: Partial<RowState>) {
    setRows((current) => current.map((row) => (row.id === id ? { ...row, ...patch } : row)))
  }

  return (
    <form
      className="stack-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          name,
          description,
          category,
          tags: tags.split(/[,，、]/),
          mode,
          rows: rows.map(toRowDraft),
        })
      }}
    >
      <h2>{initial ? "编辑随机表" : "新建随机表"}</h2>
      <label className="field" htmlFor="edit-table-name">
        名称
        <input id="edit-table-name" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field" htmlFor="edit-table-description">
        说明
        <textarea
          id="edit-table-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <label className="field" htmlFor="edit-table-category">
        分类
        <input id="edit-table-category" value={category} onChange={(event) => setCategory(event.target.value)} />
      </label>
      <label className="field" htmlFor="edit-table-tags">
        标签
        <input
          id="edit-table-tags"
          value={tags}
          placeholder="用逗号分隔"
          onChange={(event) => setTags(event.target.value)}
        />
      </label>
      <label className="field" htmlFor="edit-table-mode">
        模式
        <select
          id="edit-table-mode"
          value={mode}
          onChange={(event) => setMode(event.target.value as TableMode)}
        >
          {MODES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <h3 className="section-label">表项</h3>
      {rows.map((row, index) => (
        <div className="editor-row" key={row.id}>
          <label className="field" htmlFor={`edit-row-text-${index}`}>
            文本
            <input
              id={`edit-row-text-${index}`}
              value={row.text}
              onChange={(event) => updateRow(row.id, { text: event.target.value })}
            />
          </label>
          <label className="field" htmlFor={`edit-row-entry-${index}`}>
            关联词条
            <select
              id={`edit-row-entry-${index}`}
              value={row.entryId}
              onChange={(event) => updateRow(row.id, { entryId: event.target.value })}
            >
              <option value="">不关联</option>
              {row.entryId !== "" && !entries.some((entry) => entry.id === row.entryId) ? (
                <option value={row.entryId}>{row.entryId}（未找到）</option>
              ) : null}
              {entries.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          {mode === "range" ? (
            <div className="inline-form">
              <label className="field" htmlFor={`edit-row-min-${index}`}>
                最小值
                <input
                  id={`edit-row-min-${index}`}
                  inputMode="numeric"
                  value={row.min}
                  onChange={(event) => updateRow(row.id, { min: event.target.value })}
                />
              </label>
              <label className="field" htmlFor={`edit-row-max-${index}`}>
                最大值
                <input
                  id={`edit-row-max-${index}`}
                  inputMode="numeric"
                  value={row.max}
                  onChange={(event) => updateRow(row.id, { max: event.target.value })}
                />
              </label>
            </div>
          ) : null}
          {mode === "collection" ? (
            <label className="field" htmlFor={`edit-row-weight-${index}`}>
              权重
              <input
                id={`edit-row-weight-${index}`}
                type="number"
                min={0}
                step="any"
                value={row.weight}
                onChange={(event) => updateRow(row.id, { weight: event.target.value })}
              />
            </label>
          ) : null}
          {rows.length > 1 ? (
            <button
              className="button button-secondary"
              type="button"
              onClick={() => setRows((current) => current.filter((item) => item.id !== row.id))}
            >
              删除这一行
            </button>
          ) : null}
        </div>
      ))}
      <button className="button button-secondary" type="button" onClick={() => setRows((current) => [...current, emptyRow()])}>
        添加一行
      </button>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="inline-form">
        <button className="button" type="submit" disabled={saving}>
          {initial ? "保存修改" : "添加随机表"}
        </button>
        <button className="button button-secondary" type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  )
}

function emptyRow(): RowState {
  return { id: crypto.randomUUID(), text: "", entryId: "", min: "1", max: "100", weight: "1" }
}

function rowsFromTable(table: RandomTable): RowState[] {
  return table.entries.map((entry) => ({
    id: entry.id,
    text: entry.text,
    entryId: entry.entryId ?? "",
    min: "min" in entry ? String(entry.min) : "1",
    max: "max" in entry ? String(entry.max) : "100",
    weight: "weight" in entry ? String(entry.weight) : "1",
  }))
}

function toRowDraft(row: RowState): TableRowDraft {
  return {
    id: row.id,
    text: row.text,
    entryId: row.entryId,
    min: readInteger(row.min),
    max: readInteger(row.max),
    weight: Number(row.weight),
  }
}

function readInteger(value: string): number {
  return /^-?\d+$/.test(value.trim()) ? Number(value) : Number.NaN
}
