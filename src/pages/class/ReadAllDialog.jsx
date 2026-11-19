import React from 'react';
import { GOOGLE_FONT } from './DetailView';

// 一斉既読の確認(ブラウザの確認ダイアログは、タイトルがサイトのURLになって変えられないため、アプリ内の画面で出す)
export default function ReadAllDialog({ unreadCount, onCancel, onConfirm }) {
  return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: GOOGLE_FONT }}>
        <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'var(--overlay)' }} />
        <div role="dialog" aria-modal="true" style={{ position: 'relative', width: '100%', maxWidth: '22.857em', background: 'var(--surface)', borderRadius: '1.143em', padding: '1.714em', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          <div style={{ fontSize: '1.286em', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '0.444em' }}>すべて既読にしますか?</div>
          <div style={{ fontSize: '1em', lineHeight: '1.43em', color: 'var(--text-muted)', marginBottom: '1.43em' }}>表示中の未読 {unreadCount} 件を既読にします。</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.571em' }}>
            <button type="button" onClick={onCancel} style={{ padding: '0.714em 1.143em', border: 'none', background: 'transparent', color: 'var(--text-muted)', borderRadius: '999px', fontFamily: 'inherit', fontSize: '1em', fontWeight: 600, cursor: 'pointer' }}>キャンセル</button>
            <button type="button" onClick={onConfirm} style={{ padding: '0.714em 1.143em', border: 'none', background: 'var(--ink)', color: 'var(--on-ink)', borderRadius: '999px', fontFamily: 'inherit', fontSize: '1em', fontWeight: 600, cursor: 'pointer' }}>既読にする</button>
          </div>
        </div>
      </div>
  );
}
