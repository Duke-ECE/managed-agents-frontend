import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Minimal GFM markdown renderer for assistant bubbles, styled with the ink
 * palette (no @tailwindcss/typography — a few hand-rolled classes instead).
 * Raw HTML is not rendered (react-markdown default).
 */
export default function Markdown({ text }: { text: string }) {
  return (
    <div className="text-[13px] leading-relaxed text-ink-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-2 first:mt-0 last:mb-0">{children}</p>,
          h1: ({ children }) => <h1 className="mb-2 mt-4 text-[16px] font-semibold text-ink-50 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="mb-2 mt-4 text-[15px] font-semibold text-ink-50 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="mb-1.5 mt-3 text-[14px] font-semibold text-ink-100 first:mt-0">{children}</h3>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-accent-fg underline underline-offset-2 hover:text-ink-50">
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-ink-600 pl-3 text-ink-400">{children}</blockquote>
          ),
          hr: () => <hr className="my-3 border-ink-700" />,
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-lg border border-ink-700 bg-ink-950 p-3 font-mono text-[12px] leading-relaxed text-ink-100">
              {children}
            </pre>
          ),
          code: ({ children, className }) =>
            // Fenced blocks carry a language-* class (or sit inside <pre>);
            // inline code gets the pill styling.
            className?.startsWith('language-') ? (
              <code className={className}>{children}</code>
            ) : (
              <code className="rounded border border-ink-700 bg-ink-800 px-1 py-0.5 font-mono text-[12px] text-ink-100">
                {children}
              </code>
            ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto">
              <table className="w-full border-collapse text-[12px]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-ink-700 bg-ink-800 px-2.5 py-1.5 text-left font-semibold text-ink-100">{children}</th>
          ),
          td: ({ children }) => <td className="border border-ink-700 px-2.5 py-1.5 text-ink-200">{children}</td>,
          strong: ({ children }) => <strong className="font-semibold text-ink-50">{children}</strong>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
