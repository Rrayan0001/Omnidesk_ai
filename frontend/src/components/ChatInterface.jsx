import { useState, useEffect, useRef, memo } from 'react';
import { Send, Loader2, PanelLeft, Trash2, Sparkles, Bot, Users, Cpu, Image as ImageIcon, Sun, Moon, Upload, X, FileText, ImageIcon as FileImage, Globe, Copy, Check, Square } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTheme } from "@/contexts/ThemeContext";
import RoomDetectionModal from './RoomDetectionModal';
import ToolsMenu from './ToolsMenu';
import Stage1 from './Stage1';
import Stage2 from './Stage2';
import Stage3 from './Stage3';
import { cn } from '@/lib/utils';
import { api } from '@/api';
import { TextShimmer } from '@/components/ui/text-shimmer';
import { TextGenerateEffect } from '@/components/ui/text-generate-effect';
import AnimatedMarkdown from '@/components/ui/animated-markdown';
import { CodeBlockCode } from '@/components/ui/code-block';

// Import chat models for display
const CHAT_MODELS = [
  { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B', provider: 'Groq' },
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'Groq' },
];

// Format timestamp like WhatsApp (smart date + time)
const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';

  const date = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  // Check if today
  if (messageDate.getTime() === today.getTime()) {
    return timeStr;
  }

  // Check if yesterday
  if (messageDate.getTime() === yesterday.getTime()) {
    return `Yesterday, ${timeStr}`;
  }

  // Check if this year
  if (date.getFullYear() === now.getFullYear()) {
    const dateStr = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
    return `${dateStr}, ${timeStr}`;
  }

  // Different year
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return `${dateStr}, ${timeStr}`;
};

// Copy button component
const CopyButton = ({ text, className = '' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "p-1 rounded-sm hover:bg-foreground/10 transition-colors",
        className
      )}
      title={copied ? "Copied!" : "Copy to clipboard"}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
      )}
    </button>
  );
};

