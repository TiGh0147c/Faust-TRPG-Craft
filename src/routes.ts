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
    path: "/pipeline",
    label: "链路",
    description: "选表后投骰或填入数值，匹配区间并带出词条。",
  },
  {
    path: "/dice",
    label: "骰子",
    description: "投掷常见骰子和简单表达式。",
  },
  {
    path: "/tables",
    label: "随机表",
    description: "按数值范围或权重抽取一条结果。",
  },
  {
    path: "/entries",
    label: "词条",
    description: "查找、筛选，并与随机表结果关联。",
  },
  {
    path: "/generators",
    label: "生成器",
    description: "选择预设，一次生成一段内容。",
  },
  {
    path: "/history",
    label: "历史",
    description: "查看、复制、收藏历史，并复选后批量删除或导出。",
  },
  {
    path: "/storage",
    label: "数据管理",
    description: "导入、导出和清理保存在这台浏览器里的用户内容与历史。",
  },
]
