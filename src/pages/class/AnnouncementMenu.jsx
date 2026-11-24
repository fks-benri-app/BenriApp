// 長押しで出るお知らせのメニュー。押したカードをそのまま浮かせ、そのそばに選択肢を出す(Radix の DropdownMenu)。
import React from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { BellOff, BellRing, Pin, PinOff } from 'lucide-react';
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
          <span aria-hidden="true" style={{ position: 'fixed', top: anchor.top, left: anchor.left, width: anchor.width, height: anchor.height, pointerEvents: 'none' }} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            side="bottom"
            align="start"
            sideOffset={10}
            collisionPadding={12}
            style={{ zIndex: 62, width: 248, boxSizing: 'border-box', overflow: 'hidden', background: 'var(--surface)', borderRadius: '14px', boxShadow: '0 12px 32px rgba(0,0,0,0.28)', userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            <DropdownMenu.Item onSelect={onTogglePin} style={ITEM}>
              {pinned ? <PinOff size={20} strokeWidth={2} aria-hidden="true" /> : <Pin size={20} strokeWidth={2} aria-hidden="true" />}
              {pinned ? t('class.menu.unpin') : t('class.menu.pin')}
            </DropdownMenu.Item>
            <DropdownMenu.Separator style={{ height: 1, background: 'var(--line)' }} />
            <DropdownMenu.Item onSelect={onRemind} style={ITEM}>
              {reminderAt ? <BellOff size={20} strokeWidth={2} aria-hidden="true" /> : <BellRing size={20} strokeWidth={2} aria-hidden="true" />}
              {reminderAt ? t('class.reminder.clear') : t('class.menu.remind')}
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}
