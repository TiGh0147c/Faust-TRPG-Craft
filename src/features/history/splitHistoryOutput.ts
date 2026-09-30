const FINAL_RESULT_LINE = /^(?:最终结果|结果|表项)：/

export function splitHistoryOutput(output: string): { preview: string; detail: string } {
  const lines = output.split("\n")
  const index = lines.findIndex((line) => FINAL_RESULT_LINE.test(line))
  if (index < 0) return { preview: output, detail: "" }
  return {
    preview: lines.slice(0, index + 1).join("\n"),
    detail: lines.slice(index + 1).join("\n").trim(),
  }
}
