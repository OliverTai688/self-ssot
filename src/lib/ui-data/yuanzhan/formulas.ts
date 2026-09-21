export type CellMap = Record<string, string | number>
export type FormulaResult = { value: number | null; error: string | null }

// Restricted arithmetic parser. Never executes JavaScript or follows external links.
export function evaluateFormula(raw: string, cells: CellMap = {}, visiting = new Set<string>(), budget = { steps: 0, cache: new Map<string, number>() }): FormulaResult {
  try {
    if (++budget.steps > 10000) throw new Error("#LIMIT!")
    if (!raw.trim()) return { value: null, error: null }
    if (!raw.startsWith("=")) {
      const value = Number(raw)
      if (!Number.isFinite(value)) throw new Error("#VALUE!")
      return { value, error: null }
    }
    if (raw.length > 2000 || visiting.size > 100) throw new Error("#LIMIT!")
    const expression = raw.slice(1).toUpperCase().replace(/\s+/g, "")
    const tokens = expression.match(/(?:\d+(?:\.\d*)?|\.\d+)|[A-Z]+\d*|[+\-*/(),:]/g) ?? []
    if (tokens.join("") !== expression) throw new Error("#FORMULA!")
    let position = 0
    const cell = (ref: string): number => {
      if (visiting.has(ref)) throw new Error("#CYCLE!")
      if (!(ref in cells)) throw new Error("#REF!")
      if (budget.cache.has(ref)) return budget.cache.get(ref)!
      const result = evaluateFormula(String(cells[ref]), cells, new Set(visiting).add(ref), budget)
      if (result.error) throw new Error(result.error)
      if (result.value === null) throw new Error("#VALUE!")
      budget.cache.set(ref, result.value)
      return result.value
    }
    const expect = (token: string) => { if (tokens[position++] !== token) throw new Error("#FORMULA!") }
    const atom = (): number => {
      if (++budget.steps > 10000) throw new Error("#LIMIT!")
      const token = tokens[position++]
      if (token === "+") return atom()
      if (token === "-") return -atom()
      if (token === "(") { const value = sum(); expect(")"); return value }
      if (/^(?:\d|\.)/.test(token ?? "")) return Number(token)
      if (/^[A-Z]+\d+$/.test(token ?? "")) return cell(token)
      if (["SUM", "AVERAGE", "MIN", "MAX"].includes(token)) {
        expect("("); const values: number[] = []
        while (tokens[position] !== ")") {
          const first = tokens[position]
          if (/^[A-Z]\d+$/.test(first ?? "") && tokens[position + 1] === ":") {
            position += 2; const last = tokens[position++]
            if (!/^[A-Z]\d+$/.test(last ?? "") || first[0] !== last[0]) throw new Error("#RANGE!")
            const from = Number(first.slice(1)), to = Number(last.slice(1))
            if (to < from || to - from > 1000) throw new Error("#RANGE!")
            for (let row = from; row <= to; row++) values.push(cell(`${first[0]}${row}`))
          } else values.push(sum())
          if (tokens[position] !== ",") break
          position++
        }
        expect(")"); if (!values.length) throw new Error("#VALUE!")
        const total = values.reduce((a, b) => a + b, 0)
        return token === "SUM" ? total : token === "AVERAGE" ? total / values.length : token === "MIN" ? Math.min(...values) : Math.max(...values)
      }
      throw new Error("#NAME?")
    }
    const product = (): number => {
      let value = atom()
      while (tokens[position] === "*" || tokens[position] === "/") {
        const operator = tokens[position++], next = atom()
        if (operator === "/" && next === 0) throw new Error("#DIV/0!")
        value = operator === "*" ? value * next : value / next
      }
      return value
    }
    const sum = (): number => {
      let value = product()
      while (tokens[position] === "+" || tokens[position] === "-") {
        const operator = tokens[position++], next = product()
        value = operator === "+" ? value + next : value - next
      }
      return value
    }
    const value = sum()
    if (position !== tokens.length || !Number.isFinite(value)) throw new Error("#FORMULA!")
    return { value, error: null }
  } catch (error) { return { value: null, error: error instanceof Error ? error.message : "#FORMULA!" } }
}
