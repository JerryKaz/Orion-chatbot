import BotAvatar from '../assets/bot-avatar.svg';
import { BOT_NAME } from '../bot/botBrain';
import './ChatHeader.css';

const Icon = ({ children, filled = false }) => (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    aria-hidden="true"
    fill={filled ? 'currentColor' : 'none'}
    stroke={filled ? 'none' : 'currentColor'}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {children}
  </svg>
);

const SunIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="4" fill="currentColor" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Icon>
);
const MoonIcon = () => (
  <Icon filled>
    <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />
  </Icon>
);
const TrashIcon = () => <Icon><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></Icon>;
const DownloadIcon = () => <Icon><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Icon>;
const HelpIcon = () => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.3M12 17h.01" />
  </Icon>
);
const MenuIcon = () => <Icon><path d="M4 6h16M4 12h16M4 18h16" /></Icon>;

function statusText(isTyping, ai) {
  if (isTyping) return 'typing…';
  if (ai.status === 'checking') return 'Connecting…';
  if (ai.status === 'online') return 'Online · AI assistant';
  return 'Offline mode · built-in skills';
}

export default function ChatHeader({ theme, onToggleTheme, onClearChat, onExport, onOpenSidebar, onStartTour, canExport, isTyping, ai }) {
  const isDark = theme === 'dark';
  return (
    <header className="chat-header">
      <div className="chat-header-identity">
        <button type="button" className="icon-button menu-button" onClick={onOpenSidebar} aria-label="Open conversations">
          <MenuIcon />
        </button>
        <span className="chat-header-avatar">
          <img src={BotAvatar} alt="" />
          <span className={`status-dot status-${ai.status}`} aria-hidden="true" />
        </span>
        <div className="chat-header-text">
          <h1 className="chat-header-name">{BOT_NAME}</h1>
          <p className="chat-header-status" aria-live="polite">{statusText(isTyping, ai)}</p>
        </div>
      </div>
      <div className="chat-header-actions">
        <button type="button" className="icon-button" onClick={onStartTour} aria-label="Take the tour" title="Take the tour">
          <HelpIcon />
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={onToggleTheme}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Light mode' : 'Dark mode'}
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </button>
        <button type="button" className="icon-button" onClick={onExport} disabled={!canExport} aria-label="Download conversation" title="Download as Markdown">
          <DownloadIcon />
        </button>
        <button type="button" className="icon-button" onClick={onClearChat} disabled={!canExport} aria-label="Delete conversation" title="Delete conversation">
          <TrashIcon />
        </button>
      </div>
    </header>
  );
}
