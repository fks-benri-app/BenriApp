import React from 'react';
import { shaded } from '../lib/courseTheme';
import { THEMES } from '../lib/themes';
import globeImg from '../assets/images/class/globe.webp';

const NEXT_CLASS = {
  name: '地理総合',
  time: '08:40 - 09:35',
  room: '221教室',
  theme: 'green'
};

const MARGIN_X = '15cqmin';

const NAME_STYLE = {
  position: 'absolute',
  top: '23cqmin',
  left: MARGIN_X,
  fontSize: '34cqmin',
  fontWeight: 800,
  fontFamily: 'Inter',
  lineHeight: 1.05,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  maxWidth: 'calc(100cqw - var(--d) * 0.95 - 18cqmin)',
};

const DETAIL_STYLE = {
  fontSize: '10cqmin',
  fontWeight: 700,
  fontFamily: 'Inter',
  lineHeight: 1.2,
  whiteSpace: 'nowrap',
};

export default function NextClassGadget() {
  const theme = THEMES[NEXT_CLASS.theme];

  return (
    <div style={{
      '--d': 'clamp(40cqmin, min(104cqmin, calc((100cqw - 126cqmin) / 0.95)), 104cqmin)',
      position: 'relative',
      overflow: 'hidden',
      boxSizing: 'border-box',
      width: '100%',
      height: '100%',
      borderRadius: 0,
      background: shaded(theme.gradient),
      color: theme.textColor,
      containerType: 'size',
    }}>

      {/* 授業名 */}
      <div style={NAME_STYLE}>
        {NEXT_CLASS.name}
      </div>

      {/* 教室・時間 */}
      <div style={{
        ...DETAIL_STYLE,
        position: 'absolute',
        left: MARGIN_X,
        bottom: '14cqmin',
      }}>
        <div>{NEXT_CLASS.room}</div>
        <div>{NEXT_CLASS.time}</div>
      </div>

      {/* 地球 */}
      <img
        src={globeImg}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: 'absolute',
          right: 'calc(var(--d) * -0.05)',
          bottom: 'calc(var(--d) * -0.19)',
          height: 'var(--d)',
          width: 'auto',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      />

    </div>
  );
}
