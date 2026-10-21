/**
 * APA-inspired structure for chatbot replies (headings, lists, notes).
 * Used by the fallback engine when building text and by the UI when rendering.
 */

export const APA_CHAT_DISCLAIMER =
  'Note. This information is for educational purposes only and is not a substitute for professional medical advice.'

export function apaParagraph(...lines: string[]): string {
  return lines.filter(Boolean).join('\n\n')
}

export function apaBullets(title: string, items: string[]): string {
  const list = items.map(item => `• ${item}`).join('\n')
  return `${title}\n\n${list}`
}

export function apaNumbered(title: string, items: string[]): string {
  const list = items.map((item, index) => `${index + 1}. ${item}`).join('\n')
  return `${title}\n\n${list}`
}

/** Join sections with blank lines; optionally append the standard Note. disclaimer. */
export function apaReply(sections: string[], options?: { disclaimer?: boolean }): string {
  const body = sections.filter(Boolean).join('\n\n')
  if (options?.disclaimer === false) return body
  if (body.includes('Note.')) return body
  return `${body}\n\n${APA_CHAT_DISCLAIMER}`
}

export type ChatBlock =
  | { kind: 'heading'; level: 1 | 2; text: string }
  | { kind: 'paragraph'; text: string }
  | { kind: 'ul'; items: string[] }
  | { kind: 'ol'; items: string[] }
  | { kind: 'note'; text: string }

const BULLET_RE = /^[\u2022\u2023\u25E6\u2043\u2219•\-*]\s+/
const NUMBERED_RE = /^\d+[.)]\s+/
const MARKDOWN_HEADING_RE = /^(#{1,2})\s+(.+)$/
const NOTE_RE = /^(Note|Reference)\.\s+/i

function isSectionLabel(line: string, nextLine?: string): boolean {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > 50 || /[.!?]$/.test(trimmed)) return false
  if (NOTE_RE.test(trimmed) || BULLET_RE.test(trimmed) || NUMBERED_RE.test(trimmed)) return false
  if (!nextLine) return false
  return trimmed.split(' ').length <= 4
    && !BULLET_RE.test(nextLine)
    && !NUMBERED_RE.test(nextLine)
}

function isStandaloneTitle(line: string, lineIndex: number): boolean {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > 70 || /[.!?]$/.test(trimmed)) return false
  if (BULLET_RE.test(trimmed) || NUMBERED_RE.test(trimmed) || NOTE_RE.test(trimmed)) return false
  return lineIndex === 0 && trimmed.split(' ').length <= 8
}

function isHeadingLine(line: string, nextLine?: string): boolean {
  const trimmed = line.trim()
  if (!trimmed || trimmed.length > 80) return false
  if (NOTE_RE.test(trimmed)) return false
  if (BULLET_RE.test(trimmed) || NUMBERED_RE.test(trimmed)) return false
  if (trimmed.endsWith(':')) return true
  if (nextLine && (BULLET_RE.test(nextLine.trim()) || NUMBERED_RE.test(nextLine.trim()))) {
    return !trimmed.endsWith('.') && trimmed.split(' ').length <= 8
  }
  return false
}

function stripBulletPrefix(line: string): string {
  return line.trim().replace(BULLET_RE, '').replace(NUMBERED_RE, '')
}

/** Parse plain-text / light-markdown chat content into render blocks. */
export function parseChatMessage(content: string): ChatBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: ChatBlock[] = []
  let paragraphBuffer: string[] = []
  let listBuffer: string[] = []
  let listKind: 'ul' | 'ol' | null = null

  const flushParagraph = () => {
    if (!paragraphBuffer.length) return
    const text = paragraphBuffer.join(' ').replace(/\s+/g, ' ').trim()
    if (text) blocks.push({ kind: 'paragraph', text })
    paragraphBuffer = []
  }

  const flushList = () => {
    if (!listBuffer.length || !listKind) return
    blocks.push({ kind: listKind, items: [...listBuffer] })
    listBuffer = []
    listKind = null
  }

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i]
    const line = raw.trim()
    if (!line) {
      flushList()
      flushParagraph()
      continue
    }

    const headingMatch = line.match(MARKDOWN_HEADING_RE)
    if (headingMatch) {
      flushList()
      flushParagraph()
      blocks.push({
        kind: 'heading',
        level: headingMatch[1].length === 1 ? 1 : 2,
        text: headingMatch[2].trim(),
      })
      continue
    }

    if (NOTE_RE.test(line)) {
      flushList()
      flushParagraph()
      blocks.push({ kind: 'note', text: line })
      continue
    }

    if (BULLET_RE.test(line)) {
      flushParagraph()
      if (listKind === 'ol') flushList()
      listKind = 'ul'
      listBuffer.push(stripBulletPrefix(line))
      continue
    }

    if (NUMBERED_RE.test(line)) {
      flushParagraph()
      if (listKind === 'ul') flushList()
      listKind = 'ol'
      listBuffer.push(stripBulletPrefix(line))
      continue
    }

    const nextLine = lines[i + 1]?.trim()
    if (isStandaloneTitle(line, i)) {
      flushList()
      flushParagraph()
      blocks.push({ kind: 'heading', level: 1, text: line })
      continue
    }

    if (isHeadingLine(line, nextLine)) {
      flushList()
      flushParagraph()
      blocks.push({
        kind: 'heading',
        level: 2,
        text: line.replace(/:$/, ''),
      })
      continue
    }

    if (isSectionLabel(line, nextLine)) {
      flushList()
      flushParagraph()
      blocks.push({ kind: 'heading', level: 2, text: line })
      continue
    }

    flushList()
    paragraphBuffer.push(line)
  }

  flushList()
  flushParagraph()
  return blocks
}
