import { useState, useEffect, useRef, memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * AnimatedMarkdown — renders markdown text with a smooth word-by-word
 * reveal animation. Each word appears sequentially, giving the feel of a live AI typing experience.
 *
 * Props:
 *  - content (string): The full markdown text to animate.
 *  - animate (bool):   true  → play the word-reveal animation (new messages).
 *                      false → show content instantly (history / page refresh / streamed).
 *  - maxDuration (ms): Maximum total animation duration for the entire text. Default: 400ms.
 *  - components (object): Optional extra ReactMarkdown component overrides.
 *  - className (string): Wrapper class.
 *  - onComplete (fn): Called when animation finishes.
 */
const AnimatedMarkdown = memo(({
  content = "",
  animate = true,       // false = instant render (history / live-streamed)
  maxDuration = 400,   // Cap total animation time at 400ms max
  components = {},
  className = "",
  onComplete,
}) => {
  const words = content.split(/(\s+)/); // split preserving whitespace tokens
  const totalTokens = words.length;

  // If animate=false, start fully visible; otherwise start hidden
  const [visibleCount, setVisibleCount] = useState(() => animate ? 0 : totalTokens);
  const intervalRef = useRef(null);
  const prevContentRef = useRef("");

  useEffect(() => {
    if (!content) return;

    // If not animating, show everything immediately
    if (!animate) {
      setVisibleCount(totalTokens);
      prevContentRef.current = content;
      return;
    }

    // If content changed, calculate dynamic steps to finish within maxDuration
    if (content !== prevContentRef.current) {
      prevContentRef.current = content;

      if (intervalRef.current) clearInterval(intervalRef.current);

      // Target ~30 ticks max over maxDuration (e.g. 400ms), i.e. ~13ms per tick
      const targetTicks = Math.min(30, Math.max(8, totalTokens));
      const stepSize = Math.max(1, Math.ceil(totalTokens / targetTicks));
      const intervalMs = Math.max(10, Math.floor(maxDuration / targetTicks));

      let count = 0;
      intervalRef.current = setInterval(() => {
        count += stepSize;
        if (count >= totalTokens) {
          count = totalTokens;
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          if (onComplete) onComplete();
        }
        setVisibleCount(count);
      }, intervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, animate, maxDuration]);

  // The visible portion of the text, rebuilt from word tokens
  const visibleText = words.slice(0, visibleCount).join("");

  return (
    <div className={cn("animated-markdown", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table({ children }) {
            return (
              <div className="w-full my-6 border-2 border-foreground brutal-shadow-sm block">
                <table className="w-full text-sm text-left table-auto break-words">{children}</table>
              </div>
            );
          },
          p({ children }) {
            return (
              <div className="mb-4 leading-loose tracking-wide font-medium text-sm md:text-base break-words text-justify">
                {children}
              </div>
            );
          },
          li({ children }) {
            return <li className="pl-1 font-medium text-justify mb-1">{children}</li>;
          },
          ul({ children }) {
            return <ul className="list-disc list-outside ml-5 my-3 space-y-1 marker:text-primary">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-outside ml-5 my-3 space-y-1 marker:text-primary">{children}</ol>;
          },
          h1({ children }) {
            return <h1 className="text-2xl font-black mt-6 mb-3 first:mt-0 uppercase tracking-tight">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-xl font-bold mt-5 mb-2 uppercase">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 bg-secondary/30 font-medium italic">
                {children}
              </blockquote>
            );
          },
          strong({ children }) {
            return <strong className="font-bold text-foreground">{children}</strong>;
          },
          ...components,
        }}
      >
        {visibleText}
      </ReactMarkdown>

      {/* Blinking cursor — only while animating a new message */}
      {animate && visibleCount < words.length && (
        <span className="inline-block w-[2px] h-[1.1em] bg-primary/80 align-middle ml-0.5 animate-[blink_0.7s_ease-in-out_infinite]" />
      )}
    </div>
  );
});

AnimatedMarkdown.displayName = "AnimatedMarkdown";
export default AnimatedMarkdown;
