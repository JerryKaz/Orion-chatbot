import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import BotAvatar from '../assets/bot-avatar.svg';
import { BOT_NAME } from '../bot/botBrain';
import './ChatMessages.css';

function WelcomeScreen({ onSuggestion, suggestions, aiOnline }) {
  return (
    <div className="welcome">
      <img src={BotAvatar} alt="" className="welcome-avatar" />
      <h2>Hi, I'm {BOT_NAME} 👋</h2>
      <p>
        {aiOnline
          ? 'Ask me anything: explanations, writing help, ideas, maths and more. Try one of these:'
          : 'I can tell you the date and time, do quick maths, flip a coin, roll a dice, tell jokes and more. Try one of these:'}
      </p>
      <div className="welcome-suggestions">
        {suggestions.map((text) => (
          <button key={text} type="button" className="suggestion-card" onClick={() => onSuggestion(text)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

function dayLabel(time) {
  const d = new Date(time);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function ChatMessages({
  chatMessages, showTyping, streamingId, onSuggestion, onRegenerate, canRegenerate, suggestions, aiOnline,
}) {
  const containerRef = useRef(null);
  const endRef = useRef(null);
  const stickToBottom = useRef(true);

  // Only auto-scroll if the user is already near the bottom, so they can read back while a reply streams.
  function handleScroll() {
    const el = containerRef.current;
    if (el) stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  useEffect(() => {
    if (stickToBottom.current) endRef.current?.scrollIntoView({ block: 'end' });
  }, [chatMessages, showTyping]);

  if (chatMessages.length === 0) {
    return (
      <main className="chat-messages-container">
        <WelcomeScreen onSuggestion={onSuggestion} suggestions={suggestions} aiOnline={aiOnline} />
      </main>
    );
  }

  const lastBotId = chatMessages.findLast((m) => m.sender === 'robot')?.id;

  return (
    <main
      className="chat-messages-container"
      ref={containerRef}
      onScroll={handleScroll}
      aria-live="polite"
      aria-label="Conversation"
    >
      {chatMessages.map((chatMessage, index) => {
        // The empty placeholder for a streaming reply is shown as the typing indicator instead.
        if (chatMessage.id === streamingId && !chatMessage.message) return null;
        const prev = chatMessages[index - 1];
        const showDay = chatMessage.time && (!prev?.time || !sameDay(prev.time, chatMessage.time));
        // Group consecutive messages from the same sender: only the first shows an avatar.
        const isGrouped = prev?.sender === chatMessage.sender && !showDay;
        return (
          <div key={chatMessage.id}>
            {showDay && <div className="day-divider"><span>{dayLabel(chatMessage.time)}</span></div>}
            <ChatMessage
              message={chatMessage.message}
              sender={chatMessage.sender}
              time={chatMessage.time}
              isGrouped={isGrouped}
              isStreaming={chatMessage.id === streamingId}
              error={chatMessage.error}
              isLastBot={chatMessage.id === lastBotId}
              canRegenerate={canRegenerate}
              onRegenerate={onRegenerate}
            />
          </div>
        );
      })}
      {showTyping && <TypingIndicator />}
      <div ref={endRef} />
    </main>
  );
}

export default ChatMessages;
