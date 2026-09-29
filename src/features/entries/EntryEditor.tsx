import { useState } from "react"
import type { EntryDraft } from "../../services/storage/mutateUserData.ts"
import type { Entry } from "../../types/entry.ts"

const emptyForm = {
  name: "",
  content: "",
  category: "自定义",
  tags: "",
  weight: "1",
}

export function EntryEditor({
  initial,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  initial: Entry | null
  saving: boolean
  error: string | null
  onSubmit: (draft: EntryDraft) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState(() =>
    initial
      ? {
          name: initial.name,
          content: initial.content,
          category: initial.category,
          tags: initial.tags.join("、"),
          weight: String(initial.weight),
        }
      : emptyForm,
  )

  function update(key: keyof typeof emptyForm, value: string) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  return (
    <form
      className="stack-form"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit({
          name: form.name,
          content: form.content,
          category: form.category,
          tags: form.tags.split(/[,，、]/),
          weight: Number(form.weight),
        })
      }}
    >
      <h2>{initial ? "编辑词条" : "新建词条"}</h2>
      <label className="field" htmlFor="edit-entry-name">
        名称
        <input id="edit-entry-name" value={form.name} onChange={(event) => update("name", event.target.value)} />
      </label>
      <label className="field" htmlFor="edit-entry-content">
        正文
        <textarea
          id="edit-entry-content"
          value={form.content}
          onChange={(event) => update("content", event.target.value)}
        />
      </label>
      <label className="field" htmlFor="edit-entry-category">
        分类
        <input
          id="edit-entry-category"
          value={form.category}
          onChange={(event) => update("category", event.target.value)}
        />
      </label>
      <label className="field" htmlFor="edit-entry-tags">
        标签
        <input
          id="edit-entry-tags"
          value={form.tags}
          placeholder="用逗号分隔"
          onChange={(event) => update("tags", event.target.value)}
        />
      </label>
      <label className="field" htmlFor="edit-entry-weight">
        权重
        <input
          id="edit-entry-weight"
          type="number"
          min={0}
          step="any"
          value={form.weight}
          onChange={(event) => update("weight", event.target.value)}
        />
      </label>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="inline-form">
        <button className="button" type="submit" disabled={saving}>
          {initial ? "保存修改" : "添加词条"}
        </button>
        <button className="button button-secondary" type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  )
}
