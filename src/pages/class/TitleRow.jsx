import React from 'react';
import { t } from '../../lib/ui/text';
import searchIcon from '../../assets/images/icons/search.svg';
import bellIcon from '../../assets/images/icons/bell.svg';
import bellOffIcon from '../../assets/images/icons/bell-off.svg';
import readAllIcon from '../../assets/images/icons/read-all.svg';
import { useNavigate } from 'react-router-dom';

export default function TitleRow({ searchOpen, searchInputRef, query, setQuery, closeSearch, readAllShown, unreadShown, devicePushOn, openSearch }) {
  const navigate = useNavigate();
  return (
    <div style={{
      padding: '0 1.714em',
      height: '34px', // 検索を開いても高さが変わらないよう固定
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '0.857em'
    }}>
      {searchOpen ? (
        <>
          <input
            ref={searchInputRef}
            type="text"
            inputMode="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') closeSearch(); }}
            placeholder={t('class.searchPlaceholder')}
            aria-label={t('class.searchLabel')}
            enterKeyHint="search"
            style={{
              flex: 1,
              minWidth: 0,
              height: '40px',
              padding: '0 1em',
              border: 'none',
              outline: 'none',
              borderRadius: '0.857em',
              background: 'var(--surface-2)',
              color: 'var(--text-strong)',
              fontSize: '16px', // 16px未満だと iPhone でフォーカス時に画面が拡大される
              fontFamily: 'inherit',
              boxSizing: 'border-box',
              WebkitAppearance: 'none'
            }}
          />
          <div
            role="button"
            tabIndex={0}
            onClick={closeSearch}
            onKeyDown={(e) => { if (e.key === 'Enter') closeSearch(); }}
            style={{
              flexShrink: 0,
              color: 'var(--text-muted)',
              fontSize: '1em',
              fontWeight: '600',
              cursor: 'pointer',
              userSelect: 'none',
              WebkitUserSelect: 'none',
              touchAction: 'manipulation'
            }}
          >
            キャンセル
          </div>
        </>
      ) : (
        <>
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
            {/* 一斉既読(ベル・検索と同じ並び。未読がないときは薄くして押せなくする) */}
            <button
              type="button"
              onClick={readAllShown}
              disabled={unreadShown.length === 0}
              aria-label={t('class.readAll')}
              title={t('class.readAll')}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '1.571em', height: '1.571em', padding: 0, border: 'none', background: 'transparent',
                fontSize: 'inherit', opacity: unreadShown.length === 0 ? 0.35 : 1,
                cursor: unreadShown.length === 0 ? 'default' : 'pointer', touchAction: 'manipulation'
              }}
            >
              <img className="icon-ink" src={readAllIcon} alt="" aria-hidden="true" draggable={false} style={{ width: '100%', height: '100%' }} />
            </button>
            <button
              type="button"
              onClick={() => navigate('/settings/notify', { state: { from: '/class' } })}
              aria-label={devicePushOn ? '通知設定' : t('common.bellOff')}
              title={devicePushOn ? '通知設定' : t('common.bellOff')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '2.5em',
                height: '1.571em',
                padding: 0,
                border: 'none',
                background: 'transparent',
                fontSize: 'inherit', // ボタンは既定で文字サイズを継承しないため、em の基準を揃える
                color: 'var(--text-body)',
                cursor: 'pointer',
                touchAction: 'manipulation'
              }}
            >
              <img
                className="icon-ink"
                src={devicePushOn ? bellIcon : bellOffIcon}
                alt=""
                aria-hidden="true"
                draggable={false}
                style={{ width: '1.571em', height: '1.571em', objectFit: 'contain', display: 'block' }}
              />
            </button>
            <img
              draggable={false}
              role="button"
              tabIndex={0}
              onClick={openSearch}
              onKeyDown={(e) => { if (e.key === 'Enter') openSearch(); }}
              style={{
                width: '1.571em',
                height: '1.571em',
                cursor: 'pointer',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                touchAction: 'manipulation'
              }}
              className="icon-ink"
              src={searchIcon}
              alt="検索"
            />
          </div>
        </>
      )}
    </div>
  );
}
