import { useState } from "react"
import { useCatalog } from "../features/storage/useCatalog.ts"
import { floorDescription, type DiceFloorMode } from "../utils/dice/diceFloor.ts"
import { sortWeightDescription, type SortWeightBias } from "../utils/collection/sortWeight.ts"

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

  async function updateFloor(enabled: boolean, mode: DiceFloorMode) {
    if (saving) return
    setSaving(true)
    setError(null)
    const result = await catalog.setDiceFloor({ enabled, mode })
    setSaving(false)
    if (!result.ok) setError(result.message)
  }

  async function updateSortWeight(enabled: boolean, bias: SortWeightBias) {
    if (saving) return
    setSaving(true)
    setError(null)
    const result = await catalog.setSortWeight({ enabled, bias })
    setSaving(false)
    if (!result.ok) setError(result.message)
  }

  return (
    <section className="page">
      <h1>设置</h1>
      <p className="lead">调整这些工具的设置。</p>
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
          <div className="setting-block">
            <label className="setting-row">
              <span>显示内置数据</span>
              <input
                className="switch"
                type="checkbox"
                role="switch"
                checked={catalog.showBuiltin}
                onChange={(event) => void toggleBuiltin(event.target.checked)}
              />
            </label>
            <p className="note">默认关闭。打开后，内置内容会回到随机表、词条、生成器和数据管理中。</p>
          </div>
          <div className="setting-block">
            <div className="setting-line">
              <span>投掷结果补正</span>
              <input
                className="switch"
                type="checkbox"
                role="switch"
                aria-label="投掷结果补正"
                checked={catalog.diceFloor.enabled}
                onChange={(event) => void updateFloor(event.target.checked, catalog.diceFloor.mode)}
              />
              <label className={catalog.diceFloor.enabled ? "setting-inline" : "setting-inline is-disabled"} htmlFor="dice-floor-mode">
                补正规则
                <select
                  id="dice-floor-mode"
                  className="setting-select"
                  value={catalog.diceFloor.mode}
                  disabled={!catalog.diceFloor.enabled}
                  onChange={(event) => void updateFloor(catalog.diceFloor.enabled, event.target.value === "nonnegative" ? "nonnegative" : "positive")}
                >
                  <option value="positive">保证正数</option>
                  <option value="nonnegative">保证非负数</option>
                </select>
              </label>
            </div>
            <p className="note">{floorDescription(catalog.diceFloor)}</p>
          </div>
          <div className="setting-block">
            <div className="setting-line">
              <span>排序权重影响</span>
              <input
                className="switch"
                type="checkbox"
                role="switch"
                aria-label="排序权重影响"
                checked={catalog.sortWeight.enabled}
                onChange={(event) => void updateSortWeight(event.target.checked, catalog.sortWeight.bias)}
              />
              <label className={catalog.sortWeight.enabled ? "setting-inline" : "setting-inline is-disabled"} htmlFor="sort-weight-bias">
                影响程度
                <select
                  id="sort-weight-bias"
                  className="setting-select"
                  value={catalog.sortWeight.bias}
                  disabled={!catalog.sortWeight.enabled}
                  onChange={(event) => void updateSortWeight(catalog.sortWeight.enabled, event.target.value === "back" ? "back" : "front")}
                >
                  <option value="front">更易靠前</option>
                  <option value="back">更易靠后</option>
                </select>
              </label>
            </div>
            <p className="note">{sortWeightDescription(catalog.sortWeight)}</p>
          </div>
        </>
      ) : null}
    </section>
  )
}
