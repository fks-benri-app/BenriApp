// チェックボックス(Radix の Checkbox と、Tabler のチェックの印)
import React from 'react';
import * as RadixCheckbox from '@radix-ui/react-checkbox';
import { TbCheck as Check } from 'react-icons/tb';

export default function Checkbox({ checked, onCheckedChange, disabled = false, 'aria-label': ariaLabel }) {
  return (
    <RadixCheckbox.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        width: '1.5em',
        height: '1.5em',
        flexShrink: 0,
        padding: 0,
        display: 'grid',
        placeItems: 'center',
        borderRadius: '0.4em',
        border: checked ? 'none' : '1.5px solid var(--line)',
        background: checked ? 'var(--ink)' : 'var(--surface)',
        color: 'var(--on-ink)',
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'background 0.15s, border-color 0.15s',
      }}
    >
      <RadixCheckbox.Indicator style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' }}>
        <Check size={16} strokeWidth={3} aria-hidden="true" style={{ display: 'block' }} />
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  );
}
