import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';

const MAX_CONVERSATIONS = 50;
const MAX_MESSAGES_PER_CONVERSATION = 200;

const newConversation = () => ({
  id: crypto.randomUUID(),
  title: 'New chat',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [],
});

function makeTitle(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > 42 ? `${clean.slice(0, 40)}…` : clean || 'New chat';
}

/** Initial state, migrating the single-chat history from the previous version if present. */
function loadInitialStore() {
  const conversation = newConversation();
  try {
    const legacy = JSON.parse(localStorage.getItem('chatbot.messages.v1') || '[]');
    if (Array.isArray(legacy) && legacy.length) {
      conversation.messages = legacy;
      const firstUser = legacy.find((m) => m.sender === 'user');
      if (firstUser) conversation.title = makeTitle(firstUser.message);
      // Not removed here: React StrictMode runs initializers twice in dev, which would lose the data.
    }
  } catch {
    /* ignore */
  }
  return { activeId: conversation.id, conversations: [conversation] };
}

export function useConversations() {
  const [store, setStore] = useLocalStorage('chatbot.conversations.v1', loadInitialStore);

  const active = useMemo(
    () => store.conversations.find((c) => c.id === store.activeId) ?? store.conversations[0],
    [store],
  );

  /** Update one conversation's messages by id (safe even if the user switched chats mid-reply). */
  const updateMessages = useCallback((conversationId, updater) => {
    setStore((prev) => ({
      ...prev,
      conversations: prev.conversations.map((c) => {
        if (c.id !== conversationId) return c;
        const messages = updater(c.messages).slice(-MAX_MESSAGES_PER_CONVERSATION);
        const firstUser = messages.find((m) => m.sender === 'user');
        const title = c.title === 'New chat' && firstUser ? makeTitle(firstUser.message) : c.title;
        return { ...c, messages, title, updatedAt: Date.now() };
      }),
    }));
  }, [setStore]);

  const newChat = useCallback(() => {
    setStore((prev) => {
      const current = prev.conversations.find((c) => c.id === prev.activeId);
      if (current && current.messages.length === 0) return prev; // already on an empty chat
      const created = newConversation();
      return {
        activeId: created.id,
        conversations: [created, ...prev.conversations].slice(0, MAX_CONVERSATIONS),
      };
    });
  }, [setStore]);

  const selectChat = useCallback((id) => setStore((prev) => ({ ...prev, activeId: id })), [setStore]);

  const deleteChat = useCallback((id) => {
    setStore((prev) => {
      const remaining = prev.conversations.filter((c) => c.id !== id);
      if (remaining.length === 0) {
        const created = newConversation();
        return { activeId: created.id, conversations: [created] };
      }
      const activeId = prev.activeId === id ? remaining[0].id : prev.activeId;
      return { activeId, conversations: remaining };
    });
  }, [setStore]);

  const sorted = useMemo(
    () => [...store.conversations].sort((a, b) => b.updatedAt - a.updatedAt),
    [store.conversations],
  );

  return { conversations: sorted, active, updateMessages, newChat, selectChat, deleteChat };
}
