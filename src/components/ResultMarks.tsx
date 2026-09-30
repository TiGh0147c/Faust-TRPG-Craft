const RESULT_MARK = /(\s->\s|\s&&\s|\s&\s|\s>\s|\s=\s|\[\s*-?\d+\s*\])/g

export function ResultMarks({ text }: { text: string }) {
  const parts = text.split(RESULT_MARK)
  return parts.map((part, index) =>
    isResultMark(part) ? (
      <span key={index} className="result-mark">
        {part}
      </span>
    ) : (
      <span key={index}>{part}</span>
    ),
  )
}

export function SequenceHeadline({
  action,
  values,
}: {
  action: "order" | "draw"
  values: readonly (string | number)[]
}) {
  const mark = action === "order" ? " -> " : " & "
  return values.map((value, index) => (
    <span key={`${index}-${String(value)}`}>
      {index > 0 ? <span className="result-mark">{mark}</span> : null}
      {String(value)}
    </span>
  ))
}

function isResultMark(part: string): boolean {
  return /^(?: -> | && | & | > | = |\[\s*-?\d+\s*\])$/.test(part)
}
