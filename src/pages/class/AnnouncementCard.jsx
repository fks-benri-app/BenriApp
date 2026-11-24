// お知らせ一覧の1枚のカード。
import React, { useRef } from 'react';
import { KIND_LABELS } from './DetailView';
import { courseThemeOrNull, shaded } from '../../lib/ui/courseTheme';
import { t } from '../../lib/ui/text';

// 長押し(この長さ以上押し続けたら、メニューを出す)
const LONG_PRESS_MS = 500;

// 要素が、見えている範囲(画面・スクロール欄・上下のバー)の中に全部入っているか。
// 中心と上下の端の点が、どれも要素自身に当たるかで、上に重なるバーも判定する
function isFullyVisible(el) {
  const r = el.getBoundingClientRect();
  if (r.top < 0 || r.bottom > window.innerHeight || r.left < 0 || r.right > window.innerWidth) return false;
  for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
    const cs = getComputedStyle(p);
    if (!/(auto|hidden|scroll|clip)/.test(cs.overflowY + cs.overflowX)) continue;
    const pr = p.getBoundingClientRect();
    if (r.top < pr.top || r.bottom > pr.bottom || r.left < pr.left || r.right > pr.right) return false;
  }
  const x = r.left + r.width / 2;
  return [r.top + 2, r.top + r.height / 2, r.bottom - 2].every((y) => {
    const hit = document.elementFromPoint(x, y);
    return !!hit && el.contains(hit);
  });
}

export default function AnnouncementCard({ ann, openAnnouncement, onLongPress, pinned, reminderAt }) {
  const timer = useRef(null);
  const fired = useRef(false);
  const cancel = () => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  };
  return (
    <article
      role="link"
      tabIndex={0}
      onClick={() => {
        // 長押しで開いたメニューの後のクリックは、詳細を開かない
        if (fired.current) { fired.current = false; return; }
        openAnnouncement(ann);
      }}
      onKeyDown={(e) => { if (e.key === 'Enter') openAnnouncement(ann); }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        fired.current = false;
        cancel();
        // 押した場所の大きさ(メニューを、このお知らせのそばに出すため)
        const rect = e.currentTarget.getBoundingClientRect();
        const el = e.currentTarget;
        timer.current = setTimeout(() => {
          timer.current = null;
          // 画面の外・バーの下・スクロール欄から切れているカードでは、メニューを出さない
          if (!isFullyVisible(el)) return;
          fired.current = true;
          if (navigator.vibrate) navigator.vibrate(10);
          onLongPress?.(ann, { top: rect.top, left: rect.left, width: rect.width, height: rect.height, bottom: rect.bottom });
        }, LONG_PRESS_MS);
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      style={cardStyle(ann)}
    >
      <AnnouncementCardFace ann={ann} pinned={pinned} reminderAt={reminderAt} />
    </article>
  );
}

// 見た目(一覧のカードと、長押しで浮かせたカードで同じものを使う)
export function cardStyle(ann) {
  return {
        position: 'relative',
        padding: ann.isUnread ? 'calc(1.143em - 1.5px)' : '1.143em',
        border: ann.isUnread ? '1.5px solid transparent' : 'none',
        background: ann.isUnread
          ? 'linear-gradient(var(--surface-2), var(--surface-2)) padding-box, linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%) border-box'
          : 'var(--surface-2)', // 背景より一段だけ濃い面(枠線の色よりなじませる)
        borderRadius: '1.143em',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.857em',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'manipulation'
  };
}

export function AnnouncementCardFace({ ann, pinned, reminderAt }) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.571em' }}>
          <div style={{
            padding: '0.286em 0.571em',
            background: shaded(courseThemeOrNull(ann.subject)?.gradient || 'var(--line)'),
            borderRadius: '0.429em'
          }}>
            <div style={{
              color: courseThemeOrNull(ann.subject)?.textColor || 'var(--text-strong)',
              fontSize: '0.786em',
              fontWeight: '700'
            }}>
              {ann.subject}
            </div>
          </div>
          {KIND_LABELS[ann.kind] && (
            <div style={{
              padding: '0.286em 0.571em',
              borderRadius: '0.429em',
              background: 'var(--line)', // 種別は無彩色にして、授業の色だけを目立たせる
              color: 'var(--text-body)',
              fontSize: '0.786em',
              fontWeight: '700'
            }}>
              {KIND_LABELS[ann.kind]}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.429em' }}>
          {pinned && <div style={{ color: 'var(--text-muted)', fontSize: '0.786em', fontWeight: '400' }}>{t('class.pinnedLabel')}</div>}
          {reminderAt && <div style={{ color: 'var(--text-muted)', fontSize: '0.786em', fontWeight: '400' }}>{t('class.reminderBadge')}</div>}
          <div style={{ color: 'var(--text-muted)', fontSize: '0.786em', fontWeight: '400', position: 'relative', top: '-0.214em', fontVariantNumeric: 'tabular-nums' }}>
            {ann.time}
          </div>
          {/* 既読でも場所は空けておく(未読・既読で、時刻の位置がずれないように) */}
          <div style={{ width: '0.571em', height: '0.571em', background: 'linear-gradient(135deg, #FF4D4D 0%, #FF8A1B 100%)', borderRadius: '50%', visibility: ann.isUnread ? 'visible' : 'hidden' }} />
        </div>
      </div>
      <div style={{ color: 'var(--text-body)', fontSize: '1em', fontWeight: 400, lineHeight: 1.4286, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {ann.content}
      </div>
    </>
  );
}
