// 長押しで出る、お知らせのメニュー。押したお知らせを浮かせ、そのそばに選択肢を出す(iPhone のアプリの長押しのように)。
import React, { useLayoutEffect, useRef, useState } from 'react';
import { BellOff, BellRing, Pin, PinOff } from 'lucide-react';
import { t } from '../../lib/ui/text';

const GAP = 10;
const MENU_WIDTH = 248;
const EDGE = 12;

export default function AnnouncementMenu({ ann, anchor, pinned, hasReminder, onTogglePin, onRemind, onClose }) {
  const menuRef = useRef(null);
  const [top, setTop] = useState(null);
  const left = anchor
    ? Math.min(Math.max(anchor.left, EDGE), window.innerWidth - MENU_WIDTH - EDGE)
    : (window.innerWidth - MENU_WIDTH) / 2;

  // 押したお知らせの下に出す。下に空きがなければ上に出す
  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const h = menuRef.current.offsetHeight;
    if (!anchor) { setTop((window.innerHeight - h) / 2); return; }
    const below = anchor.top + anchor.height + GAP;
    setTop(below + h <= window.innerHeight - EDGE ? below : Math.max(EDGE, anchor.top - GAP - h));
  }, [anchor]);

  const row = (index) => ({
    display: 'flex', alignItems: 'center', gap: '0.75em', width: '100%', padding: '0.95em 1em', boxSizing: 'border-box',
    border: 'none', borderTop: index ? '1px solid var(--line)' : 'none', background: 'transparent',
    color: 'var(--text-strong)', fontFamily: 'inherit', fontSize: '1em', fontWeight: 600, textAlign: 'left',
    cursor: 'pointer', touchAction: 'manipulation',
  });

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'var(--overlay)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }}>
      {anchor && (
        <div
          aria-hidden="true"
          style={{
            position: 'fixed', top: anchor.top, left: anchor.left, width: anchor.width, height: anchor.height, boxSizing: 'border-box',
            padding: '0.9em 1em', overflow: 'hidden', borderRadius: '14px', background: 'var(--surface)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.28)', pointerEvents: 'none', userSelect: 'none',
          }}
        >
          <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ann.subject}</div>
          <div style={{ fontSize: '0.95em', fontWeight: 600, color: 'var(--text-strong)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {ann.title || ann.content}
          </div>
        </div>
      )}
      <div
        ref={menuRef}
        role="menu"
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed', left, top: top ?? 0, width: MENU_WIDTH, boxSizing: 'border-box', overflow: 'hidden',
          background: 'var(--surface)', borderRadius: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.28)',
          visibility: top === null ? 'hidden' : 'visible', userSelect: 'none', WebkitUserSelect: 'none',
        }}
      >
        <button type="button" role="menuitem" onClick={onTogglePin} style={row(0)}>
          {pinned ? <PinOff size={20} strokeWidth={2} aria-hidden="true" /> : <Pin size={20} strokeWidth={2} aria-hidden="true" />}
          {pinned ? t('class.menu.unpin') : t('class.menu.pin')}
        </button>
        <button type="button" role="menuitem" onClick={onRemind} style={row(1)}>
          {hasReminder ? <BellOff size={20} strokeWidth={2} aria-hidden="true" /> : <BellRing size={20} strokeWidth={2} aria-hidden="true" />}
          {hasReminder ? t('class.reminder.clear') : t('class.menu.remind')}
        </button>
      </div>
    </div>
  );
}
