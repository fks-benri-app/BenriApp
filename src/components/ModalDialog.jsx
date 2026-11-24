// ダイアログの共通の見た目(一斉既読の確認をもとにする)。
// 中央に出る白い板・見出し・本文・右下のボタン、という形を、すべてのダイアログで揃える。
import React from 'react';

export const DIALOG_FONT = "'Google Sans', Roboto, 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic UI', Arial, sans-serif";

// 右下の丸いボタン。primary は黒地(確定)、それ以外は文字だけ(キャンセル)
export function DialogButton({ primary = false, disabled = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '0.714em 1.143em', border: 'none', borderRadius: '999px', fontFamily: 'inherit', fontSize: '1em', fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        background: primary ? (disabled ? 'var(--line)' : 'var(--ink)') : 'transparent',
        color: primary ? (disabled ? 'var(--text-faint)' : 'var(--on-ink)') : 'var(--text-muted)',
      }}
    >
      {children}
    </button>
  );
}

// zIndex: 重なり順。title / description: 見出しと本文。children: 本文の代わりに入れる部品。actions: 右下のボタン(省略可)
export default function ModalDialog({ zIndex = 60, onClose, title, description, children, actions, label }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', fontFamily: DIALOG_FONT }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'var(--overlay)' }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label || (typeof title === 'string' ? title : undefined)}
        style={{ position: 'relative', width: '100%', maxWidth: '22.857em', boxSizing: 'border-box', maxHeight: '100%', overflowY: 'auto', background: 'var(--surface)', borderRadius: '1.143em', padding: '1.714em', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}
      >
        {title && <div style={{ fontSize: '1.286em', fontWeight: 600, color: 'var(--text-strong)', marginBottom: '0.444em' }}>{title}</div>}
        {description && <div style={{ fontSize: '1em', lineHeight: '1.43em', color: 'var(--text-muted)', marginBottom: '1.43em' }}>{description}</div>}
        {children}
        {actions && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.571em', marginTop: children || description ? '1.43em' : 0 }}>{actions}</div>}
      </div>
    </div>
  );
}
