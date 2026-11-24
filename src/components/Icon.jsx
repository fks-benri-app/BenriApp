// アイコンの表示部品。線の形は Lucide、Google・YouTube のロゴは react-icons から取る。
import React from 'react';
import {
  Bell, BellOff, CalendarDays, Check, CheckCheck, ChevronDown, ChevronRight, ClipboardList, Copy,
  ExternalLink, File, FileText, House, Link as LinkIcon, Loader2, Megaphone, MessageSquare, Paperclip,
  Search, Settings, UserRound, X,
} from 'lucide-react';
import { FaYoutube } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';

// 名前 → アイコン。呼び出し側は名前で指定する(例: <Icon name="bell" />)
const LINE = {
  close: X, closeSmall: X, open: ExternalLink, announcement: Megaphone, assignment: ClipboardList,
  material: Paperclip, file: File, link: LinkIcon, form: FileText, doneAll: CheckCheck, readAll: CheckCheck,
  check: Check, chevronRight: ChevronRight, chevronRightSmall: ChevronRight, chevronDown: ChevronDown,
  account: UserRound, home: House, calendar: CalendarDays, message: MessageSquare, settings: Settings,
  search: Search, bell: Bell, bellOff: BellOff, copy: Copy, spinner: Loader2,
};
// ブランドのロゴ(色つき。color は使わない)
const BRAND = { youtube: FaYoutube, google: FcGoogle };

// ・size: 数字なら px、文字なら CSS の長さ(例 "1.2em")。width / height で別々にも指定できる
// ・color: 線の色(Lucide は線で描く)。ブランドのロゴでは使わない
export default function Icon({ name, size = 24, width, height, color = 'currentColor', style }) {
  const w = width ?? size;
  const h = height ?? size;
  const css = { display: 'block', flexShrink: 0, ...style };
  const Brand = BRAND[name];
  if (Brand) return <Brand width={w} height={h} style={css} aria-hidden="true" focusable="false" />;
  const Line = LINE[name] || File;
  return <Line width={w} height={h} color={color} style={css} />;
}
