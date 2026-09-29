import type { Entry } from "./entry.ts"
import type { Generator } from "./generator.ts"
import { APP_ID, DATA_VERSION } from "./data.ts"
import type { TransferEnvelope } from "./transfer.ts"
import type { RandomTable } from "./table.ts"

export const exampleEntry = {
  id: "example-entry",
  name: "异常踪迹",
  content: "在街角发现异常踪迹",
  category: "event",
  tags: ["城市", "探索"],
  weight: 1,
} satisfies Entry

export const exampleCityNightTable = {
  id: "example-table",
  name: "城市夜间事件",
  description: "夜间城市随机事件",
  category: "event",
  tags: ["城市", "夜晚"],
  mode: "range",
  entries: [
    { id: "example-table-1-20", text: "平静无事", min: 1, max: 20 },
    { id: "example-table-21-40", text: "遇到陌生行人", min: 21, max: 40 },
    { id: "example-table-41-60", text: "发现可疑踪迹", min: 41, max: 60 },
    {
      id: "example-table-61-80",
      text: "遭遇突发事件",
      min: 61,
      max: 80,
      entryId: exampleEntry.id,
    },
    { id: "example-table-81-95", text: "危险出现", min: 81, max: 95 },
    { id: "example-table-96-100", text: "特殊事件", min: 96, max: 100 },
  ],
} satisfies RandomTable

export const exampleWeightTable = {
  id: "example-weight-table",
  name: "示例权重表",
  description: "确认权重模式的字段",
  category: "example",
  tags: ["示例"],
  mode: "weight",
  entries: [
    { id: "example-weight-common", text: "常见", weight: 3 },
    { id: "example-weight-rare", text: "少见", weight: 1 },
  ],
} satisfies RandomTable

export const exampleUniformTable = {
  id: "example-uniform-table",
  name: "示例等概率表",
  description: "确认等概率模式的字段",
  category: "example",
  tags: ["示例"],
  mode: "uniform",
  entries: [
    { id: "example-uniform-a", text: "结果 A" },
    { id: "example-uniform-b", text: "结果 B" },
  ],
} satisfies RandomTable

export const exampleNpcGenerator = {
  id: "example-npc",
  name: "NPC",
  description: "职业、性格、外貌、动机和特征组合成一个人物",
  category: "npc",
  tags: ["人物"],
  steps: [
    { id: "profession", label: "职业", tableId: "profession", variable: "profession" },
    { id: "personality", label: "性格", tableId: "personality", variable: "personality" },
    { id: "appearance", label: "外貌", tableId: "appearance", variable: "appearance" },
    { id: "motive", label: "动机", tableId: "motive", variable: "motive" },
    { id: "trait", label: "特殊特征", tableId: "trait", variable: "trait" },
  ],
  template: "{{profession}}，{{personality}}。{{appearance}}。动机是{{motive}}。{{trait}}",
} satisfies Generator

export const exampleExport = {
  app: APP_ID,
  version: DATA_VERSION,
  exportedAt: "2026-09-30T00:00:00.000Z",
  scope: "user",
  mode: "snapshot",
  data: {
    tables: [exampleCityNightTable],
    entries: [exampleEntry],
    generators: [exampleNpcGenerator],
    settings: [],
  },
} satisfies TransferEnvelope
