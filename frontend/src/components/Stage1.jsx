import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

import { TextShimmer } from '@/components/ui/text-shimmer';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';
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
          <TextGenerateEffect
            words="Gathering initial perspectives from the council..."
            className="text-sm font-sans"
            textClassName="text-muted-foreground text-sm font-medium"
            duration={0.5}
          />
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
        <h3 className="text-xs font-sans font-bold text-muted-foreground flex items-center gap-2 opacity-80">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
          Perspectives
        </h3>
      </div>

      <div className="bg-card border-2 border-foreground brutal-shadow-sm p-4">
        {/* Tabs Header */}
        <div className="flex overflow-x-auto border-b-2 border-foreground bg-secondary/20 scrollbar-hide p-1 gap-1 mb-4">
          {modelNames.map((name, idx) => (
            <button
              key={name}
              onClick={() => setActiveTab(idx)}
              className={`
                flex-shrink-0 px-3 py-1.5 text-xs font-bold transition-all rounded-none font-mono uppercase tracking-wide
                ${activeTab === idx
                  ? 'bg-primary text-primary-foreground border-2 border-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background border-2 border-transparent hover:border-foreground'}
              `}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-card min-h-[150px]">
          <div className="markdown-content text-[15px] leading-relaxed text-foreground font-serif break-words overflow-wrap-anywhere overflow-x-hidden text-justify" style={{ wordWrap: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Use div instead of p to avoid nesting issues with code blocks
                p({ children }) {
                  return <div className="mb-4 leading-loose tracking-wide text-justify">{children}</div>;
                },
                li({ children }) {
                  return <li className="pl-1 font-medium text-justify mb-1">{children}</li>;
                },
                table({ children }) {
                  return <div className="overflow-x-auto my-6 border-2 border-foreground"><table className="w-full text-sm text-left">{children}</table></div>;
                },
                thead({ children }) {
                  return <thead className="bg-secondary text-xs uppercase font-bold text-foreground border-b-2 border-foreground">{children}</thead>;
                },
                th({ children }) {
                  return <th className="px-4 py-3 border-r-2 border-foreground last:border-r-0 whitespace-nowrap">{children}</th>;
                },
                td({ children }) {
                  return <td className="px-4 py-3 border-b-2 border-r-2 border-foreground/20 last:border-r-0">{children}</td>;
                },
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  const language = match ? match[1] : 'text';

                  if (inline) {
                    return (
                      <code className={cn("bg-secondary px-1.5 py-0.5 border border-foreground text-sm font-mono text-primary font-bold", className)} {...props}>
                        {children}
                      </code>
                    );
                  }

                  return (
                    <div className="not-prose my-6 border-2 border-foreground brutal-shadow-sm bg-card">
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
