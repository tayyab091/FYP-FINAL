'use client'

import type { ReactNode } from 'react'
import { parseChatMessage } from '@/lib/chat-apa-format'

const INLINE_BOLD_RE = /\*\*(.+?)\*\*/g
const INLINE_ITALIC_RE = /(?<!\*)\*([^*]+)\*(?!\*)/g

function renderInlineText(text: string): ReactNode[] {
  const parts: React.ReactNode[] = []
  let remaining = text
  let key = 0

  while (remaining.length > 0) {
    const boldMatch = INLINE_BOLD_RE.exec(remaining)
    INLINE_BOLD_RE.lastIndex = 0

    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) parts.push(remaining.slice(0, boldMatch.index))
      parts.push(
        <strong key={`b-${key++}`} className="font-semibold text-foreground">
          {boldMatch[1]}
        </strong>,
      )
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length)
      continue
    }

    const italicMatch = INLINE_ITALIC_RE.exec(remaining)
    INLINE_ITALIC_RE.lastIndex = 0

    if (italicMatch && italicMatch.index !== undefined) {
      if (italicMatch.index > 0) parts.push(remaining.slice(0, italicMatch.index))
      parts.push(
        <em key={`i-${key++}`} className="italic">
          {italicMatch[1]}
        </em>,
      )
      remaining = remaining.slice(italicMatch.index + italicMatch[0].length)
      continue
    }

    parts.push(remaining)
    break
  }

  return parts.length ? parts : [text]
}

export function ChatMessageContent({ content }: { content: string }) {
  const blocks = parseChatMessage(content)

  if (!blocks.length) {
    return <p className="text-sm leading-[1.75]">{content}</p>
  }

  return (
    <div className="chat-apa space-y-2.5 text-sm leading-[1.75]">
      {blocks.map((block, index) => {
        switch (block.kind) {
          case 'heading':
            return block.level === 1 ? (
              <h3
                key={index}
                className="text-[0.9375rem] font-bold tracking-tight text-foreground first:mt-0"
              >
                {renderInlineText(block.text)}
              </h3>
            ) : (
              <h4
                key={index}
                className="text-[0.8125rem] font-semibold uppercase tracking-wide text-foreground/90"
              >
                {renderInlineText(block.text)}
              </h4>
            )
          case 'paragraph':
            return (
              <p key={index} className="text-foreground/95">
                {renderInlineText(block.text)}
              </p>
            )
          case 'ul':
            return (
              <ul
                key={index}
                className="list-disc space-y-1.5 pl-5 marker:text-primary/70"
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="pl-0.5">
                    {renderInlineText(item)}
                  </li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol
                key={index}
                className="list-decimal space-y-1.5 pl-5 marker:font-semibold marker:text-primary/80"
              >
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex} className="pl-0.5">
                    {renderInlineText(item)}
                  </li>
                ))}
              </ol>
            )
          case 'note':
            return (
              <p
                key={index}
                className="border-l-2 border-primary/35 pl-3 text-xs italic leading-relaxed text-muted-foreground"
              >
                {renderInlineText(block.text)}
              </p>
            )
          default:
            return null
        }
      })}
    </div>
  )
}
