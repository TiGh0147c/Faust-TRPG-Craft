import type { DiceRollResult } from "../types/dice.ts"
import { formatFinalResult, formatModifier } from "../utils/dice/formatDiceResult.ts"

export function DiceBreakdown({ result }: { result: DiceRollResult }) {
  return (
    <>
      <p className="dice-expression">{result.expression}</p>
      <h3 className="section-label">每颗骰子</h3>
      <ul className="dice-rolls">
        {result.rolls.map((die, index) => (
          <li key={`${die.sides}-${index}`} title={`d${die.sides}`}>
            {die.value}
          </li>
        ))}
      </ul>
      <dl className="dice-meta">
        <div>
          <dt>基础总值</dt>
          <dd>{result.subtotal}</dd>
        </div>
        <div>
          <dt>修正值</dt>
          <dd>{formatModifier(result.modifier)}</dd>
        </div>
        <div>
          <dt>最终结果</dt>
          <dd>{formatFinalResult(result)}</dd>
        </div>
      </dl>
    </>
  )
}
