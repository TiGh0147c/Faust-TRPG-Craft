export type DieRoll = {
  sides: number
  value: number
}

export type DiceRollResult = {
  expression: string
  rolls: DieRoll[]
  /** 各骰点数之和，不含修正值。 */
  subtotal: number
  modifier: number
  total: number
  /** 触发结果补正之前的点数。未触发时不写。 */
  uncorrectedTotal?: number
}
