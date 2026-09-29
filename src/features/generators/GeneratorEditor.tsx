import { useState } from "react"
import type { GeneratorDraft, GeneratorStepDraft } from "../../services/storage/mutateUserData.ts"
import type { Generator } from "../../types/generator.ts"
import type { RandomTable } from "../../types/table.ts"

type StepState = {
  id: string
  label: string
  tableId: string
  variable: string
  expression: string
}

export function GeneratorEditor({
  initial,
  tables,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  initial: Generator | null
  tables: readonly (RandomTable & { origin?: "builtin" | "user" })[]
  saving: boolean
  error: string | null
  onSubmit: (draft: GeneratorDraft) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [category, setCategory] = useState(initial?.category ?? "自定义")
  const [tags, setTags] = useState(initial?.tags.join("、") ?? "")
  const [template, setTemplate] = useState(initial?.template ?? "{{result}}")
  const [steps, setSteps] = useState<StepState[]>(() =>
    initial ? initial.steps.map(stepFromGenerator) : [emptyStep(tables[0])],
  )

  function updateStep(id: string, patch: Partial<StepState>) {
    setSteps((current) => current.map((step) => (step.id === id ? { ...step, ...patch } : step)))
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
          template,
          steps: steps.map(toStepDraft),
        })
      }}
    >
      <h2>{initial ? "编辑生成器" : "新建生成器"}</h2>
      <label className="field" htmlFor="edit-generator-name">
        名称
        <input id="edit-generator-name" value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label className="field" htmlFor="edit-generator-description">
        说明
        <textarea
          id="edit-generator-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <label className="field" htmlFor="edit-generator-category">
        分类
        <input
          id="edit-generator-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        />
      </label>
      <label className="field" htmlFor="edit-generator-tags">
        标签
        <input
          id="edit-generator-tags"
          value={tags}
          placeholder="用逗号分隔"
          onChange={(event) => setTags(event.target.value)}
        />
      </label>
      <label className="field" htmlFor="edit-generator-template">
        输出模板
        <textarea
          id="edit-generator-template"
          value={template}
          onChange={(event) => setTemplate(event.target.value)}
        />
      </label>
      <p className="note">用 {"{{变量名}}"} 引用步骤结果。数值区间表需要骰子表达式，例如 1d100。</p>
      <h3 className="section-label">步骤</h3>
      {steps.map((step, index) => {
        const table = tables.find((item) => item.id === step.tableId)
        return (
          <div className="editor-row" key={step.id}>
            <label className="field" htmlFor={`edit-step-label-${index}`}>
              步骤名称
              <input
                id={`edit-step-label-${index}`}
                value={step.label}
                onChange={(event) => updateStep(step.id, { label: event.target.value })}
              />
            </label>
            <label className="field" htmlFor={`edit-step-table-${index}`}>
              随机表
              <select
                id={`edit-step-table-${index}`}
                value={step.tableId}
                onChange={(event) => {
                  const next = tables.find((item) => item.id === event.target.value)
                  updateStep(step.id, {
                    tableId: event.target.value,
                    expression: next?.mode === "range" && step.expression.trim() === "" ? "1d100" : step.expression,
                  })
                }}
              >
                <option value="">选择随机表</option>
                {step.tableId !== "" && !tables.some((item) => item.id === step.tableId) ? (
                  <option value={step.tableId}>{step.tableId}（未找到）</option>
                ) : null}
                {tables.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}（{item.origin === "user" ? "用户" : "内置"}）
                  </option>
                ))}
              </select>
            </label>
            <label className="field" htmlFor={`edit-step-variable-${index}`}>
              变量名
              <input
                id={`edit-step-variable-${index}`}
                value={step.variable}
                onChange={(event) => updateStep(step.id, { variable: event.target.value })}
              />
            </label>
            {table?.mode === "range" ? (
              <label className="field" htmlFor={`edit-step-expression-${index}`}>
                骰子表达式
                <input
                  id={`edit-step-expression-${index}`}
                  value={step.expression}
                  spellCheck={false}
                  onChange={(event) => updateStep(step.id, { expression: event.target.value })}
                />
              </label>
            ) : null}
            {steps.length > 1 ? (
              <button
                className="button button-secondary"
                type="button"
                onClick={() => setSteps((current) => current.filter((item) => item.id !== step.id))}
              >
                删除这一步
              </button>
            ) : null}
          </div>
        )
      })}
      <button
        className="button button-secondary"
        type="button"
        onClick={() => setSteps((current) => [...current, emptyStep(tables[0], current.length)])}
      >
        添加步骤
      </button>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="inline-form">
        <button className="button" type="submit" disabled={saving}>
          {initial ? "保存修改" : "添加生成器"}
        </button>
        <button className="button button-secondary" type="button" onClick={onCancel}>
          取消
        </button>
      </div>
    </form>
  )
}

function emptyStep(table: RandomTable | undefined, index = 0): StepState {
  return {
    id: crypto.randomUUID(),
    label: "",
    tableId: table?.id ?? "",
    variable: index === 0 ? "result" : `result${index + 1}`,
    expression: table?.mode === "range" ? "1d100" : "",
  }
}

function stepFromGenerator(step: Generator["steps"][number]): StepState {
  return {
    id: step.id,
    label: step.label,
    tableId: step.tableId,
    variable: step.variable,
    expression: step.expression ?? "",
  }
}

function toStepDraft(step: StepState): GeneratorStepDraft {
  return {
    id: step.id,
    label: step.label,
    tableId: step.tableId,
    variable: step.variable,
    expression: step.expression,
  }
}
