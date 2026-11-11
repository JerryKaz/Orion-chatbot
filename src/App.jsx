import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChatHeader from './components/ChatHeader';
import ChatMessages from './components/ChatMessages';
import QuickReplies from './components/QuickReplies';
import Sidebar from './components/Sidebar';
import GuidedTour from './components/GuidedTour';
import { getTourSteps } from './bot/tourSteps';
import { ChatInput } from './components/ChatInput';
import { getBotReply, getQuickSkillReply, QUICK_REPLIES, AI_SUGGESTIONS, BOT_NAME } from './bot/botBrain';
import { checkHealth, streamChat, ChatApiError } from './api/chatApi';
import { useConversations } from './hooks/useConversations';
import { useLocalStorage } from './hooks/useLocalStorage';
import './App.css';

const createMessage = (message, sender, extra = {}) => ({
  id: crypto.randomUUID(),
  message,
  sender,
  time: Date.now(),
  ...extra,
});

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const getInitialTheme = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

/** Converts chat history into the shape the API expects, skipping failed replies. */
const toApiHistory = (messages) =>
  messages
    .filter((m) => !m.error && m.message)
    .map((m) => ({ role: m.sender === 'user' ? 'user' : 'model', text: m.message }));

function exportConversation(conversation) {
  const lines = [`# ${conversation.title}`, ''];
  for (const m of conversation.messages) {
    const who = m.sender === 'user' ? 'You' : BOT_NAME;
    lines.push(`**${who}** · ${new Date(m.time).toLocaleString()}`, '', m.message, '');
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), {
    href: url,
    download: `${conversation.title.replace(/[^\w\- ]+/g, '').trim() || 'chat'}.md`,
  });
  a.click();
  URL.revokeObjectURL(url);
}

