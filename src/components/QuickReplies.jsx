import './QuickReplies.css';

export default function QuickReplies({ options, onSelect, disabled }) {
  return (
    <div className="quick-replies" role="group" aria-label="Suggested messages">
      {options.map((text) => (
        <button
          key={text}
          type="button"
          className="quick-reply"
          onClick={() => onSelect(text)}
          disabled={disabled}
        >
          {text}
        </button>
      ))}
    </div>
  );
}
