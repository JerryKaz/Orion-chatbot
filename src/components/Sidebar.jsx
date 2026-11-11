import './Sidebar.css';

function groupLabel(time) {
  const days = Math.floor((Date.now() - time) / 86_400_000);
  if (days < 1 && new Date(time).toDateString() === new Date().toDateString()) return 'Today';
  if (days < 2) return 'Yesterday';
  if (days < 7) return 'Previous 7 days';
  return 'Older';
}

export default function Sidebar({ conversations, activeId, open, onClose, onNewChat, onSelect, onDelete, busyId }) {
  let lastGroup = null;

  return (
    <>
      <div className={`sidebar-backdrop${open ? ' is-open' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`sidebar${open ? ' is-open' : ''}`} aria-label="Conversations">
        <button type="button" className="new-chat-button" onClick={onNewChat}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New chat
        </button>

        <nav className="conversation-list">
          {conversations.map((c) => {
            const group = groupLabel(c.updatedAt);
            const header = group !== lastGroup ? <p className="conversation-group">{group}</p> : null;
            lastGroup = group;
            return (
              <div key={c.id}>
                {header}
                <div className={`conversation-item${c.id === activeId ? ' is-active' : ''}`}>
                  <button
                    type="button"
                    className="conversation-select"
                    onClick={() => onSelect(c.id)}
                    aria-current={c.id === activeId ? 'page' : undefined}
                    title={c.title}
                  >
                    {busyId === c.id && <span className="conversation-busy" aria-label="replying" />}
                    {c.title}
                  </button>
                  <button
                    type="button"
                    className="conversation-delete"
                    onClick={() => onDelete(c.id)}
                    aria-label={`Delete "${c.title}"`}
                    disabled={busyId === c.id}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
