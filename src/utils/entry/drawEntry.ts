import type { Entry } from "../../types/entry.ts"
import { readRandomUnit, type RandomSource } from "../random.ts"

export type EntryDrawOutcome =
  | { ok: true; entry: Entry }
  | { ok: false; message: string }

export function drawEntry(entries: readonly Entry[], random: RandomSource = Math.random): EntryDrawOutcome {
  if (entries.length === 0) return { ok: false, message: "没有可抽取的词条。" }
  if (entries.some((entry) => !Number.isFinite(entry.weight) || entry.weight <= 0)) {
    return { ok: false, message: "权重必须大于 0。" }
  }

  const total = entries.reduce((sum, entry) => sum + entry.weight, 0)
  let pick = readRandomUnit(random) * total
  for (const entry of entries) {
    pick -= entry.weight
    if (pick < 0) return { ok: true, entry }
  }

  const last = entries[entries.length - 1]
  if (!last) return { ok: false, message: "没有可抽取的词条。" }
  return { ok: true, entry: last }
}
