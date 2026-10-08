import React from 'react';
import copyIcon from '../assets/copy.svg';

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
      <img src={copyIcon} alt="copy" style={{ width: '1.3em', height: '1.3em' }} />
    </button>
  );
}