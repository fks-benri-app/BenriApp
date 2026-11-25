// 長押しで出るお知らせのメニュー。押したカードをそのまま浮かせ、そのそばに選択肢を出す(Radix の DropdownMenu)。
import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { TbBellOff, TbBellRinging, TbPin, TbPinnedOff } from 'react-icons/tb';
import { t } from '../../lib/ui/text';
import { AnnouncementCardFace, cardStyle } from './AnnouncementCard';

const ITEM = {
  display: 'flex', alignItems: 'center', gap: '0.75em', width: '100%', padding: '0.95em 1em', boxSizing: 'border-box',
  border: 'none', background: 'transparent', color: 'var(--text-strong)', fontFamily: 'inherit', fontSize: '1em',
  fontWeight: 600, textAlign: 'left', cursor: 'pointer', outline: 'none',
};

export default function AnnouncementMenu({ ann, anchor, pinned, reminderAt, onTogglePin, onRemind, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'var(--overlay)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)' }} />
      <div aria-hidden="true" style={{ ...cardStyle(ann), position: 'fixed', zIndex: 61, top: anchor.top, left: anchor.left, width: anchor.width, height: anchor.height, boxSizing: 'border-box', overflow: 'hidden', pointerEvents: 'none', boxShadow: '0 12px 32px rgba(0,0,0,0.28)' }}>
        <AnnouncementCardFace ann={ann} pinned={pinned} reminderAt={reminderAt} />
      </div>
      {/* 基準の位置は押したカード。下に空きがなければ、Radix が自動で上に出す */}
      <DropdownMenu.Root open modal={false} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DropdownMenu.Trigger asChild>
          <span aria-hidden="true" style={{ position: 'fixed', top: anchor.top, left: anchor.left, width: 40, height: anchor.height, pointerEvents: 'none' }} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="bottom"
            align="start"
            sideOffset={10}
            collisionPadding={12}
            style={{ zIndex: 62, width: 248, boxSizing: 'border-box', background: 'var(--surface)', borderRadius: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.28)', userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            {/* カードに向かう吹き出しのしっぽ(本体と同じ色) */}
            <DropdownMenu.Arrow asChild>
              <svg width={20} height={10} viewBox="0 0 30 10" preserveAspectRatio="none" style={{ fill: 'var(--surface)', display: 'block' }}>
                <path d="M0,0 H30 L17.6,8.2 Q15,10.6 12.4,8.2 Z" />
              </svg>
            </DropdownMenu.Arrow>
            <DropdownMenu.Item onSelect={onTogglePin} style={ITEM}>
              {pinned ? <TbPinnedOff size={20} aria-hidden="true" /> : <TbPin size={20} aria-hidden="true" />}
              {pinned ? t('class.menu.unpin') : t('class.menu.pin')}
            </DropdownMenu.Item>
            <DropdownMenu.Item onSelect={onRemind} style={ITEM}>
              {reminderAt ? <TbBellOff size={20} aria-hidden="true" /> : <TbBellRinging size={20} aria-hidden="true" />}
              {reminderAt ? t('class.reminder.clear') : t('class.menu.remind')}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}
