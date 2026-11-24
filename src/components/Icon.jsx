// アイコンの表示部品。線の形は Tabler Icons(react-icons/tb)、Google・YouTube のロゴは react-icons から取る。
import React from 'react';
import {
  TbBell, TbBellOff, TbBellRinging, TbCheck, TbChecks, TbChevronDown, TbChevronRight, TbClipboardList,
  TbCopy, TbExternalLink, TbFile, TbFileText, TbLink, TbLoader2, TbPaperclip, TbSpeakerphone, TbUser, TbX,
} from 'react-icons/tb';
import { FaYoutube } from 'react-icons/fa6';
import { FcGoogle } from 'react-icons/fc';

// 名前 → アイコン。呼び出し側は名前で指定する(例: <Icon name="bell" />)
const LINE = {
  close: TbX, closeSmall: TbX, open: TbExternalLink, announcement: TbSpeakerphone, assignment: TbClipboardList,
  material: TbPaperclip, file: TbFile, link: TbLink, form: TbFileText, doneAll: TbChecks, readAll: TbChecks,
  check: TbCheck, chevronRight: TbChevronRight, chevronRightSmall: TbChevronRight, chevronDown: TbChevronDown,
  account: TbUser, bell: TbBell, bellOff: TbBellOff, bellRing: TbBellRinging, copy: TbCopy, spinner: TbLoader2,
};
// ブランドのロゴ(色つき。color は使わない)
const BRAND = { youtube: FaYoutube, google: FcGoogle };

// ・size: 数字なら px、文字なら CSS の長さ(例 "1.2em")。width / height で別々にも指定できる
// ・color: 線の色。ブランドのロゴでは使わない
export default function Icon({ name, size = 24, width, height, color = 'currentColor', style }) {
  const w = width ?? size;
  const h = height ?? size;
  // react-icons は size で幅と高さを決めるため、ずれる分は style で直す
  const css = { display: 'block', flexShrink: 0, width: w, height: h, ...style };
  const Brand = BRAND[name];
  if (Brand) return <Brand size={h} style={css} aria-hidden="true" focusable="false" />;
  const Line = LINE[name] || TbFile;
  return <Line size={h} color={color} style={css} aria-hidden="true" focusable="false" />;
}
