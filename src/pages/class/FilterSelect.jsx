// 色つきのプルダウン(授業・形式の絞り込みに使う)。
import React from 'react';
import { shaded } from '../../lib/ui/courseTheme';



// プルダウン(授業・形式)。スマホでは端末標準の選択画面が開く
// 文字サイズを16px未満にすると、iPhoneで押したときに画面が拡大されてしまうため16pxにしている
const chevron = (color) =>
  `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${color}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`;

// theme: 選んでいるときの色 { gradient, textColor }
// plain: 選んでも色をつけない(設定の画面など)
export default function FilterSelect({ value, onChange, allLabel, options, label, theme, fontPx, plain = false }) {
  const isActive = !plain && value !== '';
  const onColor = theme.chevron || (theme.textColor === 'white' ? '%23FFFFFF' : '%23111827');
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        flex: '0 1 auto',
        minWidth: 0,
        maxWidth: '50%',
        height: '30px',
        padding: '0 26px 0 10px',
        border: isActive ? '1px solid transparent' : '1px solid var(--line)',
        borderRadius: '8px',
        backgroundColor: isActive ? 'transparent' : 'var(--surface)',
        backgroundImage: isActive
          ? `${chevron(onColor)}, ${shaded(theme.gradient)}`
          : chevron('%236B7280'),
        backgroundRepeat: 'no-repeat',
        // 選択中の背景は3層(矢印 / 暗くする層 / グラデーション)。位置とサイズも3つ分そろえる
        backgroundPosition: isActive ? 'right 9px center, 0 0, 0 0' : 'right 9px center',
        backgroundSize: isActive ? '13px, 100% 100%, 100% 100%' : '13px',
        color: isActive ? theme.textColor : (plain && value ? 'var(--text-strong)' : 'var(--text-muted)'),
        fontSize: `${(fontPx * 0.929).toFixed(1)}px`,
        fontWeight: isActive || (plain && value) ? 600 : 400,
        fontFamily: 'inherit',
        textOverflow: 'ellipsis',
        boxSizing: 'border-box',
        WebkitAppearance: 'none',
        appearance: 'none',
        outline: 'none',
        cursor: 'pointer',
        touchAction: 'manipulation'
      }}
    >
      <option value="" style={{ color: 'var(--text-strong)', background: 'var(--surface)' }}>{allLabel}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id} style={{ color: 'var(--text-strong)', background: 'var(--surface)' }}>{o.label}</option>
      ))}
    </select>
  );
}
