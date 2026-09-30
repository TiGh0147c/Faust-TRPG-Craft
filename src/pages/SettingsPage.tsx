import { useState } from "react"
import { useCatalog } from "../features/storage/useCatalog.ts"

export function SettingsPage() {
  const catalog = useCatalog()
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function toggleBuiltin(enabled: boolean) {
    if (saving) return
    setSaving(true)
    setError(null)
    const result = await catalog.setShowBuiltin(enabled)
    setSaving(false)
    if (!result.ok) setError(result.message)
  }

  return (
    <section className="page">
      <h1>设置</h1>
      <p className="lead">控制是否使用内置的随机表、词条和生成器。</p>
      {catalog.status === "loading" ? <p className="note">正在读取设置…</p> : null}
      {catalog.loadError ? (
        <p className="form-error" role="alert">
          {catalog.loadError}
        </p>
      ) : null}
      {catalog.status === "ready" ? (
        <>
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <label className="check-row">
            <input
              type="checkbox"
              checked={catalog.showBuiltin}
              disabled={saving}
              onChange={(event) => void toggleBuiltin(event.target.checked)}
            />
            显示内置数据
          </label>
          <p className="note">默认关闭。打开后，内置内容会回到随机表、词条、生成器和数据管理中。</p>
        </>
      ) : null}
    </section>
  )
}
