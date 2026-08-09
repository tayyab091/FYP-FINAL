import type { Components } from 'react-markdown'
import ReactMarkdown from 'react-markdown'
import remarkBreaks from 'remark-breaks'
import remarkGfm from 'remark-gfm'

interface ChatMessageContentProps {
  content: string
  variant?: 'user' | 'bot'
}

const STAT_LABEL_PATTERN =
  /^(BMR|TDEE|BMI|Protein(?:\s+target)?|Recommended|Healthy\s+weight\s+range)(?::|\s*\()/i

/** Normalize fallback-engine bullets and enrich plain text for markdown rendering. */
function normalizeContent(content: string): string {
  let text = content.replace(/\r\n/g, '\n').replace(/^(\s*)•\s+/gm, '$1- ')

  // Promote emoji section headers to markdown headings when not already formatted.
  text = text.replace(
    /^(📊|🎯|💧|🏋️|🔥|🏃|🍽️|📏)\s+(.+)$/gm,
    (match, emoji, title) => {
      if (/^#{1,3}\s/.test(match)) return match
      return `### ${emoji} ${title.trim()}`
    },
  )

  // Bold common fitness labels when written as "Label: value" on their own line.
  text = text.replace(
    /^(\s*(?:[-*]\s+)?)(BMR|TDEE|BMI|Protein(?:\s+target)?|Recommended)(:\s*)(.+)$/gim,
    '$1**$2**$3$4',
  )

  // Highlight calorie targets in bullet lines: "• Fat Loss: 1800 kcal/day"
  text = text.replace(
    /^(\s*[-*]\s+)([^:]+:\s*)(\d[\d,]*(?:\.\d+)?\s*kcal(?:\/day)?)/gim,
    '$1$2**$3**',
  )

  return text
}

function buildComponents(variant: 'user' | 'bot'): Components {
  const isUser = variant === 'user'

  return {
    p: ({ children }) => <p className="ai-chatbot__md-p">{children}</p>,
    strong: ({ children }) => (
      <strong className="ai-chatbot__md-strong">{children}</strong>
    ),
    em: ({ children }) => <em className="ai-chatbot__md-em">{children}</em>,
    h1: ({ children }) => (
      <h3 className="ai-chatbot__md-heading ai-chatbot__md-heading--h1">{children}</h3>
    ),
    h2: ({ children }) => (
      <h3 className="ai-chatbot__md-heading ai-chatbot__md-heading--h2">{children}</h3>
    ),
    h3: ({ children }) => (
      <h3 className="ai-chatbot__md-heading ai-chatbot__md-heading--h3">{children}</h3>
    ),
    ul: ({ children }) => (
      <ul className={`ai-chatbot__md-list ${isUser ? 'ai-chatbot__md-list--user' : ''}`}>
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="ai-chatbot__md-list ai-chatbot__md-list--ordered">{children}</ol>
    ),
    li: ({ children }) => {
      const childText =
        typeof children === 'string'
          ? children
          : Array.isArray(children)
            ? children.map((c) => (typeof c === 'string' ? c : '')).join('')
            : ''

      const isStat = STAT_LABEL_PATTERN.test(childText.trim())

      return (
        <li
          className={`ai-chatbot__md-li${isStat ? ' ai-chatbot__md-li--stat' : ''}`}
        >
          {children}
        </li>
      )
    },
    code: ({ className, children }) => {
      const isBlock = className?.includes('language-')
      if (isBlock) {
        return <code className={`ai-chatbot__md-code ${className}`}>{children}</code>
      }
      return <code className="ai-chatbot__md-code ai-chatbot__md-code--inline">{children}</code>
    },
    pre: ({ children }) => <pre className="ai-chatbot__md-pre">{children}</pre>,
    a: ({ href, children }) => (
      <a
        href={href}
        className="ai-chatbot__md-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    ),
    hr: () => <hr className="ai-chatbot__md-hr" aria-hidden />,
    blockquote: ({ children }) => (
      <blockquote className="ai-chatbot__md-blockquote">{children}</blockquote>
    ),
    table: ({ children }) => (
      <div className="ai-chatbot__md-table-wrap">
        <table className="ai-chatbot__md-table">{children}</table>
      </div>
    ),
    th: ({ children }) => <th className="ai-chatbot__md-th">{children}</th>,
    td: ({ children }) => <td className="ai-chatbot__md-td">{children}</td>,
  }
}

export function ChatMessageContent({ content, variant = 'bot' }: ChatMessageContentProps) {
  const rootClass =
    variant === 'user' ? 'ai-chatbot__md ai-chatbot__md--user' : 'ai-chatbot__md'

  if (!content.trim()) {
    return <div className={rootClass} />
  }

  return (
    <div className={rootClass}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={buildComponents(variant)}
      >
        {normalizeContent(content)}
      </ReactMarkdown>
    </div>
  )
}
