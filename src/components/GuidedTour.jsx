import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import './GuidedTour.css';

const PADDING = 8; // space around the highlighted element
const GAP = 14; // space between highlight and tooltip
const MARGIN = 12; // min distance from the viewport edge

/** Returns the first matching element that is actually visible on screen. */
function findTarget(selector) {
  if (!selector) return null;
  const selectors = Array.isArray(selector) ? selector : [selector];
  for (const s of selectors) {
    for (const el of document.querySelectorAll(s)) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return el;
    }
  }
  return null;
}

function placeTooltip(rect, tip) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  if (!rect) return { top: (vh - tip.height) / 2, left: (vw - tip.width) / 2, side: 'center' };

  const spaceBelow = vh - rect.bottom;
  const side = spaceBelow >= tip.height + GAP + MARGIN || spaceBelow > rect.top ? 'bottom' : 'top';
  let top = side === 'bottom' ? rect.bottom + PADDING + GAP : rect.top - PADDING - GAP - tip.height;
  top = Math.min(Math.max(top, MARGIN), vh - tip.height - MARGIN);

  let left = rect.left + rect.width / 2 - tip.width / 2;
  left = Math.min(Math.max(left, MARGIN), vw - tip.width - MARGIN);

  // Arrow points at the centre of the target, clamped inside the tooltip.
  const arrowLeft = Math.min(Math.max(rect.left + rect.width / 2 - left, 20), tip.width - 20);
  return { top, left, side, arrowLeft };
}

/**
 * Lightweight guided tour.
 * steps: [{ target?: string | string[], title, body, placement? }]
 * Steps whose target isn't on screen (e.g. desktop-only buttons on mobile) are skipped.
 */
export default function GuidedTour({ steps, open, onClose }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [position, setPosition] = useState(null);
  const tooltipRef = useRef(null);
  const primaryRef = useRef(null);
  const previousFocus = useRef(null);

  // Resolve which steps can be shown when the tour opens.
  const activeSteps = useMemo(
    () => (open ? steps.filter((s) => !s.target || findTarget(s.target)) : []),
    [open, steps],
  );
  const step = activeSteps[index];
  const isLast = index === activeSteps.length - 1;

  useEffect(() => {
    if (open) {
      previousFocus.current = document.activeElement;
      setIndex(0);
    } else {
      previousFocus.current?.focus?.();
    }
  }, [open]);

  const measure = useCallback(() => {
    if (!step) return;
    const el = findTarget(step.target);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  // Bring the target into view, then measure it.
  useLayoutEffect(() => {
    if (!open || !step) return;
    const el = findTarget(step.target);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) el.scrollIntoView({ block: 'center' });
    }
    measure();
  }, [open, step, measure]);

  // Keep the highlight attached when the window resizes or anything scrolls.
  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, measure]);

  // Position the tooltip once we know its size.
  useLayoutEffect(() => {
    if (!open || !tooltipRef.current) return;
    const { width, height } = tooltipRef.current.getBoundingClientRect();
    setPosition(placeTooltip(rect, { width, height }));
  }, [open, rect, index]);

  useEffect(() => {
    if (open) primaryRef.current?.focus();
  }, [open, index]);

  const next = useCallback(() => (isLast ? onClose() : setIndex((i) => i + 1)), [isLast, onClose]);
  const back = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') back();
      else if (e.key === 'Tab') {
        // Keep keyboard focus inside the tooltip while the tour is open.
        const focusables = tooltipRef.current?.querySelectorAll('button');
        if (!focusables?.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, next, back, onClose]);

  if (!open || !step) return null;

  const spotlight = rect && {
    top: rect.top - PADDING,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };

  return (
    <div className="tour-root">
      {/* Blocks clicks on the page while the tour runs. */}
      <div className={`tour-overlay${spotlight ? '' : ' is-dimmed'}`} />
      {spotlight && <div className="tour-spotlight" style={spotlight} aria-hidden="true" />}

      <div
        ref={tooltipRef}
        className={`tour-tooltip side-${position?.side ?? 'center'}`}
        style={{
          top: position?.top ?? -9999,
          left: position?.left ?? -9999,
          '--arrow-left': `${position?.arrowLeft ?? 0}px`,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
      >
        {step.image && <img src={step.image} alt="" className="tour-image" />}
        <p className="tour-progress">Step {index + 1} of {activeSteps.length}</p>
        <h2 id="tour-title" className="tour-title">{step.title}</h2>
        <p id="tour-body" className="tour-body">{step.body}</p>

        <div className="tour-footer">
          <div className="tour-dots" aria-hidden="true">
            {activeSteps.map((s, i) => (
              <span key={s.title} className={i === index ? 'is-active' : ''} />
            ))}
          </div>
          <div className="tour-buttons">
            {!isLast && (
              <button type="button" className="tour-skip" onClick={onClose}>Skip</button>
            )}
            {index > 0 && (
              <button type="button" className="tour-back" onClick={back}>Back</button>
            )}
            <button type="button" ref={primaryRef} className="tour-next" onClick={next}>
              {isLast ? 'Get started' : index === 0 ? 'Show me around' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
