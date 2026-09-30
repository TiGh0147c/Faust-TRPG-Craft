import type { SortWeightBias, SortWeightSetting } from "../../utils/collection/sortWeight.ts"
import type { DiceFloorMode, DiceFloorSetting } from "../../utils/dice/diceFloor.ts"
import type { UserData, UserSetting } from "../../types/data.ts"
import type { UserDataMutation } from "./mutateUserData.ts"

export const SHOW_BUILTIN_KEY = "showBuiltin"
export const DICE_FLOOR_ENABLED_KEY = "diceFloorEnabled"
export const DICE_FLOOR_MODE_KEY = "diceFloorMode"
export const SORT_WEIGHT_ENABLED_KEY = "sortWeightEnabled"
export const SORT_WEIGHT_BIAS_KEY = "sortWeightBias"

export function showBuiltinEnabled(settings: readonly UserSetting[]): boolean {
  return settings.some((item) => item.key === SHOW_BUILTIN_KEY && item.value === true)
}

export function writeShowBuiltin(user: UserData, enabled: boolean): UserDataMutation {
  return {
    ok: true,
    data: {
      ...user,
      settings: [...user.settings.filter((item) => item.key !== SHOW_BUILTIN_KEY), { key: SHOW_BUILTIN_KEY, value: enabled }],
    },
  }
}

export function readDiceFloor(settings: readonly UserSetting[]): DiceFloorSetting {
  const enabled = settings.some((item) => item.key === DICE_FLOOR_ENABLED_KEY && item.value === true)
  const modeItem = settings.find((item) => item.key === DICE_FLOOR_MODE_KEY)
  const mode: DiceFloorMode = modeItem?.value === "nonnegative" ? "nonnegative" : "positive"
  return { enabled, mode }
}

export function writeDiceFloor(user: UserData, next: DiceFloorSetting): UserDataMutation {
  const settings = user.settings.filter((item) => item.key !== DICE_FLOOR_ENABLED_KEY && item.key !== DICE_FLOOR_MODE_KEY)
  settings.push({ key: DICE_FLOOR_ENABLED_KEY, value: next.enabled }, { key: DICE_FLOOR_MODE_KEY, value: next.mode })
  return { ok: true, data: { ...user, settings } }
}

export function readSortWeight(settings: readonly UserSetting[]): SortWeightSetting {
  const enabled = settings.some((item) => item.key === SORT_WEIGHT_ENABLED_KEY && item.value === true)
  const biasItem = settings.find((item) => item.key === SORT_WEIGHT_BIAS_KEY)
  const bias: SortWeightBias = biasItem?.value === "back" ? "back" : "front"
  return { enabled, bias }
}

export function writeSortWeight(user: UserData, next: SortWeightSetting): UserDataMutation {
  const settings = user.settings.filter((item) => item.key !== SORT_WEIGHT_ENABLED_KEY && item.key !== SORT_WEIGHT_BIAS_KEY)
  settings.push({ key: SORT_WEIGHT_ENABLED_KEY, value: next.enabled }, { key: SORT_WEIGHT_BIAS_KEY, value: next.bias })
  return { ok: true, data: { ...user, settings } }
}
