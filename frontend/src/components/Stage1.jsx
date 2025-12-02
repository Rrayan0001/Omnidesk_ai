import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

import { TextShimmer } from '@/components/ui/text-shimmer';
import { CodeBlockCode } from '@/components/ui/code-block';
import { useTheme } from "@/contexts/ThemeContext";

export default function Stage1({ responses, isLoading }) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  // DEBUG: Check what we're receiving
  console.log('Stage1 received responses:', responses);

  // Convert array format [{model, response}] to object {model: response}
  // And ensure all values are strings
  const responsesObj = useMemo(() => {
    if (!responses) return {};

    if (Array.isArray(responses)) {
      return responses.reduce((acc, item) => {
        if (item && item.model) {
          console.log('Processing item:', item, 'response type:', typeof item.response);
          // Make sure response is a string
          const responseText = typeof item.response === 'string'
            ? item.response
            : (item.response?.content || JSON.stringify(item.response) || '');
          acc[item.model] = responseText;
        }
        return acc;
      }, {});
    }

    // If it's already an object, ensure values are strings
    const result = {};
    Object.keys(responses).forEach(key => {
      const value = responses[key];
      console.log('Processing key:', key, 'value type:', typeof value);
      result[key] = typeof value === 'string'
        ? value
        : (value?.content || JSON.stringify(value) || '');
    });
    return result;
  }, [responses]);

  const modelNames = Object.keys(responsesObj);

  if (isLoading && modelNames.length === 0) {
    return (
      <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-sans font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 opacity-80">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
            Perspectives
          </h3>
        </div>
        <div className="bg-card border border-border/40 rounded-xl p-6 shadow-sm">
          <TextShimmer className="text-sm font-sans">
            Gathering initial perspectives from the council...
          </TextShimmer>
        </div>
      </div>
    );
  }

  if (modelNames.length === 0) {
    return null;
  }

  const currentResponse = responsesObj[modelNames[activeTab]] || '';
  console.log('Rendering markdown with:', typeof currentResponse, currentResponse.substring(0, 100));

  return (
    <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-sans font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 opacity-80">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
          Perspectives
        </h3>
      </div>

      <div className="bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm">
        {/* Tabs Header */}
        <div className="flex overflow-x-auto border-b border-border/40 bg-secondary/20 scrollbar-hide p-1 gap-1">
          {modelNames.map((name, idx) => (
            <button
              key={name}
              onClick={() => setActiveTab(idx)}
              className={`
                flex-shrink-0 px-3 py-1.5 text-xs font-medium transition-all rounded-lg font-sans
                ${activeTab === idx
                  ? 'bg-background text-foreground shadow-sm border border-border/50'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/50'}
              `}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="p-6 bg-card min-h-[150px]">
          <div className="markdown-content text-[15px] leading-relaxed text-foreground font-serif">
            <ReactMarkdown
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : 'text';

                  if (inline) {
                    return (
                      <code className={cn("bg-secondary/50 px-1.5 py-0.5 rounded text-sm font-mono text-primary", className)} {...props}>
                        {children}
                      </code>
                    );
                  }

                  return (
                    <div className="not-prose my-4 rounded-xl overflow-hidden border border-border/40 bg-card">
                      <CodeBlockCode
                        code={String(children).replace(/\n$/, '')}
                        language={language}
                        theme={theme === 'dark' ? 'github-dark' : 'github-light'}
                      />
                    </div>
                  );
                }
              }}
            >
              {currentResponse}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
