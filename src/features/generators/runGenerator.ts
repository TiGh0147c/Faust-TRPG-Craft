import type { Entry } from "../../types/entry.ts"
import type { Generator, GeneratorStep } from "../../types/generator.ts"
import type { DiceRollResult } from "../../types/dice.ts"
import type { RandomTable, TableRollResult } from "../../types/table.ts"
import { resolveLinkedEntry } from "../../utils/entry/resolveLinkedEntry.ts"
import { rollDice, type RandomSource } from "../../utils/dice/rollDice.ts"
import { unknownTemplateVariable } from "../../utils/generator/template.ts"
import { drawTable } from "../../utils/table/drawTable.ts"
import { matchTableByValue } from "../../utils/table/matchTable.ts"

export type GeneratorStepResult = {
  stepId: string
  label: string
  variable: string
  tableId: string
  tableName: string
  text: string
  value?: number
  expression?: string
  total?: number
}

export type GeneratorRunResult = {
  generatorId: string
  generatorName: string
  steps: GeneratorStepResult[]
  output: string
}

export type GeneratorRunOutcome =
  | { ok: true; result: GeneratorRunResult }
  | { ok: false; message: string }

export function runGenerator(
  generator: Generator,
  tables: readonly RandomTable[],
  entries: readonly Entry[],
  random: RandomSource = Math.random,
): GeneratorRunOutcome {
  const prepared = prepareGenerator(generator)
  if (!prepared.ok) return prepared

  const values = new Map<string, string>()
  const steps: GeneratorStepResult[] = []
  for (const step of generator.steps) {
    const table = tables.find((item) => item.id === step.tableId)
    if (!table) return { ok: false, message: `找不到随机表「${step.tableId}」。` }
    const drawn = drawStep(table, step, random)
    if (!drawn.ok) return drawn
    const text = stepText(drawn.roll, entries)
    if (!text.ok) return text
    values.set(step.variable, text.text)
    const recorded: GeneratorStepResult = {
      stepId: step.id,
      label: step.label,
      variable: step.variable,
      tableId: table.id,
      tableName: table.name,
      text: text.text,
    }
    if (drawn.dice) {
      recorded.value = drawn.dice.total
      recorded.expression = drawn.dice.expression
      recorded.total = drawn.dice.total
    }
    steps.push(recorded)
  }

  const rendered = renderTemplate(generator.template, values)
  if (!rendered.ok) return rendered
  return {
    ok: true,
    result: {
      generatorId: generator.id,
      generatorName: generator.name,
      steps,
      output: rendered.text,
    },
  }
}

function prepareGenerator(generator: Generator): { ok: true } | { ok: false; message: string } {
  if (generator.steps.length === 0) return { ok: false, message: "这个生成器没有步骤。" }
  if (generator.template.trim() === "") return { ok: false, message: "这个生成器没有输出模板。" }
  const ids = new Set<string>()
  const variables = new Set<string>()
  for (const step of generator.steps) {
    if (ids.has(step.id)) return { ok: false, message: "存在重复的步骤 id。" }
    ids.add(step.id)
    if (variables.has(step.variable)) return { ok: false, message: `变量「${step.variable}」重复了。` }
    variables.add(step.variable)
  }
  return { ok: true }
}

function drawStep(
  table: RandomTable,
  step: GeneratorStep,
  random: RandomSource,
): { ok: true; roll: TableRollResult; dice?: DiceRollResult } | { ok: false; message: string } {
  if (table.mode === "range") {
    const expression = step.expression?.trim() ?? ""
    if (expression === "") return { ok: false, message: `「${step.label}」需要骰子表达式。` }
    const rolled = rollDice(expression, random)
    if (!rolled.ok) return rolled
    const matched = matchTableByValue(table, rolled.result.total)
    if (!matched.ok) return matched
    return { ok: true, roll: matched.result, dice: rolled.result }
  }
  const drawn = drawTable(table, random)
  if (!drawn.ok) return drawn
  return { ok: true, roll: drawn.result }
}

function stepText(
  roll: TableRollResult,
  entries: readonly Entry[],
): { ok: true; text: string } | { ok: false; message: string } {
  const linked = resolveLinkedEntry(roll.entryId, entries)
  if (linked.status === "missing") return { ok: false, message: `未找到关联词条（${linked.entryId}）。` }
  if (linked.status === "found") return { ok: true, text: linked.entry.content }
  return { ok: true, text: roll.text }
}

function renderTemplate(
  template: string,
  values: ReadonlyMap<string, string>,
): { ok: true; text: string } | { ok: false; message: string } {
  const unknown = unknownTemplateVariable(template, new Set(values.keys()))
  if (unknown === "") return { ok: false, message: "模板引用了空的变量。" }
  if (unknown !== null) return { ok: false, message: `模板引用了没有步骤的变量「${unknown}」。` }

  let text = ""
  let index = 0
  while (index < template.length) {
    const open = template.indexOf("{{", index)
    if (open === -1) {
      text += template.slice(index)
      break
    }
    text += template.slice(index, open)
    const close = template.indexOf("}}", open + 2)
    text += values.get(template.slice(open + 2, close).trim()) ?? ""
    index = close + 2
  }
  return { ok: true, text }
}
