import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import './ChatInput.css';

const SpeechRecognition =
  typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

const MAX_CHARS = 4000;

export function ChatInput({ onSend, onStop, isBusy, canStop }) {
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const inputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Return focus to the input once the bot finishes replying.
  useEffect(() => {
    if (!isBusy) inputRef.current?.focus();
  }, [isBusy]);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  // Auto-grow the textarea up to a max height (set in CSS).
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [inputText]);

  function sendMessage() {
    if (!inputText.trim() || isBusy) return;
    recognitionRef.current?.stop();
    onSend(inputText);
    setInputText('');
  }

  function handleKeyDown(event) {
    // Enter sends, Shift+Enter adds a new line; ignore Enter while an IME is composing.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendMessage();
    } else if (event.key === 'Escape') {
      if (canStop) onStop();
      else setInputText('');
    }
  }

  function toggleVoice() {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = navigator.language || 'en-US';
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      setInputText(Array.from(event.results).map((r) => r[0].transcript).join(''));
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }

  const canSend = inputText.trim().length > 0 && !isBusy;
  const nearLimit = inputText.length > MAX_CHARS * 0.9;

  return (
    <div className="chat-input-container">
      <textarea
        ref={inputRef}
        rows={1}
        placeholder={isListening ? 'Listening…' : 'Message Ama…'}
        onChange={(e) => setInputText(e.target.value)}
        onKeyDown={handleKeyDown}
        value={inputText}
        className="chat-input"
        aria-label="Message"
        maxLength={MAX_CHARS}
        autoComplete="off"
      />
      {nearLimit && <span className="char-count">{MAX_CHARS - inputText.length}</span>}
      {SpeechRecognition && (
        <button
          type="button"
          onClick={toggleVoice}
          className={`mic-button${isListening ? ' is-listening' : ''}`}
          aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
          aria-pressed={isListening}
          title="Voice input"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" stroke="none" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </button>
      )}
      {canStop ? (
        <button type="button" onClick={onStop} className="send-button stop-button" aria-label="Stop generating" title="Stop (Esc)">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <rect x="5" y="5" width="14" height="14" rx="2.5" fill="currentColor" />
          </svg>
        </button>
      ) : (
        <button type="button" onClick={sendMessage} className="send-button" disabled={!canSend} aria-label="Send message">
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12.6 2-12.6 2z" />
          </svg>
        </button>
      )}
    </div>
  );
}
