import type { Entry } from "../../types/entry.ts"

export function formatEntry(entry: Entry): string {
  const lines = [entry.name, entry.content, `分类：${entry.category}`]
  if (entry.tags.length > 0) lines.push(`标签：${entry.tags.join("、")}`)
  return lines.join("\n")
}
