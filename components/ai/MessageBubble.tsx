'use client';

import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  userInitials?: string;
}

/* ------------------------------------------------------------------ */
/*  Markdown-like formatter                                            */
/* ------------------------------------------------------------------ */

function formatContent(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    // Bullet points
    if (line.trimStart().startsWith('- ') || line.trimStart().startsWith('* ')) {
      const bulletText = line.trimStart().slice(2);
      elements.push(
        <div key={lineIdx} className="flex items-start gap-2 ml-2 my-0.5">
          <span className="text-gold mt-1.5 flex-shrink-0 w-1 h-1 rounded-full bg-gold" />
          <span>{formatInline(bulletText)}</span>
        </div>
      );
    } else if (line.trim() === '') {
      elements.push(<div key={lineIdx} className="h-2" />);
    } else {
      elements.push(
        <p key={lineIdx} className="my-0.5">
          {formatInline(line)}
        </p>
      );
    }
  });

  return elements;
}

/** Bold with ** and inline code with ` */
function formatInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Match **bold**, `code`
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2]) {
      // Bold
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
      // Inline code
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-white/5 text-gold-light text-[0.85em] font-mono"
        >
          {match[3]}
        </code>
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function MessageBubble({
  role,
  content,
  timestamp,
  userInitials = 'U',
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may not be available */
    }
  }

  const formattedTime = (() => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return timestamp;
    }
  })();

  if (isUser) {
    return (
      <div className="flex justify-end group">
        <div className="max-w-[75%]">
          {/* User label */}
          <div className="flex items-center justify-end gap-2 mb-1.5 px-1">
            <span className="font-mono text-[11px] text-muted-deep">{formattedTime}</span>
            <span className="font-body text-[11px] text-gold uppercase tracking-wider">
              {userInitials}
            </span>
          </div>
          {/* User message */}
          <div className="relative">
            <div
              className="px-4 py-3 text-sm leading-relaxed font-body text-[#f5f5f5] rounded-lg"
              style={{
                background: 'rgba(201,168,76,0.07)',
                border: '1px solid rgba(201,168,76,0.25)',
              }}
            >
              {/* Copy button */}
              <button
                type="button"
                onClick={handleCopy}
                className={cn(
                  'absolute -top-2 left-0 opacity-0 group-hover:opacity-100',
                  'transition-opacity duration-150',
                  'p-1.5 rounded-lg bg-[#111111] border border-[#1e1e1e]',
                  'hover:border-gold/20 text-muted hover:text-gold',
                )}
                title="Copy message"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>

              {/* Content */}
              <div className="space-y-0">{formatContent(content)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="group w-full">
      {/* AI label */}
      <div className="flex items-center gap-2 mb-1.5 px-1">
        <span className="font-body text-[11px] text-gold uppercase tracking-wider">
          RKV
        </span>
        <span className="font-mono text-[11px] text-muted-deep">{formattedTime}</span>
      </div>
      {/* AI message */}
      <div className="relative">
        {/* Animated gradient left border */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[2px] rounded-full"
          style={{
            background: 'linear-gradient(180deg, #c9a84c 0%, #c9a84c 50%, #c9a84c 100%)',
            backgroundSize: '100% 200%',
            animation: 'gradientShift 3s ease infinite',
          }}
        />
        <div className="pl-4 pr-2 py-3 text-sm leading-relaxed font-body text-[#f5f5f5]">
          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'absolute -top-2 right-0 opacity-0 group-hover:opacity-100',
              'transition-opacity duration-150',
              'p-1.5 rounded-lg bg-[#111111] border border-[#1e1e1e]',
              'hover:border-gold/20 text-muted hover:text-gold',
            )}
            title="Copy message"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>

          {/* Content */}
          <div className="space-y-0">{formatContent(content)}</div>
        </div>
      </div>
    </div>
  );
}

export default MessageBubble;
