// オン/オフのスイッチ(Radix の Switch。キーボード操作と読み上げに対応する)
import React, { useState } from 'react';
import * as RadixSwitch from '@radix-ui/react-switch';

// 押したときに、外側の行(Row)の click まで伝えない(行を押したときの動きと二重にならないように)
export default function Switch({ checked, onCheckedChange, disabled = false, 'aria-label': ariaLabel }) {
  // 画面を開いたときの表示(設定の読み込み)では動かさない。押したあとだけ動かす
  const [armed, setArmed] = useState(false);
  const motion = armed ? 'background 0.15s' : 'none';
  return (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={(v) => { setArmed(true); if (onCheckedChange) onCheckedChange(v); }}
      disabled={disabled}
      aria-label={ariaLabel}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: '3.429em',
        height: '2em',
        padding: '0.143em',
        border: 'none',
        flexShrink: 0,
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        background: checked ? 'var(--text-strong)' : 'var(--switch-off)',
        borderRadius: '1em',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'default' : 'pointer',
        transition: motion,
      }}
    >
      <RadixSwitch.Thumb
        style={{
          display: 'block',
          width: '1.714em',
          height: '1.714em',
          background: 'var(--surface)',
          borderRadius: '50%',
          boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
          transform: checked ? 'translateX(1.429em)' : 'translateX(0)',
          transition: armed ? 'transform 0.15s' : 'none',
        }}
      />
    </RadixSwitch.Root>
  );
}
