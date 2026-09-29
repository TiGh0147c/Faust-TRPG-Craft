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
}
