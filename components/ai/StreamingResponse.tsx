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
    <>
      <style jsx>{`
        @keyframes scanLine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 0%; }
          50% { background-position: 0% 100%; }
        }
      `}</style>

      <div className="w-full">
        {/* AI label with processing indicator */}
        <div className="flex items-center gap-2 mb-1.5 px-1">
          <span className="font-body text-[11px] text-gold uppercase tracking-wider">
            RKV {content ? '' : '// Processing'}
          </span>
          {!content && (
            <span className="font-mono text-[11px] text-gold animate-pulse">...</span>
          )}
        </div>

        {/* Message body */}
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
            {content ? (
              <div className="space-y-0">
                {formatContent(content)}
                {/* Blinking cursor at end */}
                {isStreaming && (
                  <span className="inline-block w-0.5 h-5 bg-gold animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            ) : isStreaming ? (
              /* Scanning progress bar */
              <div className="space-y-2">
                <div className="h-[2px] w-48 bg-[#1e1e1e] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-transparent via-gold to-transparent rounded-full"
                    style={{
                      width: '40%',
                      animation: 'scanLine 1.5s ease-in-out infinite',
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* Timestamp */}
        {!isStreaming && content && (
          <p className="font-mono text-[11px] text-muted-deep mt-1.5 px-5">Just now</p>
        )}
      </div>
    </>
  );
}

export default StreamingResponse;
