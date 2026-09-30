import { describe, expect, it } from "vitest"
import { createEmptyUserData } from "../../types/data.ts"
import { readDiceFloor, readSortWeight, showBuiltinEnabled, writeDiceFloor, writeShowBuiltin, writeSortWeight } from "./appSettings.ts"

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

describe("dice floor setting", () => {
  it("stays off and remembers the chosen rule", () => {
    const empty = createEmptyUserData()
    expect(readDiceFloor(empty.settings)).toEqual({ enabled: false, mode: "positive" })
    const enabled = writeDiceFloor(empty, { enabled: true, mode: "nonnegative" })
    expect(enabled.ok).toBe(true)
    if (!enabled.ok) return
    expect(readDiceFloor(enabled.data.settings)).toEqual({ enabled: true, mode: "nonnegative" })
    const disabled = writeDiceFloor(enabled.data, { enabled: false, mode: "nonnegative" })
    expect(disabled.ok).toBe(true)
    if (!disabled.ok) return
    expect(readDiceFloor(disabled.data.settings)).toEqual({ enabled: false, mode: "nonnegative" })
  })
})

describe("sort weight setting", () => {
  it("stays off and remembers whether heavier items move forward", () => {
    const empty = createEmptyUserData()
    expect(readSortWeight(empty.settings)).toEqual({ enabled: false, bias: "front" })
    const enabled = writeSortWeight(empty, { enabled: true, bias: "back" })
    expect(enabled.ok).toBe(true)
    if (!enabled.ok) return
    expect(readSortWeight(enabled.data.settings)).toEqual({ enabled: true, bias: "back" })
    const disabled = writeSortWeight(enabled.data, { enabled: false, bias: "back" })
    expect(disabled.ok).toBe(true)
    if (!disabled.ok) return
    expect(readSortWeight(disabled.data.settings)).toEqual({ enabled: false, bias: "back" })
  })
})
