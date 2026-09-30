import type { DiceRollResult } from "../../types/dice.ts"

export type DiceFloorMode = "positive" | "nonnegative"

export type DiceFloorSetting = {
  enabled: boolean
  mode: DiceFloorMode
}

export const DICE_FLOOR_OFF: DiceFloorSetting = { enabled: false, mode: "positive" }

export function applyDiceFloor(result: DiceRollResult, setting: DiceFloorSetting): DiceRollResult {
  if (!setting.enabled) return result
  const raw = result.total
  if (setting.mode === "positive") {
    if (raw > 0) return result
    return { ...result, total: 1, uncorrectedTotal: raw }
  }
  if (raw >= 0) return result
  return { ...result, total: 0, uncorrectedTotal: raw }
}

export function floorDescription(setting: DiceFloorSetting): string {
  const rule =
    setting.mode === "positive"
      ? "骰子投掷点数如果最终结果小于等于0，则使其修正为1"
      : "骰子投掷点数如果最终结果小于0，则使其修正为0"
  if (setting.enabled) return `当前使用${rule}。`
  return `当前未启用投掷结果补正。开启后，${rule}。`
}
