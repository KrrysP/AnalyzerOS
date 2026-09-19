'use client';

import React, { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

/**
 * Renders backend-provided markdown (chat_answer, executive_summary, etc.)
 * as formatted prose instead of literal "##"/"**" characters. No
 * dangerouslySetInnerHTML — react-markdown produces real React elements.
 */
export const MarkdownContent: React.FC<MarkdownContentProps> = memo(function MarkdownContent({
  content,
  className = '',
}) {
  if (!content || typeof content !== 'string') return null;

  return (
    <div className={`markdown-body space-y-2.5 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-[15px] font-bold text-slate-900 tracking-tight mt-3 mb-1.5 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-[13px] font-bold text-slate-900 tracking-tight mt-3 mb-1.5 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mt-3 mb-1 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="text-xs text-slate-700 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
          em: ({ children }) => <em className="italic text-slate-700">{children}</em>,
          ul: ({ children }) => <ul className="space-y-1 pl-4 list-disc marker:text-indigo-400">{children}</ul>,
          ol: ({ children }) => <ol className="space-y-1 pl-4 list-decimal marker:text-indigo-400 marker:font-semibold">{children}</ol>,
          li: ({ children }) => <li className="text-xs text-slate-700 leading-relaxed">{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 hover:text-indigo-700 underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="px-1 py-0.5 rounded bg-slate-100 text-indigo-700 font-mono text-[11px]">{children}</code>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-indigo-200 pl-3 text-xs text-slate-500 italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-slate-200 my-2" />,
          table: ({ children }) => (
            <div className="overflow-x-auto rounded-lg border border-slate-200 my-2">
              <table className="w-full text-left text-[11px] border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
          th: ({ children }) => (
            <th className="py-1.5 px-2.5 font-semibold text-slate-600 border-b border-slate-200 whitespace-nowrap">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="py-1.5 px-2.5 text-slate-700 border-b border-slate-100 whitespace-nowrap">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
});
