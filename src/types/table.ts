export type TableMode = "range" | "collection"

type TableEntryBase = {
  id: string
  text: string
  /** 关联词条 id。没有关联时省略。 */
  entryId?: string
}

export type RangeTableEntry = TableEntryBase & {
  /** 含端点。 */
  min: number
  max: number
}

export type CollectionTableEntry = TableEntryBase & {
  /** 默认 1。相同权重时每项机会相同。 */
  weight: number
}

export type TableEntry = RangeTableEntry | CollectionTableEntry

type RandomTableBase = {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
}

export type RandomTable = RandomTableBase &
  (
    | { mode: "range"; entries: RangeTableEntry[] }
    | { mode: "collection"; entries: CollectionTableEntry[] }
  )

export type TableRollResult = {
  tableId: string
  tableName: string
  rowId: string
  text: string
  entryId?: string
  mode: TableMode
  value?: number
  min?: number
  max?: number
}

export type TableSequenceResult = {
  tableId: string
  tableName: string
  action: "order" | "draw"
  rows: CollectionTableEntry[]
  limit?: number
  /** 随机排序只保留前若干项时填写。 */
  prefix?: number
}
