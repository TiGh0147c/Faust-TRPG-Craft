/** 返回 [0, 1) 内的数值。 */
export type RandomSource = () => number

export function readRandomUnit(random: RandomSource): number {
  const sample = random()
  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new Error("随机源必须返回 [0, 1) 内的数值。")
  }
  return sample
}
