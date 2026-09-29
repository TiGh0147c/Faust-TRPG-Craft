import { useEffect, useState } from "react"
import { SourceColumn } from "../components/SourceColumn.tsx"
import { GeneratorEditor } from "../features/generators/GeneratorEditor.tsx"
import { generatorHistoryDraft } from "../features/history/historyDrafts.ts"
import { useGenerators } from "../features/generators/useGenerators.ts"
import type { GeneratorStepResult } from "../features/generators/runGenerator.ts"
import { RecordTransferButtons } from "../features/storage/RecordTransferButtons.tsx"
import { useCatalog } from "../features/storage/useCatalog.ts"
import type { GeneratorDraft } from "../services/storage/mutateUserData.ts"

export function GeneratorsPage() {
  const generators = useGenerators()
  const catalog = useCatalog()
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [editor, setEditor] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const selected = generators.selected
  const result = generators.result

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 2000)
    return () => window.clearTimeout(timer)
  }, [copied])

  function openGenerator(id: string | undefined) {
    if (!id) return
    setFormError(null)
    setEditor(id)
  }

  async function saveGenerator(draft: GeneratorDraft) {
    if (saving) return
    setSaving(true)
    setFormError(null)
    const previous = new Set(catalog.user.generators.map((generator) => generator.id))
    const result =
      editor !== null && editor !== "new"
        ? await catalog.updateGenerator(editor, draft)
        : await catalog.createGenerator(draft)
    setSaving(false)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    const created = result.data.generators.find((generator) => !previous.has(generator.id))
    const nextId = created?.id ?? (editor !== "new" ? editor : null)
    setEditor(null)
    if (nextId) generators.select(nextId)
  }

  async function removeGenerator(id: string | undefined) {
    if (!id || saving) return
    setSaving(true)
    setFormError(null)
    const result = await catalog.deleteGenerator(id)
    setSaving(false)
    if (!result.ok) {
      setFormError(result.message)
      return
    }
    setEditor(null)
    const fallback = catalog.builtin.generators[0]?.id
    if (fallback) generators.select(fallback)
  }

  async function generate() {
    setCopied(false)
    setCopyError(null)
    setHistoryError(null)
    const outcome = generators.generate()
    if (!outcome || !outcome.ok) return
    const saved = await catalog.recordHistory(generatorHistoryDraft(outcome.result))
    if (!saved.ok) setHistoryError(saved.message)
  }

  async function copyResult() {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.output)
      setCopyError(null)
      setCopied(true)
    } catch {
      setCopied(false)
      setCopyError("复制失败，请手动选择结果。")
    }
  }

  return (
    <section className="page">
      <h1>生成器</h1>
      <p className="lead">选择一个预设，一次生成一段内容。内置生成器只读，用户生成器可以在这里添加和修改。结果会写入历史。</p>

      <div className="filters">
        <label className="field" htmlFor="generator-keyword">
          关键词
          <input
            id="generator-keyword"
            value={generators.keyword}
            onChange={(event) => generators.setKeyword(event.target.value)}
          />
        </label>
        <label className="field" htmlFor="generator-category">
          分类
          <select
            id="generator-category"
            value={generators.category}
            onChange={(event) => generators.setCategory(event.target.value)}
          >
            <option value="">全部分类</option>
            {generators.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>
        <label className="field" htmlFor="generator-tag">
          标签
          <select
            id="generator-tag"
            value={generators.tag}
            onChange={(event) => generators.setTag(event.target.value)}
          >
            <option value="">全部标签</option>
            {generators.tags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </label>
      </div>

      {generators.status === "loading" ? <p className="note">正在读取生成器…</p> : null}
      {generators.loadError ? (
        <p className="form-error" role="alert">
          {generators.loadError}
        </p>
      ) : null}

      {generators.status === "ready" ? (
        <div className="table-workspace">
          <SourceColumn
            items={generators.filtered}
            userNote={
              catalog.generators.some((generator) => generator.origin === "user") &&
              !generators.filtered.some((generator) => generator.origin === "user")
                ? "没有符合条件的用户生成器。"
                : "还没有用户生成器。"
            }
            createLabel="新建生成器"
            onCreate={() => {
              setFormError(null)
              setEditor("new")
            }}
            renderItem={(generator) => (
              <button
                type="button"
                aria-pressed={editor === null && selected?.id === generator.id}
                onClick={() => {
                  setHistoryError(null)
                  setCopied(false)
                  setCopyError(null)
                  setFormError(null)
                  setEditor(null)
                  generators.select(generator.id)
                }}
              >
                <strong>{generator.name}</strong>
                <span>{generator.category}</span>
              </button>
            )}
          />

          {editor !== null ? (
            <GeneratorEditor
              key={editor}
              initial={
                editor === "new" ? null : (catalog.user.generators.find((generator) => generator.id === editor) ?? null)
              }
              tables={catalog.tables}
              saving={saving}
              error={formError}
              onCancel={() => {
                setEditor(null)
                setFormError(null)
              }}
              onSubmit={(draft) => void saveGenerator(draft)}
            />
          ) : selected ? (
            <article className="panel">
              <div className="panel-header">
                <h2>{selected.name}</h2>
                {selected.origin === "user" ? (
                  <div className="inline-form">
                    <GeneratorTransfer generatorId={selected.id} />
                    <button className="button button-secondary" type="button" onClick={() => openGenerator(selected.id)}>
                      编辑
                    </button>
                    <button className="button button-secondary" type="button" onClick={() => void removeGenerator(selected.id)}>
                      删除
                    </button>
                  </div>
                ) : null}
              </div>
              {formError ? (
                <p className="form-error" role="alert">
                  {formError}
                </p>
              ) : null}
              <p className="lead">{selected.description}</p>
              <p className="table-meta">
                {selected.category}
                {selected.tags.length > 0 ? ` · ${selected.tags.join("、")}` : ""}
              </p>
              <h3 className="section-label">步骤</h3>
              <ul className="table-entry-list generator-steps">
                {selected.steps.map((step) => (
                  <li key={step.id}>
                    <span>{step.label}</span>
                    <span>
                      {catalog.tables.find((table) => table.id === step.tableId)?.name ?? step.tableId}
                      {step.expression ? ` · ${step.expression}` : ""}
                    </span>
                  </li>
                ))}
              </ul>
              <button className="button generator-run" type="button" onClick={() => void generate()}>
                生成
              </button>
              {generators.actionError ? (
                <p className="form-error" role="alert">
                  {generators.actionError}
                </p>
              ) : null}
              {result ? (
                <section aria-live="polite">
                  <div className="panel-header">
                    <p className="dice-total-label">生成结果</p>
                    <button className="button button-secondary" type="button" onClick={() => void copyResult()}>
                      {copied ? "已复制" : "复制"}
                    </button>
                  </div>
                  {copyError ? <p className="form-error">{copyError}</p> : null}
                  <p className="table-result-text generator-output">{result.output}</p>
                  <ul className="table-entry-list generator-steps">
                    {result.steps.map((step) => (
                      <li key={step.stepId}>
                        <span>{step.label}</span>
                        <span>{stepLine(step)}</span>
                      </li>
                    ))}
                  </ul>
                  {historyError ? (
                    <p className="form-error" role="alert">
                      没有写入历史。{historyError}
                    </p>
                  ) : null}
                </section>
              ) : null}
            </article>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}

function GeneratorTransfer({ generatorId }: { generatorId: string }) {
  const catalog = useCatalog()
  const generator = catalog.user.generators.find((item) => item.id === generatorId)
  if (!generator) return null
  return <RecordTransferButtons scope="generators" record={generator} />
}

function stepLine(step: GeneratorStepResult): string {
  if (step.expression && step.total !== undefined) return `${step.text}（${step.expression} → ${step.total}）`
  return step.text
}
