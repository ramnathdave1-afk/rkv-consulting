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

  return (
    <div
      className={cn(
        'flex gap-3 group max-w-[85%]',
        isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
      )}
    >
      {/* Avatar */}
      {isUser ? (
        <div className="flex-shrink-0 flex items-start">
          <div className="w-8 h-8 rounded-full bg-gold/15 border border-gold/20 flex items-center justify-center">
            <span className="text-xs font-semibold text-gold">
              {userInitials}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-shrink-0 flex items-start">
          <div className="w-8 h-8 rounded-full bg-gold/15 border border-gold/20 flex items-center justify-center">
            <span className="text-[10px] font-bold text-gold">AI</span>
          </div>
        </div>
      )}

      {/* Message bubble */}
      <div className="relative">
        <div
          className={cn(
            'px-4 py-3 text-sm leading-relaxed font-body',
            isUser
              ? 'bg-gold/20 border border-gold/30 rounded-2xl rounded-br-sm text-white'
              : 'bg-card border border-border rounded-2xl rounded-bl-sm text-text'
          )}
        >
          {/* Copy button - appears on hover */}
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'absolute -top-2 opacity-0 group-hover:opacity-100',
              'transition-opacity duration-150',
              'p-1.5 rounded-lg bg-deep border border-border',
              'hover:bg-card hover:border-gold/20',
              'text-muted hover:text-gold',
              isUser ? 'left-0' : 'right-0'
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

        {/* Timestamp */}
        <p
          className={cn(
            'text-xs text-muted mt-1.5 px-1',
            isUser ? 'text-right' : 'text-left'
          )}
        >
          {formattedTime}
        </p>
      </div>
    </div>
  );
}

export default MessageBubble;
