"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface MarkdownProps {
  content: string;
  className?: string;
}

export function Markdown({ content, className }: MarkdownProps) {
  return (
    <div className={cn("prose prose-sm dark:prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Headings
          h1: ({ children }) => (
            <h1 className="mb-3 mt-4 text-xl font-bold first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-lg font-semibold first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-3 text-base font-semibold first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-1 mt-2 text-sm font-semibold">{children}</h4>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="mb-3 leading-relaxed last:mb-0">{children}</p>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,

          // Bold / italic
          strong: ({ children }) => (
            <strong className="font-semibold">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,

          // Code
          code: ({ className, children, ...props }) => {
            const isBlock = className?.includes("language-");
            if (isBlock) {
              return (
                <code
                  className="block overflow-x-auto rounded-lg bg-black/10 p-3 text-xs dark:bg-white/10"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded bg-black/10 px-1.5 py-0.5 text-[13px] dark:bg-white/10"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-3 overflow-x-auto rounded-lg bg-black/10 p-0 dark:bg-white/10">
              {children}
            </pre>
          ),

          // Tables (GFM)
          table: ({ children }) => (
            <div className="mb-4 w-full overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[500px] border-collapse text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/70">{children}</thead>
          ),
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => (
            <tr className="border-b border-border last:border-0">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 align-top text-[13px] leading-snug">
              {children}
            </td>
          ),

          // Links
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),

          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="mb-3 border-l-4 border-primary/40 pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),

          // Horizontal rule
          hr: () => <hr className="my-4 border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
