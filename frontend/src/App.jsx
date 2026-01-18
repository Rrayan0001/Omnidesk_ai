import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import SignupReminderModal from './components/SignupReminderModal';
import { api } from './api';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { SearchUsageProvider, useSearchUsage } from './contexts/SearchUsageContext';

function Dashboard() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});
  const [showSignupReminder, setShowSignupReminder] = useState(false);
  const { incrementGoogleUsage, incrementAlphaVantageUsage, isAlphaVantageLimitReached } = useSearchUsage();
  const { demoMode, demoQueryCount, incrementDemoQueryCount, exitDemoMode } = useAuth();

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Load conversation details when selected
  useEffect(() => {
    if (currentConversationId) {
      loadConversation(currentConversationId);
    }
  }, [currentConversationId]);

  const loadConversations = async () => {
    try {
      const convs = await api.listConversations();
      setConversations(convs);

      // If no conversations exist, create one automatically
      if (convs.length === 0) {
        const newConv = await api.createConversation();
        setConversations([{ id: newConv.id, created_at: newConv.created_at, message_count: 0 }]);
        setCurrentConversationId(newConv.id);
      } else if (!currentConversationId) {
        // If conversations exist but none is selected, select the most recent
        setCurrentConversationId(convs[0].id);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadConversation = async (id) => {
    try {
      const conv = await api.getConversation(id);
      setCurrentConversation(conv);
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleNewConversation = async () => {
    // Prevent creating new conversation if current one is empty
    if (currentConversation && currentConversation.messages.length === 0) {
      return;
    }

    try {
      const newConv = await api.createConversation();
      setConversations([
        { id: newConv.id, created_at: newConv.created_at, message_count: 0 },
        ...conversations,
      ]);
      setCurrentConversationId(newConv.id);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  };

  const handleSelectConversation = (id) => {
    setCurrentConversationId(id);
  };

  const handleDeleteConversation = async (id) => {
    try {
      await api.deleteConversation(id);

      // Update conversations list
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);

      // If we deleted the current conversation, switch to the first available one or clear
      if (id === currentConversationId) {
        if (remaining.length > 0) {
          setCurrentConversationId(remaining[0].id);
        } else {
          setCurrentConversationId(null);
          setCurrentConversation(null);
        }
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      alert('Failed to delete conversation');
    }
  };

  // Buffer for streaming updates to prevent excessive re-renders
  const streamBufferRef = useRef({
    conversationId: null,
    pendingChunks: '',
    lastUpdateTime: 0,
    animationFrameId: null,
    isProcessing: false
  });

  // Helper function to handle stream events with buffering
  const handleStreamEvent = (conversationId, eventType, event) => {
    // Immediate updates for non-chunk events
    if (eventType !== 'chat_chunk') {
      // Flush any pending chunks first if we're switching events
      if (streamBufferRef.current.pendingChunks) {
        const chunksToFlush = streamBufferRef.current.pendingChunks;
        streamBufferRef.current.pendingChunks = '';

        setCurrentConversation((prev) => {
          if (prev?.id !== conversationId) return prev;
          const messages = [...prev.messages];
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            const currentContent = lastMsg.stage3?.response || lastMsg.content || '';
            const newContent = currentContent + chunksToFlush;
            lastMsg.stage3 = { ...lastMsg.stage3, response: newContent };
            lastMsg.content = newContent;
            lastMsg.metadata = { ...lastMsg.metadata, mode: 'chat' };
          }
          return { ...prev, messages };
        });
      }

      // Handle the non-chunk event normally
      switch (eventType) {
        case 'stage1_start':
          setCurrentConversation((prev) => {
            if (prev?.id !== conversationId) return prev;
            const messages = [...prev.messages];
            const lastMsgIndex = messages.length - 1;
            const lastMsg = messages[lastMsgIndex];
            if (lastMsg && lastMsg.role === 'assistant' && lastMsg.loading) {
              messages[lastMsgIndex] = {
                ...lastMsg,
                loading: { ...lastMsg.loading, stage1: true }
              };
            }
            return { ...prev, messages };
          });
          break;

        case 'stage1_complete':
          setCurrentConversation((prev) => {
            if (prev?.id !== conversationId) return prev;
            const messages = [...prev.messages];
            const lastMsgIndex = messages.length - 1;
            const lastMsg = messages[lastMsgIndex];
            if (lastMsg && lastMsg.role === 'assistant') {
              messages[lastMsgIndex] = {
                ...lastMsg,
                stage1: event.data,
                loading: lastMsg.loading ? { ...lastMsg.loading, stage1: false } : null
              };
            }
            return { ...prev, messages };
          });
          break;

        case 'stage2_start':
          setCurrentConversation((prev) => {
            if (prev?.id !== conversationId) return prev;
            const messages = [...prev.messages];
            const lastMsgIndex = messages.length - 1;
            const lastMsg = messages[lastMsgIndex];
            if (lastMsg && lastMsg.role === 'assistant' && lastMsg.loading) {
              messages[lastMsgIndex] = {
                ...lastMsg,
                loading: { ...lastMsg.loading, stage2: true }
              };
            }
            return { ...prev, messages };
          });
          break;

        case 'stage2_complete':
          setCurrentConversation((prev) => {
            if (prev?.id !== conversationId) return prev;
            const messages = [...prev.messages];
            const lastMsgIndex = messages.length - 1;
            const lastMsg = messages[lastMsgIndex];
            if (lastMsg && lastMsg.role === 'assistant') {
              messages[lastMsgIndex] = {
                ...lastMsg,
                stage2: event.data,
                metadata: event.metadata,
                loading: lastMsg.loading ? { ...lastMsg.loading, stage2: false } : null
              };
            }
            return { ...prev, messages };
          });
          break;

        case 'stage3_start':
          setCurrentConversation((prev) => {
            if (prev?.id !== conversationId) return prev;
            const messages = [...prev.messages];
            const lastMsgIndex = messages.length - 1;
            const lastMsg = messages[lastMsgIndex];
            if (lastMsg && lastMsg.role === 'assistant' && lastMsg.loading) {
              messages[lastMsgIndex] = {
                ...lastMsg,
                loading: { ...lastMsg.loading, stage3: true }
              };
            }
            return { ...prev, messages };
          });
          break;

        case 'stage3_complete':
          setCurrentConversation((prev) => {
            if (prev?.id !== conversationId) return prev;
            const messages = [...prev.messages];
            const lastMsgIndex = messages.length - 1;
            const lastMsg = messages[lastMsgIndex];
            if (lastMsg && lastMsg.role === 'assistant') {
              messages[lastMsgIndex] = {
                ...lastMsg,
                stage3: event.data,
                loading: null
              };
            }
            return { ...prev, messages };
          });
          break;

        case 'search_start':
          console.log('Web search started');
          setCurrentConversation((prev) => {
            if (prev?.id !== conversationId) return prev;
            const messages = [...prev.messages];
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.metadata = { ...lastMsg.metadata, isSearching: true };
            }
            return { ...prev, messages };
          });
          break;

        case 'search_complete':
          console.log('Search completed:', event.type, event.results?.length || event.historyDays || 0);
          setCurrentConversation((prev) => {
            if (prev?.id !== conversationId) return prev;
            const messages = [...prev.messages];
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.metadata = {
                ...lastMsg.metadata,
                isSearching: false,
                hasSearch: true,
                searchType: event.type,
                searchResults: event.results || null,
                financeSymbol: event.symbol || null
              };
            }
            return { ...prev, messages };
          });
          // Increment usage based on search type
          if (event.type === 'web') {
            incrementGoogleUsage();
          } else if (event.type === 'finance') {
            incrementAlphaVantageUsage();
          }
          break;

        case 'chat_start':
          console.log('Chat started with model:', event.model);
          setCurrentConversation((prev) => {
            if (prev?.id !== conversationId) return prev;
            const messages = [...prev.messages];
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.metadata = { ...lastMsg.metadata, mode: 'chat', model: event.model, isStreaming: true };
            }
            return { ...prev, messages };
          });
          break;

        case 'chat_complete':
          console.log('[DEBUG] chat_complete event received:', event);
          console.log('[DEBUG] event.data:', JSON.stringify(event.data, null, 2));
          setCurrentConversation((prev) => {
            if (prev?.id !== conversationId) {
              console.warn('[DEBUG] Conversation ID mismatch');
              return prev;
            }
            const messages = [...prev.messages];
            const lastMsgIndex = messages.length - 1;
            const lastMsg = messages[lastMsgIndex];
            console.log('[DEBUG] Last message before update:', JSON.stringify(lastMsg, null, 2));
            if (lastMsg && lastMsg.role === 'assistant') {
              console.log('[DEBUG] Updating assistant message with response');
              // Create a NEW message object (immutable update) to trigger React re-render
              messages[lastMsgIndex] = {
                ...lastMsg,
                stage3: event.data,
                content: event.data.response,
                metadata: { mode: 'chat', model: event.data.model, isStreaming: false },
                loading: null
              };
              console.log('[DEBUG] Last message after update:', JSON.stringify(messages[lastMsgIndex], null, 2));
            } else {
              console.error('[DEBUG] Last message is not assistant:', lastMsg);
            }
            return { ...prev, messages };
          });
          break;

        case 'image_start':
          console.log('Image generation started');
          break;

        case 'image_complete':
          setCurrentConversation((prev) => {
            if (prev?.id !== conversationId) return prev;
            const messages = [...prev.messages];
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              lastMsg.stage3 = event.data;
              lastMsg.metadata = { mode: 'image' };
            }
            return { ...prev, messages };
          });
          break;

        case 'title_complete':
          loadConversations();
          break;

        case 'complete':
          loadConversations();
          setLoadingStates(prev => ({ ...prev, [conversationId]: false }));
          break;

        case 'error':
          console.error('Stream error:', event.message);
          break;

        default:
          console.log('Unknown event type:', eventType);
      }
      return;
    }

    // Handle chat_chunk with buffering
    streamBufferRef.current.conversationId = conversationId;
    streamBufferRef.current.pendingChunks += (event.chunk || '');

    // Only update state if enough time has passed or not currently processing
    const now = Date.now();
    if (!streamBufferRef.current.isProcessing && (now - streamBufferRef.current.lastUpdateTime > 50)) { // 50ms throttle
      streamBufferRef.current.isProcessing = true;
      streamBufferRef.current.animationFrameId = requestAnimationFrame(() => {
        const chunksToFlush = streamBufferRef.current.pendingChunks;

        if (chunksToFlush) {
          streamBufferRef.current.pendingChunks = '';
          streamBufferRef.current.lastUpdateTime = Date.now();

          setCurrentConversation((prev) => {
            if (prev?.id !== conversationId) return prev;
            const messages = [...prev.messages];
            const lastMsg = messages[messages.length - 1];
            if (lastMsg && lastMsg.role === 'assistant') {
              const currentContent = lastMsg.stage3?.response || lastMsg.content || '';
              const newContent = currentContent + chunksToFlush;

              lastMsg.stage3 = { ...lastMsg.stage3, response: newContent };
              lastMsg.content = newContent;
              lastMsg.metadata = { ...lastMsg.metadata, mode: 'chat' };
            }
            return { ...prev, messages };
          });
        }
        streamBufferRef.current.isProcessing = false;
      });
    }
  };

  const handleSendMessage = async (content, options = {}) => {
    // Increment demo query count and show reminder after 7 queries
    if (demoMode) {
      const newCount = incrementDemoQueryCount();
      // Show reminder on 7th, 14th, 21st query etc.
      if (newCount === 7 || (newCount > 7 && newCount % 7 === 0)) {
        setShowSignupReminder(true);
      }
    }

    // Auto-create conversation if none exists
    if (!currentConversationId) {
      try {
        const newConv = await api.createConversation();
        setConversations([
          { id: newConv.id, created_at: newConv.created_at, message_count: 0 },
          ...conversations,
        ]);
        setCurrentConversationId(newConv.id);

        // Continue with sending the message using the new conversation ID
        const conversationId = newConv.id;

        // Handle legacy room argument if it's a string
        if (typeof options === 'string') {
          options = { room: options };
        }

        setLoadingStates(prev => ({ ...prev, [conversationId]: true }));

        try {
          // Optimistically add user message to UI
          const userMessage = { role: 'user', content, timestamp: new Date().toISOString() };

          // Create a partial assistant message
          const assistantMessage = {
            role: 'assistant',
            stage1: null,
            stage2: null,
            stage3: null,
            timestamp: new Date().toISOString(),
            metadata: {
              mode: options.mode || 'chat',
              model: options.model
            },
            loading: { stage1: false, stage2: false, stage3: false },
          };

          // Initialize conversation with both messages
          setCurrentConversation({
            id: conversationId,
            messages: [userMessage, assistantMessage],
            created_at: newConv.created_at
          });

          // Send message with streaming using the streaming callback
          await api.sendMessageStream(conversationId, content, { ...options, skipAlphaVantage: isAlphaVantageLimitReached() }, (eventType, event) => {
            handleStreamEvent(conversationId, eventType, event);
          });

          // Refresh conversation list to get title
          loadConversations();
        } catch (error) {
          console.error('Failed to send message:', error);
          setLoadingStates(prev => ({ ...prev, [conversationId]: false }));
        }
        return;
      } catch (error) {
        console.error('Failed to create conversation:', error);
        return;
      }
    }

    // Handle legacy room argument if it's a string
    if (typeof options === 'string') {
      options = { room: options };
    }

    // Handle file uploads with attached file analysis
    if (options.mode === 'file' && options.attachedFile) {
      const userMessage = { role: 'user', content };

      // Add user message and loading assistant message
      const loadingAssistantMessage = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        metadata: { mode: 'file', model: 'GPT OSS 120B' },
        loading: { stage1: false, stage2: false, stage3: true },
      };

      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage, loadingAssistantMessage],
      }));

      try {
        // Call the analyze endpoint with the pre-extracted text
        const analysisResult = await api.analyzeFileContent(
          options.attachedFile.extractedText,
          content,
          options.attachedFile.filename,
          options.attachedFile.type
        );

        // Update with the analysis result
        const finalAssistantMessage = {
          role: 'assistant',
          stage1: null,
          stage2: null,
          stage3: {
            model: analysisResult.model || 'GPT OSS 120B',
            response: analysisResult.analysis || 'Analysis complete.'
          },
          metadata: { mode: 'file', model: analysisResult.model || 'GPT OSS 120B' },
          loading: null,
        };

        setCurrentConversation((prev) => ({
          ...prev,
          messages: [...prev.messages.slice(0, -1), finalAssistantMessage],
        }));

      } catch (error) {
        console.error('File analysis error:', error);
        // Update with error message
        const errorMessage = {
          role: 'assistant',
          stage1: null,
          stage2: null,
          stage3: {
            model: 'GPT OSS 120B',
            response: `Sorry, I encountered an error analyzing your file: ${error.message}`
          },
          metadata: { mode: 'file', error: true },
          loading: null,
        };

        setCurrentConversation((prev) => ({
          ...prev,
          messages: [...prev.messages.slice(0, -1), errorMessage],
        }));
      }

      loadConversations();
      return;
    }

    // Check if this is the first message to trigger title refresh later
    const isFirstMessage = currentConversation?.messages.length === 0;

    setLoadingStates(prev => ({ ...prev, [currentConversationId]: true }));
    try {
      // Optimistically add user message to UI
      const userMessage = { role: 'user', content, timestamp: new Date().toISOString() };
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Create a partial assistant message
      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        timestamp: new Date().toISOString(),
        metadata: {
          mode: options.mode || 'chat',
          model: options.model
        },
        loading: { stage1: false, stage2: false, stage3: false },
      };

      // Add the partial assistant message
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // Send message with streaming
      await api.sendMessageStream(currentConversationId, content, { ...options, skipAlphaVantage: isAlphaVantageLimitReached() }, (eventType, event) => {
        handleStreamEvent(currentConversationId, eventType, event);
      });

      // If this was the first message, refresh the conversation list to get the new title
      if (isFirstMessage) {
        loadConversations();
      }

    } catch (error) {
      console.error('Failed to send message:', error);
      // Remove the optimistic messages on error
      setCurrentConversation((prev) => ({
        ...prev,
        messages: prev.messages.slice(0, -2),
      }));
    } finally {
      setLoadingStates(prev => ({ ...prev, [currentConversationId]: false }));
    }
  };

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-screen overflow-hidden bg-background">
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onSelectConversation={(id) => {
          handleSelectConversation(id);
          setIsSidebarOpen(false); // Auto-close on mobile/selection if desired, or keep open
        }}
        onNewConversation={() => {
          handleNewConversation();
          setIsSidebarOpen(false);
        }}
        onDeleteConversation={handleDeleteConversation}
        isOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />
      <ChatInterface
        conversation={currentConversation}
        onSendMessage={handleSendMessage}
        isLoading={loadingStates[currentConversationId] || false}
        isSidebarOpen={isSidebarOpen}
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        onDeleteConversation={() => currentConversationId && handleDeleteConversation(currentConversationId)}
      />

      {/* Signup Reminder Modal for demo users */}
      {showSignupReminder && demoMode && (
        <SignupReminderModal
          queryCount={demoQueryCount}
          onSignUp={() => {
            exitDemoMode();
            setShowSignupReminder(false);
          }}
          onDismiss={() => setShowSignupReminder(false)}
        />
      )}
    </div>
  );
}

function AppContent() {
  const { user, passwordRecoveryMode, demoMode } = useAuth();

  // If it's a password recovery flow (flagged by context), always show Auth component
  // This prevents redirecting to Dashboard immediately after OTP verification
  if (passwordRecoveryMode) {
    return <Auth />;
  }

  // Allow access if user is logged in OR in demo mode
  if (user || demoMode) {
    return <Dashboard />;
  }

  return <Auth />;
}

export default function App() {
  return (
    <AuthProvider>
      <SearchUsageProvider>
        <AppContent />
      </SearchUsageProvider>
    </AuthProvider>
  );
}
