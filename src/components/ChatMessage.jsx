import { useEffect, useState } from 'react';
import BotAvatar from '../assets/bot-avatar.svg';
import UserProfileImage from '../assets/user.png';
import { BOT_NAME } from '../bot/botBrain';
import MarkdownMessage from './MarkdownMessage';
import './ChatMessage.css';

const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window;

function formatTime(time) {
  return time ? new Date(time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '';
}

/** Rough Markdown → plain text so the speech engine doesn't read out symbols. */
const toSpeech = (md) =>
  md.replace(/```[\s\S]*?```/g, ' (code block) ').replace(/[*_`#>|-]+/g, ' ').replace(/\[(.*?)\]\(.*?\)/g, '$1');

export function ChatMessage({
  message, sender, time, isGrouped = false, isStreaming = false, error = false,
  isLastBot = false, canRegenerate = false, onRegenerate,
}) {
  const [copied, setCopied] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const isUser = sender === 'user';

  // Stop speaking if this message unmounts (e.g. user switches chat).
  useEffect(() => () => { if (speaking) window.speechSynthesis.cancel(); }, [speaking]);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (e.g. non-HTTPS) */
    }
  }

  function toggleSpeak() {
    const synth = window.speechSynthesis;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(toSpeech(message));
    utterance.onend = utterance.onerror = () => setSpeaking(false);
    synth.speak(utterance);
    setSpeaking(true);
  }

  const avatar = (
    <img
      src={isUser ? UserProfileImage : BotAvatar}
      alt={isUser ? 'You' : BOT_NAME}
      className={`chat-message-profile${isGrouped ? ' is-hidden' : ''}`}
    />
  );

  const classes = [
    'chat-message',
    isUser ? 'chat-message-user' : 'chat-message-robot',
    isGrouped && 'is-grouped',
    error && 'is-error',
  ].filter(Boolean).join(' ');

  return (
    <div className={classes}>
      {!isUser && avatar}
      <div className="chat-message-body">
        <div className="chat-message-text">
          {isUser ? message : <MarkdownMessage text={message} isStreaming={isStreaming} />}
        </div>
        <div className="chat-message-meta">
          <time dateTime={time ? new Date(time).toISOString() : undefined}>{formatTime(time)}</time>
          {!isUser && !isStreaming && (
            <span className="message-actions">
              <button type="button" onClick={copyMessage} aria-label="Copy message">
                {copied ? 'Copied ✓' : 'Copy'}
              </button>
              {canSpeak && !error && (
                <button type="button" onClick={toggleSpeak} aria-pressed={speaking}>
                  {speaking ? 'Stop reading' : 'Read aloud'}
                </button>
              )}
              {isLastBot && canRegenerate && (
                <button type="button" onClick={onRegenerate}>
                  {error ? 'Retry' : 'Regenerate'}
                </button>
              )}
            </span>
          )}
        </div>
      </div>
      {isUser && avatar}
    </div>
  );
}
