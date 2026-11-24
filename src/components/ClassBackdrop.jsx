// ログイン前に、お知らせ画面の背景として出す見た目だけの画面(動かない)。
import React from 'react';
import { currentFontSize } from '../lib/ui/fontSize';

import BottomNav from './BottomNav';
import tagFilters from '../data/tagFilters.json';

import Icon from './Icon';
import searchIcon from '../assets/images/icons/search.svg';
import bellIcon from '../assets/images/icons/bell.svg';

// このファイルは、Class.jsx の見た目の部分(ヘッダー・フィルター・カード・ボトムナビ)を、
// スタイルそのままで写したもの。通知や検索・既読などの「機能」は付けていない(表示だけ)。
// Class.jsx の見た目を変えたときは、ここも合わせて直す。

const FILTERS = tagFilters;



function FilterSelectView({ allLabel }) {
  return (
    <div style={{ position: 'relative', flex: '0 1 auto', minWidth: 0, maxWidth: '50%' }}>
    <select
      aria-hidden="true"
      tabIndex={-1}
      value=""
      onChange={() => {}}
      style={{
        width: '100%',
        height: '32px',
        padding: '0 28px 0 12px',
        border: '1px solid var(--line)',
        borderRadius: '10px',
        backgroundColor: 'var(--surface)',
        color: 'var(--text-muted)',
        fontSize: 'inherit',
        fontWeight: 400,
        fontFamily: 'inherit',
        textOverflow: 'ellipsis',
        boxSizing: 'border-box',
        WebkitAppearance: 'none',
        appearance: 'none',
        outline: 'none',
        touchAction: 'manipulation',
      }}
    >
      <option value="">{allLabel}</option>
    </select>
    <Icon name="chevronDown" size={13} color="#6B7280" style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
    </div>
  );
}

// ボトムナビゲーション部分(Class.jsx と同じ。ログイン画面でも使う)
// ヘッダー(タイトルの行だけ。Class.jsx と同じ寸法)
export function TitleHeader({ title }) {
  return (
    <header style={{
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.857em',
      paddingTop: 'calc(2em + env(safe-area-inset-top))',
      paddingBottom: '1.143em',
      background: 'var(--surface)',
      borderBottom: '1px var(--line) solid',
      width: '100%'
    }}>
      <div style={{
        padding: '0 1.714em',
        height: '34px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.857em'
      }}>
        <div style={{
          color: 'var(--text-strong)',
          fontSize: '1.871em',
          fontFamily: 'Inter',
          fontWeight: '800',
          userSelect: 'none'
        }}>
          {title}
        </div>
      </div>
    </header>
  );
}

// お知らせ画面(Class.jsx)の見た目。ダイアログの背景に使う(カードは出さず「読み込み中…」)
export default function ClassBackdrop() {
  const baseFontSize = currentFontSize(); // Class.jsx と同じ基準の文字サイズ(設定画面の値)
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        fontSize: `${baseFontSize}px`,
        background: 'var(--surface)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pointerEvents: 'none',
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none'
      }}
    >

      {/* ヘッダー部分 */}
      <header style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.857em',
        paddingTop: 'calc(2em + env(safe-area-inset-top))',
        paddingBottom: '1.143em',
        background: 'var(--surface)',
        width: '100%'
      }}>
        <div style={{
          padding: '0 1.714em',
          height: '34px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.857em'
        }}>
          <div style={{
            color: 'var(--text-strong)',
            fontSize: '1.871em',
            fontFamily: 'Inter',
            fontWeight: '800',
            userSelect: 'none'
          }}>
            お知らせ
          </div>

          {/* 右上アイコン */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.9em', flexShrink: 0 }}>
            <Icon name="readAll" size="1.571em" />
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5em',
                height: '1.571em',
                padding: 0,
                color: 'var(--text-body)'
              }}
            >
              <img className="icon-ink" src={bellIcon} alt="" aria-hidden="true" draggable={false} style={{ width: '1.571em', height: '1.571em', objectFit: 'contain', display: 'block' }} />
            </div>
            <img draggable={false} style={{ width: '1.571em', height: '1.571em', userSelect: 'none', WebkitUserSelect: 'none' }} className="icon-ink" src={searchIcon} alt="" />
          </div>
        </div>

        {/* フィルターボタン */}
        <div className="no-scrollbar" style={{ padding: '0.571em 1.714em', display: 'flex', gap: '0.571em', overflowX: 'auto' }}>
          {FILTERS.map((filter) => {
            const isActive = filter.id === 'all';
            return (
              <div
                key={filter.id}
                style={{
                  padding: '0.571em 1.143em',
                  borderRadius: '0.857em',
                  flexShrink: 0,
                  backgroundImage: 'none',
                  backgroundColor: isActive ? '#0066cc' : 'var(--surface)',
                  outline: isActive ? 'none' : '1px var(--line) solid',
                  outlineOffset: '-1px',
                  color: isActive ? 'var(--on-accent)' : 'var(--text-muted)',
                  fontSize: '1em',
                  fontWeight: isActive ? '700' : '400',
                  whiteSpace: 'nowrap',
                  boxSizing: 'border-box',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  touchAction: 'manipulation'
                }}
              >
                {filter.label}
              </div>
            );
          })}
        </div>

        {/* プルダウン: 授業・形式 */}
        <div style={{ padding: '0 1.714em', display: 'flex', gap: '0.571em', marginTop: '-0.476em' }}>
          <FilterSelectView allLabel="すべての授業" />
          <FilterSelectView allLabel="すべての形式" />
        </div>
      </header>

      {/* メインコンテンツ部分 */}
      <main style={{
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        padding: '0.857em 1.714em',
        width: '100%',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '0.857em',
        alignContent: 'start'
      }}>
        <div style={{ padding: '3em 0', textAlign: 'center', color: 'var(--text-faint)', gridColumn: '1 / -1', userSelect: 'none' }}>
          読み込み中…
        </div>
      </main>

      {/* ボトムナビゲーション部分 */}
      <BottomNav active="class" />
    </div>
  );
}
