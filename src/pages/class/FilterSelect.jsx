// 色つきのプルダウン(授業・形式の絞り込みに使う)。
import React from 'react';
import { shaded } from '../../lib/ui/courseTheme';
import Icon from '../../components/Icon';



// プルダウン(授業・形式)。スマホでは端末標準の選択画面が開く
// 文字サイズを16px未満にすると、iPhoneで押したときに画面が拡大されてしまうため16pxにしている
// theme: 選んでいるときの色 { gradient, textColor }
// plain: 選んでも色をつけない(設定の画面など)
export default function FilterSelect({ value, onChange, allLabel, options, label, theme, fontPx, plain = false }) {
  const isActive = !plain && value !== '';
  const onColor = theme.textColor === 'white' ? '#FFFFFF' : '#111827';
  return (
    <div style={{ position: 'relative', flex: '0 1 auto', minWidth: 0, maxWidth: '50%', display: 'flex' }}>
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: '100%',
        minWidth: 0,
        height: '30px',
        padding: '0 26px 0 10px',
        border: isActive ? '1px solid transparent' : '1px solid var(--line)',
        borderRadius: '8px',
        backgroundColor: isActive ? 'transparent' : 'var(--surface)',
        // 選択中の背景は、色のグラデーション(矢印はこの下に重ねる Icon)
        backgroundImage: isActive ? shaded(theme.gradient) : 'none',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
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
    <Icon name="chevronDown" size={13} color={isActive ? onColor : '#6B7280'} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  );
}
