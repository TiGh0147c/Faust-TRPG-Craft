export type SortWeightBias = "front" | "back"

export type SortWeightSetting = {
  enabled: boolean
  bias: SortWeightBias
}

export const SORT_WEIGHT_OFF: SortWeightSetting = { enabled: false, bias: "front" }

export function sortWeightDescription(setting: SortWeightSetting): string {
  const rule = setting.bias === "back" ? "权重更高的元素更容易靠后" : "权重更高的元素更容易靠前"
  if (setting.enabled) return `当前使用排序权重影响。随机排序时，${rule}。`
  return `当前未启用排序权重影响。开启后，随机排序时${rule}。`
}
