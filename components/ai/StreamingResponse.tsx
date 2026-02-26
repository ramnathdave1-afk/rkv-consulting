'use client';

import React from 'react';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface StreamingResponseProps {
  content: string;
  isStreaming: boolean;
}

/* ------------------------------------------------------------------ */
/*  Markdown-like formatter (same as MessageBubble)                    */
/* ------------------------------------------------------------------ */

function formatContent(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    if (line.trimStart().startsWith('- ') || line.trimStart().startsWith('* ')) {
      const bulletText = line.trimStart().slice(2);
      elements.push(
        <div key={lineIdx} className="flex items-start gap-2 ml-2 my-0.5">
          <span className="w-1 h-1 rounded-full bg-gold mt-1.5 flex-shrink-0" />
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

function formatInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    if (match[2]) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {match[2]}
        </strong>
      );
    } else if (match[3]) {
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

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function StreamingResponse({ content, isStreaming }: StreamingResponseProps) {
  return (
    <div className="flex gap-3 mr-auto max-w-[85%]">
      {/* AI Avatar */}
      <div className="flex-shrink-0 flex items-start">
        <div className="w-8 h-8 rounded-full bg-gold/15 border border-gold/20 flex items-center justify-center">
          <span className="text-[10px] font-bold text-gold">AI</span>
        </div>
      </div>

      {/* Message bubble */}
      <div>
        <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed font-body text-text">
          {content ? (
            <div className="space-y-0">
              {formatContent(content)}
              {/* Blinking cursor at end */}
              {isStreaming && (
                <span className="inline-block w-0.5 h-5 bg-gold animate-pulse ml-0.5 align-middle" />
              )}
            </div>
          ) : isStreaming ? (
            /* Loading dots when no content yet */
            <div className="flex items-center gap-1.5 py-1">
              <span
                className="w-2 h-2 rounded-full bg-gold/60 animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-2 h-2 rounded-full bg-gold/60 animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-2 h-2 rounded-full bg-gold/60 animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          ) : null}
        </div>

        {/* Timestamp placeholder */}
        {!isStreaming && content && (
          <p className="text-xs text-muted mt-1.5 px-1">Just now</p>
        )}
      </div>
    </div>
  );
}

export default StreamingResponse;
