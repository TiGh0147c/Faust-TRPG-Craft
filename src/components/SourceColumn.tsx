import type { ReactNode } from "react"
import type { DataOrigin } from "../types/data.ts"

export function SourceColumn<T extends { id: string; origin: DataOrigin }>({
  items,
  userNote,
  createLabel,
  onCreate,
  renderItem,
}: {
  items: readonly T[]
  userNote: string
  createLabel: string
  onCreate: () => void
  renderItem: (item: T) => ReactNode
}) {
  const builtin = items.filter((item) => item.origin === "builtin")
  const user = items.filter((item) => item.origin === "user")
  return (
    <div className="source-column">
      <h2 className="section-label">内置</h2>
      {builtin.length === 0 ? (
        <p className="note">没有符合条件的内置内容。</p>
      ) : (
        <ul className="table-list">
          {builtin.map((item) => (
            <li key={item.id}>{renderItem(item)}</li>
          ))}
        </ul>
      )}
      <h2 className="section-label">用户</h2>
      {user.length === 0 ? (
        <p className="note">{userNote}</p>
      ) : (
        <ul className="table-list">
          {user.map((item) => (
            <li key={item.id}>{renderItem(item)}</li>
          ))}
        </ul>
      )}
      <button className="button button-secondary source-create" type="button" onClick={onCreate}>
        {createLabel}
      </button>
    </div>
  )
}
