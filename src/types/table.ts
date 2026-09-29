export type TableMode = "range" | "weight" | "uniform"

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

export type WeightTableEntry = TableEntryBase & {
  weight: number
}

export type UniformTableEntry = TableEntryBase

export type TableEntry = RangeTableEntry | WeightTableEntry | UniformTableEntry

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
    | { mode: "weight"; entries: WeightTableEntry[] }
    | { mode: "uniform"; entries: UniformTableEntry[] }
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
