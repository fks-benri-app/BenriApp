// アイコンの表示部品。形は src/data/icons.json にある。
import React from 'react';
import icons from '../data/icons.json';

// アイコンの表示。形は src/data/icons.json にまとめてある(名前で呼ぶ)。
// ・size: 数字なら px、文字なら CSS の長さ(例 "1.2em")。width / height で別々にも指定できる
// ・color: 塗り(fill 型)または線(stroke 型)の色。色つきのアイコン(google)では使わない
export default function Icon({ name, size = 24, width, height, color = 'currentColor', style }) {
  const def = icons[name] || icons.file;
  const stroked = typeof def.stroke === 'number';
  const common = stroked
    ? { fill: 'none', style: { stroke: color }, strokeWidth: def.stroke, strokeLinecap: 'round', strokeLinejoin: 'round' }
    : { fill: undefined };
  return (
    <svg
      width={width ?? size}
      height={height ?? size}
      viewBox={def.viewBox}
      fill={stroked ? 'none' : color}
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', flexShrink: 0, ...style }}
    >
      {def.shapes.map((sh, i) => (sh.circle
        ? <circle key={i} cx={sh.circle[0]} cy={sh.circle[1]} r={sh.circle[2]} {...common} />
        : <path key={i} d={sh.path} {...common} fill={sh.fill || common.fill} />))}
    </svg>
  );
}
