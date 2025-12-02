import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatInterface from './components/ChatInterface';
import { api } from './api';

function App() {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [loadingStates, setLoadingStates] = useState({});

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

  // Helper function to handle stream events
  const handleStreamEvent = (conversationId, eventType, event) => {
    switch (eventType) {
      case 'stage1_start':
        setCurrentConversation((prev) => {
          if (prev?.id !== conversationId) return prev;
          const messages = [...prev.messages];
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.loading) {
            lastMsg.loading.stage1 = true;
          }
          return { ...prev, messages };
        });
        break;

      case 'stage1_complete':
        setCurrentConversation((prev) => {
          if (prev?.id !== conversationId) return prev;
          const messages = [...prev.messages];
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.stage1 = event.data;
            if (lastMsg.loading) lastMsg.loading.stage1 = false;
          }
          return { ...prev, messages };
        });
        break;

      case 'stage2_start':
        setCurrentConversation((prev) => {
          if (prev?.id !== conversationId) return prev;
          const messages = [...prev.messages];
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.loading) {
            lastMsg.loading.stage2 = true;
          }
          return { ...prev, messages };
        });
        break;

      case 'stage2_complete':
        setCurrentConversation((prev) => {
          if (prev?.id !== conversationId) return prev;
          const messages = [...prev.messages];
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.stage2 = event.data;
            lastMsg.metadata = event.metadata;
            if (lastMsg.loading) lastMsg.loading.stage2 = false;
          }
          return { ...prev, messages };
        });
        break;

      case 'stage3_start':
        setCurrentConversation((prev) => {
          if (prev?.id !== conversationId) return prev;
          const messages = [...prev.messages];
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant' && lastMsg.loading) {
            lastMsg.loading.stage3 = true;
          }
          return { ...prev, messages };
        });
        break;

      case 'stage3_complete':
        setCurrentConversation((prev) => {
          if (prev?.id !== conversationId) return prev;
          const messages = [...prev.messages];
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.stage3 = event.data;
            if (lastMsg.loading) lastMsg.loading.stage3 = false;
          }
          return { ...prev, messages };
        });
        break;

      case 'chat_start':
        // Chat mode started
        console.log('Chat started with model:', event.model);
        break;

      case 'chat_complete':
        // Chat mode complete
        setCurrentConversation((prev) => {
          if (prev?.id !== conversationId) return prev;
          const messages = [...prev.messages];
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.stage3 = event.data; // Store in stage3 for compatibility
            lastMsg.metadata = { mode: 'chat', model: event.data.model };
          }
          return { ...prev, messages };
        });
        break;

      case 'image_start':
        // Image generation started
        console.log('Image generation started');
        break;

      case 'image_complete':
        // Image generation complete
        setCurrentConversation((prev) => {
          if (prev?.id !== conversationId) return prev;
          const messages = [...prev.messages];
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            lastMsg.stage3 = event.data; // Store in stage3 for compatibility
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
  };

  const handleSendMessage = async (content, options = {}) => {
    // Auto-create conversation if none exists
    if (!currentConversationId) {
      try {
        const newConv = await api.createConversation();
        setConversations([
          { id: newConv.id, created_at: newConv.created_at, message_count: 0 },
          ...conversations,
        ]);
        setCurrentConversationId(newConv.id);
        setCurrentConversation({ id: newConv.id, messages: [], created_at: newConv.created_at });

        // Continue with sending the message using the new conversation ID
        const conversationId = newConv.id;

        // Handle legacy room argument if it's a string
        if (typeof options === 'string') {
          options = { room: options };
        }

        setLoadingStates(prev => ({ ...prev, [conversationId]: true }));

        try {
          // Optimistically add user message to UI
          const userMessage = { role: 'user', content };
          setCurrentConversation(prev => ({
            ...prev,
            messages: [userMessage]
          }));

          // Create a partial assistant message
          const assistantMessage = {
            role: 'assistant',
            stage1: null,
            stage2: null,
            stage3: null,
            metadata: null,
            loading: { stage1: false, stage2: false, stage3: false },
          };

          setCurrentConversation(prev => ({
            ...prev,
            messages: [...prev.messages, assistantMessage]
          }));

          // Send message with streaming using the streaming callback
          await api.sendMessageStream(conversationId, content, options, (eventType, event) => {
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

    // Check if this is the first message to trigger title refresh later
    const isFirstMessage = currentConversation?.messages.length === 0;

    setLoadingStates(prev => ({ ...prev, [currentConversationId]: true }));
    try {
      // Optimistically add user message to UI
      const userMessage = { role: 'user', content };
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, userMessage],
      }));

      // Create a partial assistant message that will be updated progressively
      const assistantMessage = {
        role: 'assistant',
        stage1: null,
        stage2: null,
        stage3: null,
        metadata: null,
        loading: {
          stage1: false,
          stage2: false,
          stage3: false,
        },
      };

      // Add the partial assistant message
      setCurrentConversation((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
      }));

      // Send message with streaming
      await api.sendMessageStream(currentConversationId, content, options, (eventType, event) => {
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
    <div className="flex h-screen w-screen overflow-hidden bg-background">
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
    </div>
  );
}

export default App;
