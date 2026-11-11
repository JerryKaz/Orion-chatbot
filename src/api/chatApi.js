/** Thrown for problems the user should see (bad key, rate limit…), as opposed to network failures. */
export class ChatApiError extends Error {}

export async function checkHealth() {
  try {
    const res = await fetch('/api/health', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { ai: false };
    return await res.json();
  } catch {
    return { ai: false }; // server not running → offline mode
  }
}

/**
 * Streams a reply from the server (Server-Sent Events over fetch).
 * Calls onText(chunk) as text arrives and resolves with the full reply.
 */
export async function streamChat({ messages, signal, onText }) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
    signal,
  });

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new ChatApiError(data.error || `Request failed (${res.status}).`);
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  let full = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;

    // SSE events are separated by a blank line; keep any partial event in the buffer.
    const events = buffer.split('\n\n');
    buffer = events.pop();

    for (const event of events) {
      const line = event.split('\n').find((l) => l.startsWith('data: '));
      if (!line) continue;
      const payload = JSON.parse(line.slice(6));
      if (payload.error) throw new ChatApiError(payload.error);
      if (payload.text) {
        full += payload.text;
        onText(payload.text);
      }
    }
  }
  return full;
}
