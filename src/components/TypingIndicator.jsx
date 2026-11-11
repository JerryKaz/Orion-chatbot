import BotAvatar from '../assets/bot-avatar.svg';
import { BOT_NAME } from '../bot/botBrain';

export default function TypingIndicator() {
  return (
    <div className="chat-message chat-message-robot" role="status" aria-label={`${BOT_NAME} is typing`}>
      <img src={BotAvatar} alt="" className="chat-message-profile" />
      <div className="chat-message-text typing-indicator">
        <span /><span /><span />
      </div>
    </div>
  );
}
