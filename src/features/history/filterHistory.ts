import type { HistoryKind, HistoryRecord } from "../../types/history.ts"

export const HISTORY_KIND_LABEL: Record<HistoryKind, string> = {
  dice: "骰子",
  table: "随机表",
  pipeline: "链路",
  generator: "生成器",
}

export function filterHistory(
  records: readonly HistoryRecord[],
  query: { keyword: string; kind: HistoryKind | ""; favoritesOnly: boolean },
): HistoryRecord[] {
  const keyword = query.keyword.trim().toLowerCase()
  return records.filter((record) => {
    if (query.favoritesOnly && !record.favorite) return false
    if (query.kind !== "" && record.kind !== query.kind) return false
    if (keyword === "") return true
    return `${record.input}\n${record.output}`.toLowerCase().includes(keyword)
  })
}

export function formatHistoryTime(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return createdAt
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date)
}
