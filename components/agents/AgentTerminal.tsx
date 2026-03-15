'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(() => import('@monaco-editor/react').then((m) => m.default), { ssr: false });

interface LogEntry {
  id: string;
  agent_name: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface AgentTerminalProps {
  logs: LogEntry[];
}

export function AgentTerminal({ logs }: AgentTerminalProps) {
  const editorRef = useRef<unknown>(null);

  const logText = useMemo(() => {
    return logs
      .slice()
      .reverse()
      .map((log) => {
        const ts = new Date(log.created_at).toISOString().replace('T', ' ').slice(0, 19);
        const agent = `[${log.agent_name.toUpperCase().padEnd(5)}]`;
        const details = log.details ? ` | ${JSON.stringify(log.details)}` : '';
        return `${ts} ${agent} ${log.action}${details}`;
      })
      .join('\n');
  }, [logs]);

  useEffect(() => {
    if (editorRef.current) {
      const editor = editorRef.current as { revealLine: (n: number) => void; getModel: () => { getLineCount: () => number } | null };
      const model = editor.getModel();
      if (model) {
        editor.revealLine(model.getLineCount());
      }
    }
  }, [logText]);

  return (
    <div className="glass-card overflow-hidden h-[500px]">
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5">
        <div className="flex gap-1">
          <span className="h-2 w-2 rounded-full bg-danger" />
          <span className="h-2 w-2 rounded-full bg-warning" />
          <span className="h-2 w-2 rounded-full bg-success" />
        </div>
        <span className="text-[10px] font-mono text-text-muted">agent_output.log</span>
        <span className="text-[9px] text-text-muted ml-auto">{logs.length} entries</span>
      </div>
      <MonacoEditor
        height="calc(100% - 32px)"
        language="log"
        theme="vs-dark"
        value={logText}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace',
          lineNumbers: 'off',
          glyphMargin: false,
          folding: false,
          lineDecorationsWidth: 0,
          lineNumbersMinChars: 0,
          overviewRulerLanes: 0,
          renderLineHighlight: 'none',
          scrollbar: { verticalSliderSize: 4, horizontalSliderSize: 4 },
          wordWrap: 'on',
          padding: { top: 8 },
        }}
        onMount={(editor) => {
          editorRef.current = editor;
          const model = editor.getModel();
          if (model) editor.revealLine(model.getLineCount());
        }}
      />
    </div>
  );
}
