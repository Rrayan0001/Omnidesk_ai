import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

import { TextShimmer } from '@/components/ui/text-shimmer';
import { CodeBlockCode } from '@/components/ui/code-block';
import { useTheme } from "@/contexts/ThemeContext";

export default function Stage2({ rankings, labelToModel, aggregateRankings, isLoading }) {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState(0);

  // Convert array format [{model, ranking}] to object {model: ranking}
  // And ensure all values are strings
  const rankingsObj = useMemo(() => {
    if (!rankings) return {};

    if (Array.isArray(rankings)) {
      return rankings.reduce((acc, item) => {
        if (item && item.model) {
          // Make sure ranking is a string
          const rankingText = typeof item.ranking === 'string'
            ? item.ranking
            : (item.ranking?.content || JSON.stringify(item.ranking) || '');
          acc[item.model] = rankingText;
        }
        return acc;
      }, {});
    }

    // If it's already an object, ensure values are strings
    const result = {};
    Object.keys(rankings).forEach(key => {
      const value = rankings[key];
      result[key] = typeof value === 'string'
        ? value
        : (value?.content || JSON.stringify(value) || '');
    });
    return result;
  }, [rankings]);

  const rankerNames = Object.keys(rankingsObj);

  if (isLoading && rankerNames.length === 0) {
    return (
      <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-sans font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2 opacity-80">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
            Analysis
          </h3>
        </div>
        <div className="bg-card border border-border/40 rounded-xl p-6 shadow-sm">
          <TextShimmer className="text-sm font-sans">
            Council members are reviewing and ranking responses...
          </TextShimmer>
        </div>
      </div>
    );
  }

  if (rankerNames.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-sans font-bold text-muted-foreground flex items-center gap-2 opacity-80">
          <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
          Analysis
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Aggregate Rankings Card */}
        {aggregateRankings && aggregateRankings.length > 0 && (
          <div className="lg:col-span-1 bg-card border-2 border-foreground brutal-shadow-sm p-4 h-fit">
            <div className="bg-secondary px-4 py-3 border-b-2 border-foreground mb-4">
              <h4 className="text-xs font-black text-foreground uppercase tracking-widest font-mono">
                Leaderboard
              </h4>
            </div>
            <div className="divide-y-2 divide-foreground/20">
              {aggregateRankings.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 hover:bg-secondary transition-colors"
                >
                  <div className={`
                    w-6 h-6 flex items-center justify-center text-xs font-bold border-2
                    ${idx === 0 ? 'bg-primary text-primary-foreground border-foreground' :
                      'bg-secondary text-muted-foreground border-foreground'}
                  `}>
                    {idx + 1}
                  </div>
                  <span className="flex-1 text-sm font-bold truncate font-mono uppercase">
                    {labelToModel ? labelToModel[item.label] : item.label}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground opacity-70">
                    {item.count} votes
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Reviews */}
        <div className="lg:col-span-2 bg-card border-2 border-foreground brutal-shadow-sm p-4">
          <div className="flex overflow-x-auto border-b-2 border-foreground bg-secondary/20 scrollbar-hide p-1 gap-1 mb-4">
            {rankerNames.map((name, idx) => (
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

          <div className="bg-card min-h-[150px]">
            <div className="markdown-content text-[15px] leading-relaxed text-foreground font-serif break-words overflow-wrap-anywhere overflow-x-hidden" style={{ wordWrap: 'break-word', overflowWrap: 'anywhere', maxWidth: '100%' }}>
              <ReactMarkdown
                components={{
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
                {String(rankingsObj[rankerNames[activeTab]] || '')}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
