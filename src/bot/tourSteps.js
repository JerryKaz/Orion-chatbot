import BotAvatar from '../assets/bot-avatar.svg';
import { BOT_NAME } from './botBrain';

/** Steps for the first-run guided tour. Targets that aren't visible (e.g. on mobile) are skipped. */
export function getTourSteps({ aiOnline }) {
  return [
    {
      image: BotAvatar,
      title: `Meet ${BOT_NAME} 👋`,
      body: aiOnline
        ? "I'm your AI assistant. Ask me questions, get writing help, explanations, ideas and quick maths. Here's a 30-second tour."
        : "I'm your assistant. I can do maths, tell the time and date, flip coins, tell jokes and more. Here's a 30-second tour.",
    },
    {
      target: '.chat-input-container',
      title: 'Type your message here',
      body: 'Press Enter to send and Shift + Enter for a new line. Tap the mic to speak instead of typing.',
    },
    {
      target: '.welcome-suggestions',
      title: 'Not sure what to ask?',
      body: 'Tap any suggestion to send it instantly. It’s the quickest way to see what I can do.',
    },
    {
      target: ['.new-chat-button', '.menu-button'],
      title: 'Keep chats organised',
      body: 'Start a new chat any time. Your past conversations are saved here so you can pick up where you left off.',
    },
    {
      target: '.chat-header-identity',
      title: aiOnline ? 'You’re connected to AI' : 'You’re in offline mode',
      body: aiOnline
        ? 'The green dot means I’m online. You’ll see “typing…” while I write, and you can press Stop or Esc to interrupt me.'
        : 'Without the AI server I answer with built-in skills. Once it’s connected, the dot turns green and I can answer almost anything.',
    },
    {
      target: '.chat-header-actions',
      title: 'Make it yours',
      body: 'Switch between light and dark mode, download a conversation, or delete it. Tap ? to replay this tour.',
    },
    {
      image: BotAvatar,
      title: 'You’re all set!',
      body: 'Tip: hover over (or tap) any reply to copy it, have it read aloud, or regenerate it. Say hi to get started.',
    },
  ];
}