// Memoized Message Component to prevent unnecessary re-renders
const MessageBubble = memo(({ msg, currentMode, theme }) => (
  <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
    {msg.role === 'user' ? (
      <div className="max-w-[90%] md:max-w-[85%] group">
        <div className="bg-primary text-primary-foreground px-3 md:px-5 py-2 md:py-3 border-2 md:border-3 border-foreground brutal-shadow text-sm md:text-[15px] leading-relaxed font-sans">
          {msg.content}
        </div>
        {/* User message footer: timestamp + copy */}
        <div className="flex items-center justify-end gap-2 mt-1 px-1">
          <CopyButton text={msg.content} />
          <span className="text-[10px] md:text-xs text-muted-foreground font-mono">
            {formatTimestamp(msg.timestamp)}
          </span>
        </div>
      </div>
    ) : (
      <div className="w-full min-w-0 max-w-[calc(100vw-4rem)] md:max-w-none space-y-4 md:space-y-6 overflow-x-hidden group">
        {/* Check message mode from metadata */}
        {
          msg.metadata?.mode === 'chat' || msg.metadata?.mode === 'image' || msg.metadata?.mode === 'file' ? (
            /* Simple Chat/Image/File Message Bubble */
            <div className="flex items-start gap-2 md:gap-4">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-secondary flex items-center justify-center shrink-0 border-2 border-foreground brutal-shadow-sm">
                {msg.metadata?.mode === 'image' ? (
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                ) : msg.metadata?.mode === 'file' ? (
                  <FileText className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                ) : (
                  <Bot className="w-4 h-4 md:w-5 md:h-5 text-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs md:text-sm font-bold font-sans text-foreground uppercase tracking-wider">
                    {msg.metadata?.model || (msg.metadata?.mode === 'image' ? 'Image Generator' : 'Assistant')}
                  </span>
                </div>

                {/* Show shimmer if no response content yet */}
                {!msg.stage3?.response && !msg.content ? (
                  <div className="mt-2 text-foreground font-mono text-sm flex items-center gap-2">
                    {msg.metadata?.isSearching ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
                        </svg>
                        <span className="animate-pulse">SEARCHING WEB...</span>
                      </>
                    ) : currentMode === 'image' ? (
                      'GENERATING IMAGE...'
                    ) : currentMode === 'file' ? (
                      'ANALYZING FILE...'
                    ) : (
                      'THINKING...'
                    )}
                  </div>
                ) : (
                  <>
                    {/* Streaming: raw text + blinking cursor */}
                    {msg.metadata?.isStreaming ? (
                      <div className="prose prose-sm max-w-none text-foreground leading-relaxed break-words overflow-hidden text-justify">
                        <div className="mb-4 leading-loose tracking-wide font-medium text-sm md:text-base break-words whitespace-pre-wrap text-justify">
                          {msg.stage3?.response || msg.content || ''}
                          <span className="inline-block w-[2px] h-[1.1em] bg-primary/80 align-middle ml-0.5 animate-[blink_0.7s_ease-in-out_infinite]" />
                        </div>
                      </div>
                    ) : (
                      /* Completed response: fast word-reveal for fresh non-streamed messages (max 400ms total) */
                      <AnimatedMarkdown
                        content={msg.stage3?.response || msg.content || ''}
                        animate={!!msg._isNew && !msg.metadata?.wasStreamed}
                        maxDuration={400}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            const language = match ? match[1] : 'text';
                            if (inline) {
                              return (
                                <code className={cn("bg-secondary px-1.5 py-0.5 border border-foreground text-xs md:text-sm font-mono text-primary font-bold break-all", className)} {...props}>
                                  {children}
                                </code>
                              );
                            }
                            return (
                              <div className="not-prose my-6 border-2 border-foreground brutal-shadow-sm bg-card w-full max-w-full overflow-hidden">
                                <div className="w-full overflow-x-auto">
                                  <CodeBlockCode
                                    code={String(children).replace(/\n$/, '')}
                                    language={language}
                                    theme={theme === 'dark' ? 'github-dark' : 'github-light'}
                                    className="whitespace-pre text-xs md:text-sm"
                                  />
                                </div>
                              </div>
                            );
                          },
                          table({ children }) {
                            return (
                              <div className="w-full my-6 border-2 border-foreground brutal-shadow-sm block">
                                <table className="w-full text-sm text-left table-auto break-words">{children}</table>
                              </div>
                            );
                          },
                          thead({ children }) {
                            return <thead className="bg-secondary text-xs uppercase font-bold text-foreground border-b-2 border-foreground">{children}</thead>;
                          },
                          th({ children }) {
                            return <th className="px-3 py-2 md:px-4 md:py-3 border-r-2 border-foreground last:border-r-0 align-top">{children}</th>;
                          },
                          td({ children }) {
                            return <td className="px-3 py-2 md:px-4 md:py-3 border-b-2 border-r-2 border-foreground/20 last:border-r-0 align-top break-words">{children}</td>;
                          },
                        }}
                      />
                    )}
                    {/* Assistant message footer: copy + timestamp */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-foreground/10">
                      <CopyButton text={msg.stage3?.response || msg.content || ''} />
                      <span className="text-[10px] md:text-xs text-muted-foreground font-mono">
                        {formatTimestamp(msg.timestamp)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            /* Council Mode UI */
            <>
              <div className="flex items-center gap-3 border-b-2 border-foreground pb-3 mb-4">
                <div className="w-8 h-8 bg-primary/10 text-primary border-2 border-foreground flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <span className="font-display text-sm font-bold tracking-widest text-foreground uppercase">LLM Council</span>
              </div>

              {/* Stage 1: Individual Responses */}
              {(msg.stage1 || msg.loading?.stage1) && (
                <Stage1
                  responses={msg.stage1}
                  isLoading={msg.loading?.stage1}
                />
              )}

              {/* Stage 2: Rankings */}
              {(msg.stage2 || msg.loading?.stage2) && (
                <Stage2
                  rankings={msg.stage2}
                  metadata={msg.metadata}
                  isLoading={msg.loading?.stage2}
                />
              )}

              {/* Stage 3: Final Verdict */}
              {(msg.stage3 || msg.loading?.stage3) && (
                <Stage3
                  finalResponse={msg.stage3}
                  isLoading={msg.loading?.stage3}
                  isNew={!!msg._isNew}
                />
              )}

              {/* Council timestamp */}
              {msg.timestamp && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-foreground/10">
                  <CopyButton text={msg.stage3?.response || ''} />
                  <span className="text-[10px] md:text-xs text-muted-foreground font-mono">
                    {formatTimestamp(msg.timestamp)}
                  </span>
                </div>
              )}
            </>
          )
        }
      </div>
    )}
  </div>
));

export default function ChatInterface({
  conversation,
  onSendMessage,
  onStop,
  isLoading,
  toggleSidebar,
  onDeleteConversation,
}) {
  const { theme, toggleTheme } = useTheme();
  const [input, setInput] = useState('');
  const [isSearchEnabled, setIsSearchEnabled] = useState(false);
  const [detectedRoom, setDetectedRoom] = useState(null);
  const [pendingMessage, setPendingMessage] = useState('');
  const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);
  const [isHoveringSidebarToggle, setIsHoveringSidebarToggle] = useState(false);
  const toolsButtonRef = useRef(null);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastSubmittedQueryRef = useRef('');

  // File upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [attachedFile, setAttachedFile] = useState(null); // {filename, extractedText, type}

  // Auto-resize textarea when input changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const [currentMode, setCurrentMode] = useState('chat'); // Default: 'chat' (was 'council')
  const [currentRoom, setCurrentRoom] = useState('decision');
  const [currentModel, setCurrentModel] = useState('openai/gpt-oss-120b'); // Default: GPT OSS 120B

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  const isSubmittingRef = useRef(false);

  const handleStop = () => {
    if (onStop) {
      onStop();
    }
    // Restore the query that was submitted so user can edit or re-run
    if (lastSubmittedQueryRef.current) {
      setInput(lastSubmittedQueryRef.current);
    }
    isSubmittingRef.current = false;
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 50);
  };

  const handleSubmit = async () => {
    const content = input.trim();
    if ((content || attachedFile) && !isLoading && !isSubmittingRef.current) {
      isSubmittingRef.current = true;
      lastSubmittedQueryRef.current = content; // Save query to restore if stopped
      setInput(''); // Clear input immediately to prevent double-submit race conditions

      // If we have an attached file, send as file mode
      if (attachedFile) {
        const fileContent = attachedFile.extractedText;
        const userPrompt = content || 'Please analyze this file and provide a summary.';

        onSendMessage(userPrompt, {
          mode: 'file',
          attachedFile: attachedFile
        });

        setAttachedFile(null); // Clear attachment after sending
        isSubmittingRef.current = false;
        return;
      }

      if (currentMode === 'council') {
        // Detect room first
        try {
          const detection = await api.detectRoom(content);
          setPendingMessage(content);
          setDetectedRoom(detection.detected_room);
        } catch (error) {
          console.error('Room detection failed:', error);
          // Fallback: send without detection
          onSendMessage(content, { mode: 'council', room: currentRoom });
        } finally {
          isSubmittingRef.current = false;
        }
      } else {
        // Chat or Image mode - send directly
        onSendMessage(content, {
          mode: currentMode,
          room: currentRoom,
          model: currentModel,
          forceSearch: isSearchEnabled
        });
        isSubmittingRef.current = false;
      }
    }
  };

  const handleProceedWithRoom = (room) => {
    if (pendingMessage) {
      onSendMessage(pendingMessage, { mode: 'council', room: room });
      setPendingMessage('');
      setDetectedRoom(null);
    }
  };

  const handleCancelDetection = () => {
    setInput(pendingMessage);
    setPendingMessage('');
    setDetectedRoom(null);
  };

  const hasMessages = conversation && conversation.messages.length > 0;

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      handleSubmit();
    }
  };

  // Handle file upload - stores as attachment, doesn't send immediately
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['.pdf', '.docx', '.pptx', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp'];
    const fileExt = '.' + file.name.split('.').pop().toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      setUploadError(`Unsupported file type. Allowed: PDF, DOCX, PPTX, PNG, JPEG, GIF, BMP, WEBP`);
      setTimeout(() => setUploadError(null), 5000);
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Extract file content using the backend
      const result = await api.extractFileContent(file);

      // Store as attachment - user will add message and send later
      setAttachedFile({
        filename: file.name,
        extractedText: result.text || result.analysis,
        type: result.type
      });

    } catch (error) {
      console.error('File upload error:', error);
      setUploadError(error.message || 'Failed to process file');
      setTimeout(() => setUploadError(null), 5000);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Trigger file picker when file mode is selected
  const handleModeChange = (mode, subItemId) => {
    if (mode === 'file') {
      // Trigger file picker
      fileInputRef.current?.click();
    } else {
      setCurrentMode(mode);
      if (mode === 'council' && subItemId) {
        setCurrentRoom(subItemId);
      } else if (mode === 'chat' && subItemId) {
        setCurrentModel(subItemId);
      }
    }
    setIsToolsMenuOpen(false);
  };

  return (
    <div className="flex-1 h-[100dvh] flex flex-col bg-background relative transition-colors duration-300">


      {/* Mode Banner */}
      {detectedRoom && (
        <RoomDetectionModal
          detectedRoom={detectedRoom}
          onProceed={handleProceedWithRoom}
          onCancel={handleCancelDetection}
        />
      )}

      {/* Mobile Header with Sidebar Toggle */}
      <div className="md:hidden flex items-center justify-between p-4 border-b-2 border-foreground bg-background z-50 fixed top-0 left-0 right-0 h-14">
        <div className="flex items-center">
          <button
            onClick={toggleSidebar}
            className="p-2 -ml-2 rounded-none hover:bg-secondary text-foreground transition-colors border border-transparent hover:border-foreground"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          <div className="ml-2 font-bold text-sm uppercase text-foreground tracking-widest">RayanAI</div>
        </div>
        <button
          onClick={toggleTheme}
          className="p-2 rounded-none hover:bg-secondary text-foreground transition-colors border border-transparent hover:border-foreground"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden flex flex-col pt-14 md:pt-0 bg-background">

        {/* Messages or Empty State */}
        <div className="flex-1 overflow-y-auto scroll-smooth">
          {!hasMessages ? (
            <div className="h-full flex flex-col items-center justify-center p-4 -mt-16 md:-mt-32">
              <div className="w-16 h-16 md:w-24 md:h-24 mb-4 md:mb-6 border-3 border-foreground brutal-shadow p-3 md:p-4 bg-secondary">
                <img
                  src={theme === 'dark' ? "/logo.png" : "/logo-light.png"}
                  alt="RayanAI"
                  className="w-full h-full object-contain"
                />
              </div>
              <TextGenerateEffect
                words="How can I help you today?"
                className="text-center px-4"
                textClassName="text-xl md:text-3xl font-black font-display tracking-tight text-foreground uppercase"
                duration={0.6}
                filter={true}
              />
            </div>
          ) : (
            <div className="max-w-5xl mx-auto p-2 md:p-8 space-y-6 md:space-y-8 pb-32">
              {conversation.messages.map((msg, idx) => (
                <MessageBubble
                  key={idx}
                  msg={msg}
                  currentMode={currentMode}
                  theme={theme}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area - Dynamic Positioning */}
        <div className={cn(
          "w-full z-10",
          hasMessages
            ? "bg-background border-t-3 border-foreground fixed bottom-0 left-0 right-0 md:relative md:p-6 md:bg-transparent md:border-t-0"
            : "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl px-3 md:px-4 mt-24 md:mt-20"
        )}>
          <div className={cn(
            "relative mx-auto",
            hasMessages ? "max-w-5xl w-full p-1.5 md:p-0" : "max-w-2xl"
          )}>
            <div className="relative flex items-center gap-1.5 md:gap-2 bg-background border-3 border-foreground brutal-shadow px-2 md:px-4 py-2 md:py-4">
              {/* AI Tools Button */}
              <button
                ref={toolsButtonRef}
                onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                className="shrink-0 p-2 h-10 w-10 flex items-center justify-center border-2 border-foreground bg-secondary hover:bg-primary text-foreground hover:text-primary-foreground transition-all duration-200 brutal-shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                title="AI Tools"
              >
                <Sparkles className="w-5 h-5" />
              </button>

              {/* Search Toggle Button */}
              <button
                type="button"
                onClick={() => setIsSearchEnabled(!isSearchEnabled)}
                className={cn(
                  "shrink-0 p-2 h-10 w-10 flex items-center justify-center border-2 border-foreground transition-all duration-200 brutal-shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none",
                  isSearchEnabled
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-primary text-foreground hover:text-primary-foreground"
                )}
                title={isSearchEnabled ? "Disable Web Search" : "Enable Web Search"}
              >
                <Globe className="w-5 h-5" />
              </button>

              {/* Tools Menu Dropdown */}
              {isToolsMenuOpen && (
                <div className="absolute left-0 bottom-full mb-4 z-20">
                  <ToolsMenu
                    isOpen={isToolsMenuOpen}
                    onClose={() => setIsToolsMenuOpen(false)}
                    currentMode={currentMode}
                    triggerRef={toolsButtonRef}
                    onModeChange={handleModeChange}
                  />
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.gif,.bmp,.webp"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Attached File Preview */}
              {attachedFile && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-accent border-2 border-foreground text-sm font-bold">
                  {attachedFile.type === 'image' ? (
                    <FileImage className="w-4 h-4 text-primary" />
                  ) : (
                    <FileText className="w-4 h-4 text-primary" />
                  )}
                  <span className="text-foreground max-w-[120px] truncate">{attachedFile.filename}</span>
                  <button
                    onClick={() => setAttachedFile(null)}
                    className="p-0.5 border border-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    title="Remove attachment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  // Auto-resize immediately on change
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                }}
                onKeyDown={handleKeyDown}
                placeholder="What can I help you with?"
                className="flex-1 bg-transparent border-0 focus:ring-0 resize-none min-h-[24px] max-h-[200px] text-base leading-relaxed font-mono placeholder:text-muted-foreground/70 scrollbar-hide outline-none py-1.5"
                rows={1}
              />

              {/* Send or Stop Button */}
              {isLoading ? (
                <button
                  type="button"
                  onClick={handleStop}
                  className="shrink-0 p-2 h-10 w-10 flex items-center justify-center bg-destructive text-destructive-foreground border-2 border-foreground hover:bg-destructive/90 transition-all duration-200 brutal-shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none cursor-pointer"
                  title="Stop search & generation"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!input.trim() && !attachedFile}
                  className="shrink-0 p-2 h-10 w-10 flex items-center justify-center bg-primary text-primary-foreground border-2 border-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 brutal-shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                  title="Send Message"
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5 ml-0.5" />
                  )}
                </button>
              )}
            </div>
            <div className="flex justify-between items-center mt-3 px-1">
              {uploadError && (
                <span className="text-xs font-bold text-destructive bg-destructive/10 px-2 py-0.5 border border-destructive animate-in fade-in">
                  {uploadError}
                </span>
              )}
              {isUploading && (
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5 animate-in fade-in">
                  <Loader2 className="w-3 h-3 animate-spin" /> UPLOADING...
                </span>
              )}
              {!uploadError && !isUploading && (
                <span className="text-xs font-black text-foreground/50 uppercase tracking-widest ml-auto font-mono">
                  {currentMode === 'council'
                    ? 'COUNCIL MODE'
                    : currentMode === 'image'
                      ? 'IMAGE GENERATION'
                      : CHAT_MODELS.find(m => m.id === currentModel)?.name.toUpperCase() || 'CHAT MODE'
                  }
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
