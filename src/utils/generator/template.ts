export function unknownTemplateVariable(template: string, names: ReadonlySet<string>): string | null {
  let index = 0
  while (index < template.length) {
    const open = template.indexOf("{{", index)
    if (open === -1) return null
    const close = template.indexOf("}}", open + 2)
    if (close === -1) return null
    const name = template.slice(open + 2, close).trim()
    if (name === "" || !names.has(name)) return name
    index = close + 2
  }
  return null
}
