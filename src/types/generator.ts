export type GeneratorStep = {
  id: string
  label: string
  tableId: string
  /**
   * 随机表 mode 为 range 时使用的骰子表达式，例如 "1d100"。
   * 集合表不使用该字段。
   */
  expression?: string
  /** 输出模板中的变量名，不含花括号。 */
  variable: string
}

export type Generator = {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  steps: GeneratorStep[]
  /** 用 {{变量名}} 引用步骤结果。 */
  template: string
}
