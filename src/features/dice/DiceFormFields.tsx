import { MAX_DIE_SIDES } from "../../utils/dice/index.ts"
import { withExpression, withField, withPreset, type DiceFormValues } from "../../utils/dice/diceForm.ts"

const PRESET_SIDES = [2, 4, 6, 8, 10, 12, 20, 100]

export function DiceFormFields({
  idPrefix,
  form,
  onChange,
  namePlaceholder,
}: {
  idPrefix: string
  form: DiceFormValues
  onChange: (next: DiceFormValues) => void
  namePlaceholder?: string
}) {
  return (
    <>
      <label className="field" htmlFor={`${idPrefix}-name`}>
        名称
        <input
          id={`${idPrefix}-name`}
          value={form.name}
          placeholder={namePlaceholder}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
        />
      </label>
      <label className="field" htmlFor={`${idPrefix}-expression`}>
        表达式
        <input
          id={`${idPrefix}-expression`}
          value={form.expression}
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => onChange(withExpression(form, event.target.value))}
        />
      </label>
      <div className="inline-form expression-fields">
        <label className="field" htmlFor={`${idPrefix}-sides`}>
          自定义面数
          <input
            id={`${idPrefix}-sides`}
            type="number"
            inputMode="numeric"
            min={2}
            max={MAX_DIE_SIDES}
            value={form.sides}
            onChange={(event) => onChange(withField(form, "sides", event.target.value))}
          />
        </label>
        <label className="field" htmlFor={`${idPrefix}-count`}>
          投掷颗数
          <input
            id={`${idPrefix}-count`}
            type="number"
            inputMode="numeric"
            min={1}
            value={form.count}
            onChange={(event) => onChange(withField(form, "count", event.target.value))}
          />
        </label>
        <label className="field" htmlFor={`${idPrefix}-modifier`}>
          数值补正
          <input
            id={`${idPrefix}-modifier`}
            type="number"
            inputMode="numeric"
            value={form.modifier}
            onChange={(event) => onChange(withField(form, "modifier", event.target.value))}
          />
        </label>
      </div>
      <h3 className="section-label" id={`${idPrefix}-presets`}>
        常用骰子
      </h3>
      <div className="dice-presets" role="group" aria-labelledby={`${idPrefix}-presets`}>
        {PRESET_SIDES.map((sides) => (
          <button
            key={sides}
            className="button button-secondary"
            type="button"
            aria-pressed={form.sides === String(sides)}
            onClick={() => onChange(withPreset(form, sides))}
          >
            d{sides}
          </button>
        ))}
      </div>
    </>
  )
}
