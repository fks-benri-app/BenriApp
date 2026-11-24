// 文字をクリップボードにコピーするボタン。
import React from 'react';
import Icon from './Icon';

export default function CopyButton({ textToCopy }) {
  const handleCopy = async (e) => {
    e.stopPropagation();
    if (!textToCopy) return;

    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(textToCopy);
      }
    } catch (err) {
      console.error('コピーに失敗しました', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      title="テキストをコピー"
      style={{
        position: 'absolute',
        bottom: '0.8em',
        right: '0.8em',
        background: 'none',
        border: 'none',
        padding: '0.4em',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.6,
        transition: 'opacity 0.2s',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      <Icon name="copy" size="1.3em" />
    </button>
  );
}