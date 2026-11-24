// アイコンの表示部品。詳細画面の形は src/data/icons.json(元のまま)、ほかは Tabler Icons、Google・YouTube のロゴは react-icons。
import React from 'react';
import icons from '../data/icons.json';
import {
  TbCheck, TbChecks, TbChevronDown, TbChevronRight, TbCopy, TbLoader2, TbUser, TbX,
} from 'react-icons/tb';
import { FcGoogle } from 'react-icons/fc';
import { FaYoutube } from 'react-icons/fa6';

// 名前 → Tabler のアイコン。呼び出し側は名前で指定する(例: <Icon name="bellOff" />)
const LINE = {
  doneAll: TbChecks, readAll: TbChecks, check: TbCheck, chevronRight: TbChevronRight, chevronRightSmall: TbChevronRight,
  chevronDown: TbChevronDown, account: TbUser,
  copy: TbCopy, spinner: TbLoader2, closeSmall: TbX,
};
// ブランドのロゴ(色つき。color は使わない)
const BRAND = { google: FcGoogle };

// 元の形(icons.json)の描画
function ShapeIcon({ def, width, height, color, style }) {
  const stroked = typeof def.stroke === 'number';
  const common = stroked
    ? { fill: 'none', style: { stroke: color }, strokeWidth: def.stroke, strokeLinecap: 'round', strokeLinejoin: 'round' }
    : { fill: undefined };
  return (
    <svg width={width} height={height} viewBox={def.viewBox} fill={stroked ? 'none' : color}
      aria-hidden="true" focusable="false" style={{ display: 'block', flexShrink: 0, ...style }}>
      {def.shapes.map((sh, i) => (sh.circle
        ? <circle key={i} cx={sh.circle[0]} cy={sh.circle[1]} r={sh.circle[2]} {...common} />
        : <path key={i} d={sh.path} {...common} fill={sh.fill || common.fill} />))}
    </svg>
  );
}

// ・size: 数字なら px、文字なら CSS の長さ(例 "1.2em")。width / height で別々にも指定できる
// ・color: 線・塗りの色。ブランドのロゴでは使わない
export default function Icon({ name, size = 24, width, height, color = 'currentColor', style }) {
  const w = width ?? size;
  const h = height ?? size;
  const css = { display: 'block', flexShrink: 0, width: w, height: h, ...style };
  if (icons[name]) return <ShapeIcon def={icons[name]} width={w} height={h} color={color} style={style} />;
  const Brand = BRAND[name] || (name === 'youtube' ? FaYoutube : null);
  if (Brand) return <Brand size={h} style={css} aria-hidden="true" focusable="false" />;
  const Line = LINE[name] || TbX;
  return <Line size={h} color={color} style={css} aria-hidden="true" focusable="false" />;
}
