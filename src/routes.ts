export type AppRoute = {
  path: string
  label: string
  description: string
  end?: boolean
}

export const appRoutes: AppRoute[] = [
  {
    path: "/",
    label: "首页",
    description: "工具入口",
    end: true,
  },
  {
    path: "/dice",
    label: "骰子",
    description: "单次投掷，或多组比较。",
  },
  {
    path: "/collections",
    label: "集合",
    description: "排序或抽取一组内容。",
  },
  {
    path: "/entries",
    label: "词条",
    description: "查找，或随机抽一条。",
  },
  {
    path: "/tables",
    label: "随机表",
    description: "匹配、抽取，或按权重排序。",
  },
  {
    path: "/generators",
    label: "生成器",
    description: "选择预设，一次生成一段内容。",
  },
  {
    path: "/history",
    label: "历史记录",
    description: "查看和整理最近的结果。",
  },
  {
    path: "/storage",
    label: "数据管理",
    description: "导入、导出或清理本地内容。",
  },
  {
    path: "/settings",
    label: "设置",
    description: "调整工具的设置。",
  },
]