function App() {
  const { conversations, active, updateMessages, newChat, selectChat, deleteChat } = useConversations();
  const [theme, setTheme] = useLocalStorage('chatbot.theme', getInitialTheme);
  const [ai, setAi] = useState({ status: 'checking', model: null });
  const [pending, setPending] = useState(null); // { conversationId, messageId } while replying
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tourSeen, setTourSeen] = useLocalStorage('chatbot.tourSeen.v1', false);
  const [tourOpen, setTourOpen] = useState(false);
  const abortRef = useRef(null);

  const isBusy = pending !== null;
  const aiOnline = ai.status === 'online';

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    checkHealth().then((h) => setAi({ status: h.ai ? 'online' : 'offline', model: h.model ?? null }));
  }, []);

  // Auto-start the tour once for first-time visitors, after we know whether AI is online.
  useEffect(() => {
    if (tourSeen || ai.status === 'checking') return;
    const timer = setTimeout(() => setTourOpen(true), 500);
    return () => clearTimeout(timer);
  }, [tourSeen, ai.status]);

  const tourSteps = useMemo(() => getTourSteps({ aiOnline }), [aiOnline]);

  const startTour = () => {
    setSidebarOpen(false);
    if (active.messages.length) newChat(); // the tour points at the welcome screen's suggestions
    setTimeout(() => setTourOpen(true), 50);
  };

  const closeTour = useCallback(() => {
    setTourOpen(false);
    setTourSeen(true);
  }, [setTourSeen]);

  /** Generates a bot reply for `history` (which must end with the user's message). */
  const respond = useCallback(async (conversationId, history) => {
    const userText = history.at(-1).message;
    const botMessage = createMessage('', 'robot');
    const patchBot = (patch) =>
      updateMessages(conversationId, (msgs) =>
        msgs.map((m) => (m.id === botMessage.id ? { ...m, ...(typeof patch === 'function' ? patch(m) : patch) } : m)),
      );

    updateMessages(conversationId, (msgs) => [...msgs, botMessage]);
    setPending({ conversationId, messageId: botMessage.id });

    try {
      const quick = getQuickSkillReply(userText);
      if (quick || !aiOnline) {
        await wait(400 + Math.random() * 400); // feels natural, keeps the typing indicator visible
        patchBot({ message: quick ?? getBotReply(userText), source: 'local' });
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      try {
        await streamChat({
          messages: toApiHistory(history),
          signal: controller.signal,
          onText: (chunk) => patchBot((m) => ({ message: m.message + chunk, source: 'ai' })),
        });
      } catch (err) {
        if (controller.signal.aborted) {
          patchBot((m) => ({ message: m.message || '_Stopped._', stopped: true }));
        } else if (err instanceof ChatApiError) {
          patchBot({ message: err.message, error: true });
        } else {
          // Server unreachable: fall back to offline skills so the user still gets an answer.
          setAi({ status: 'offline', model: null });
          patchBot({
            message: `${getBotReply(userText)}\n\n_(The AI server is unreachable, so I answered in offline mode.)_`,
            source: 'local',
          });
        }
      }
    } finally {
      abortRef.current = null;
      setPending(null);
    }
  }, [aiOnline, updateMessages]);

  const sendMessage = useCallback((text) => {
    const trimmed = text.trim();
    if (!trimmed || isBusy) return;
    const userMessage = createMessage(trimmed, 'user');
    const history = [...active.messages, userMessage];
    updateMessages(active.id, () => history);
    respond(active.id, history);
  }, [active, isBusy, respond, updateMessages]);

  const regenerate = useCallback(() => {
    if (isBusy) return;
    const msgs = active.messages;
    const lastUserIndex = msgs.findLastIndex((m) => m.sender === 'user');
    if (lastUserIndex === -1) return;
    const history = msgs.slice(0, lastUserIndex + 1);
    updateMessages(active.id, () => history);
    respond(active.id, history);
  }, [active, isBusy, respond, updateMessages]);

  const stop = () => abortRef.current?.abort();

  function clearChat() {
    if (active.messages.length && window.confirm('Delete this conversation?')) deleteChat(active.id);
  }

  const replyingHere = pending?.conversationId === active.id;
  const streamingMessage = replyingHere ? active.messages.find((m) => m.id === pending.messageId) : null;
  const showTyping = replyingHere && !streamingMessage?.message;

  return (
    <div className="app-shell">
      <Sidebar
        conversations={conversations}
        activeId={active.id}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNewChat={() => { newChat(); setSidebarOpen(false); }}
        onSelect={(id) => { selectChat(id); setSidebarOpen(false); }}
        onDelete={(id) => { if (window.confirm('Delete this conversation?')) deleteChat(id); }}
        busyId={pending?.conversationId}
      />

      <div className="app-container">
        <ChatHeader
          theme={theme}
          onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          onClearChat={clearChat}
          onExport={() => exportConversation(active)}
          onOpenSidebar={() => setSidebarOpen(true)}
          onStartTour={startTour}
          canExport={active.messages.length > 0}
          isTyping={replyingHere}
          ai={ai}
        />
        <ChatMessages
          chatMessages={active.messages}
          showTyping={showTyping}
          streamingId={replyingHere ? pending.messageId : null}
          onSuggestion={sendMessage}
          onRegenerate={regenerate}
          canRegenerate={!isBusy}
          suggestions={aiOnline ? AI_SUGGESTIONS : QUICK_REPLIES.slice(0, 6)}
          aiOnline={aiOnline}
        />
        <footer className="chat-footer">
          {active.messages.length > 0 && !aiOnline && (
            <QuickReplies options={QUICK_REPLIES} onSelect={sendMessage} disabled={isBusy} />
          )}
          <ChatInput onSend={sendMessage} onStop={stop} isBusy={isBusy} canStop={replyingHere && aiOnline} />
          <p className="chat-disclaimer">
            {aiOnline
              ? `${BOT_NAME} uses AI and can make mistakes. Check important info.`
              : 'Offline mode: answering with built-in skills.'}
          </p>
        </footer>
      </div>

      <GuidedTour steps={tourSteps} open={tourOpen} onClose={closeTour} />
    </div>
  );
}

export default App;
