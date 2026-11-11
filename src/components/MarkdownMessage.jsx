import { useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './MarkdownMessage.css';

function CodeBlock({ children }) {
  const preRef = useRef(null);
  const [copied, setCopied] = useState(false);

  // react-markdown passes <code className="language-xyz"> as the child of <pre>.
  const language = children?.props?.className?.replace('language-', '') ?? '';

  async function copy() {
    try {
      await navigator.clipboard.writeText(preRef.current?.innerText ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span>{language || 'code'}</span>
        <button type="button" onClick={copy}>{copied ? 'Copied ✓' : 'Copy code'}</button>
      </div>
      <pre ref={preRef}>{children}</pre>
    </div>
  );
}

const components = {
  pre: CodeBlock,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
  ),
  table: ({ children }) => (
    <div className="table-wrapper"><table>{children}</table></div>
  ),
};

/** Renders bot replies as Markdown. Raw HTML is not rendered, so model output can't inject markup. */
export default function MarkdownMessage({ text, isStreaming }) {
  return (
    <div className={`markdown${isStreaming ? ' is-streaming' : ''}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {text}
      </ReactMarkdown>
    </div>
  );
}
