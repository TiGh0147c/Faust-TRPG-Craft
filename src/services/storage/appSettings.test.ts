import { describe, expect, it } from "vitest"
import { createEmptyUserData } from "../../types/data.ts"
import { showBuiltinEnabled, writeShowBuiltin } from "./appSettings.ts"

describe("show builtin setting", () => {
  it("stays off until the setting is turned on", () => {
    const empty = createEmptyUserData()
    expect(showBuiltinEnabled(empty.settings)).toBe(false)
    const enabled = writeShowBuiltin(empty, true)
    expect(enabled.ok).toBe(true)
    if (!enabled.ok) return
    expect(showBuiltinEnabled(enabled.data.settings)).toBe(true)
    expect(empty.settings).toEqual([])
    const disabled = writeShowBuiltin(enabled.data, false)
    expect(disabled.ok).toBe(true)
    if (!disabled.ok) return
    expect(showBuiltinEnabled(disabled.data.settings)).toBe(false)
  })
})
