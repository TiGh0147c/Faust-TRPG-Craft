import type { Generator } from "../types/generator.ts"
import { parseGenerators } from "../utils/generator/parseGenerators.ts"

export async function loadBuiltinGenerators(): Promise<Generator[]> {
  let response: Response
  try {
    response = await fetch(`${import.meta.env.BASE_URL}data/generators.json`)
  } catch {
    throw new Error("无法读取内置生成器。")
  }
  if (!response.ok) throw new Error("无法读取内置生成器。")

  let data: unknown
  try {
    data = await response.json()
  } catch {
    throw new Error("内置生成器不是有效的 JSON。")
  }

  const parsed = parseGenerators(data)
  if (!parsed.ok) throw new Error(parsed.message)
  return parsed.generators
}
