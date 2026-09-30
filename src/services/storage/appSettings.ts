import type { UserData, UserSetting } from "../../types/data.ts"
import type { UserDataMutation } from "./mutateUserData.ts"

export const SHOW_BUILTIN_KEY = "showBuiltin"

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
