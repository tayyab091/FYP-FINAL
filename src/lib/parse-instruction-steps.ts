/** Split instruction text into short numbered steps for compact previews. */
export function parseInstructionSteps(text: string, maxSteps = 4): string[] {
  if (!text?.trim()) return []

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length > 1) {
    return lines
      .map((line) => line.replace(/^(?:step\s*)?\d+[.)]\s*/i, '').trim())
      .filter(Boolean)
      .slice(0, maxSteps)
  }

  const numbered = text.match(/(?:^|\s)(?:\d+[.)]\s*)([^.\d]+(?:\.[^.\d]+)*)/gi)
  if (numbered && numbered.length > 1) {
    return numbered
      .map((part) => part.replace(/^\s*\d+[.)]\s*/i, '').trim())
      .filter(Boolean)
      .slice(0, maxSteps)
  }

  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 8)
    .slice(0, maxSteps)
}
