import React, { useState } from 'react';
import { KIND_OPTIONS } from '../../lib/announce/filters';

// 詳細画面(カードを押すと開く小窓。Classroom の投稿ページの見た目に合わせてある)

// カードに出す形式の名前
export const KIND_LABELS = Object.fromEntries(KIND_OPTIONS.map((k) => [k.id, k.label]));

export const GOOGLE_FONT = "'Google Sans', Roboto, 'Hiragino Sans', 'Noto Sans JP', 'Yu Gothic UI', Arial, sans-serif";

const ICON_PATHS = {
  close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  open: 'M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
  announcement: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
  assignment: 'M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
  material: 'M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z',
  file: 'M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
  link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z',
  youtube: 'M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z',
  doneAll: 'M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z',
  form: 'M3 3v18h18V3H3zm7 14H6v-2h4v2zm0-4H6v-2h4v2zm0-4H6V7h4v2zm8 8h-6v-2h6v2zm0-4h-6v-2h6v2zm0-4h-6V7h6v2z',
};

export function Icon({ name, size = 24, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true" focusable="false" style={{ display: 'block', flexShrink: 0 }}>
      <path d={ICON_PATHS[name] || ICON_PATHS.file} />
    </svg>
  );
}

// 投稿の種類ごとの丸いアイコンの色(Classroom の配色)
const POST_STYLES = {
  announcement: { icon: 'announcement', bg: '#e7f2ff', fg: '#1157ce' },
  assignment: { icon: 'assignment', bg: '#d0e4ff', fg: '#04409f' },
  material: { icon: 'material', bg: '#ffdcc3', fg: '#9a4600' },
  other: { icon: 'announcement', bg: '#e3e3e3', fg: '#1b1b1c' },
};

const URL_RE = /(https?:\/\/[^\s<>"' ]+)/g;

// 本文は整形せず、そのまま出す(改行・空白は保つ)。URL だけリンクにする。
// 例外: 番号つきの行が2行以上つづく所は、番号をそろえた箇条書きにする。次の形に対応
//   「1.功利主義」「1)」「（1）」「①」(番号のあとに文章)
//   「1.」だけの行のあとに文章が来る形(Word からの貼り付けなど。間の空行は詰める)
//   「1ヘーゲル」のように区切りなしで1から順に並ぶ形
const NUM_RE = '[0-9０-９]{1,3}';
const LIST_RE = new RegExp('^[ \\t\\u3000]*(' + NUM_RE + '(?:[.．](?![0-9０-９])|[)）、])|[（(]' + NUM_RE + '[)）]|[①-⑳])[ \\t\\u3000]*(\\S.*)$');
const MARKER_ONLY_RE = new RegExp('^[ \\t\\u3000]*(' + NUM_RE + '(?:[.．]|[)）、])|[（(]' + NUM_RE + '[)）]|[①-⑳])[ \\t\\u3000]*$');
const PLAIN_NUM_RE = new RegExp('^[ \\t\\u3000]*(' + NUM_RE + ')(?![0-9０-９.．)）、])[ \\t\\u3000]*([^0-9０-９\\s月日年時分秒%％:：/／\\-].*)$');

function markerNumber(marker) {
  const c = marker.charCodeAt(0);
  if (c >= 0x2460 && c <= 0x2473) return c - 0x2460 + 1; // ①-⑳
  const d = marker.replace(/[^0-9０-９]/g, '').replace(/[０-９]/g, (x) => String(x.charCodeAt(0) - 0xFF10));
  return d ? parseInt(d, 10) : NaN;
}

const isBlank = (l) => l.trim() === '';

// lines[i] から始まる箇条書きの1項目を読む。読めなければ null
function parseItem(lines, i) {
  const line = lines[i];
  let m = LIST_RE.exec(line);
  if (m) return { kind: 'marked', n: markerNumber(m[1]), marker: m[1], body: m[2].trim(), next: i + 1 };
  m = MARKER_ONLY_RE.exec(line);
  if (m) {
    let j = i + 1;
    while (j < lines.length && isBlank(lines[j])) j += 1;
    if (j < lines.length && !MARKER_ONLY_RE.test(lines[j]) && !LIST_RE.test(lines[j])) {
      return { kind: 'marked', n: markerNumber(m[1]), marker: m[1], body: lines[j].trim(), next: j + 1 };
    }
    return null;
  }
  m = PLAIN_NUM_RE.exec(line);
  if (m) {
    const n = parseInt(m[1].replace(/[０-９]/g, (x) => String(x.charCodeAt(0) - 0xFF10)), 10);
    return { kind: 'plain', n, marker: `${n}.`, body: m[2].trim(), next: i + 1 };
  }
  return null;
}

// lines[i] から始まる箇条書きを集める。2項目に満たなければ null
function collectList(lines, i) {
  const items = [];
  let j = i;
  let prevN = null;
  while (j < lines.length) {
    let it = parseItem(lines, j);
    if (!it && items.length > 0) {
      // 空行をはさんで、次の番号(前の番号+1)が来ていれば同じ箇条書きとして続ける
      let k = j;
      while (k < lines.length && isBlank(lines[k])) k += 1;
      if (k > j && k < lines.length) {
        const it2 = parseItem(lines, k);
        if (it2 && (it2.kind === 'plain' ? it2.n === prevN + 1 : it2.n > prevN)) it = it2;
      }
    }
    if (!it) break;
    if (items.length === 0 && it.kind === 'plain' && it.n !== 1) break; // 区切りなしは1から始まるものだけ
    if (items.length > 0 && (it.kind === 'plain' || items[items.length - 1].kind === 'plain') && it.n !== prevN + 1) break;
    items.push(it);
    prevN = it.n;
    j = it.next;
  }
  return items.length >= 2 ? { items, end: j } : null;
}

function Linkified({ text, onOpenUrl }) {
  const parts = String(text || '').split(URL_RE);
  return parts.map((p, i) =>
    i % 2 === 1 ? (
      <a
        key={i}
        href={p}
        onClick={(e) => { e.preventDefault(); onOpenUrl(p); }}
        style={{ color: 'var(--link)', textDecoration: 'underline' }}
      >
        {p}
      </a>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    )
  );
}

function PostText({ text, onOpenUrl }) {
  const lines = String(text || '').split(/\r?\n/);
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const list = collectList(lines, i);
    if (list) {
      blocks.push({ list: list.items, key: i });
      i = list.end;
      continue;
    }
    blocks.push({ line: lines[i], key: i });
    i += 1;
  }
  return blocks.map((b) =>
    b.list ? (
      <div key={b.key} style={{ margin: '4px 0' }}>
        {b.list.map((it, k) => (
          <div key={k} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', paddingLeft: '8px' }}>
            <span style={{ flexShrink: 0, minWidth: '2em', textAlign: 'right' }}>{it.marker}</span>
            <span style={{ flex: 1, minWidth: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              <Linkified text={it.body} onOpenUrl={onOpenUrl} />
            </span>
          </div>
        ))}
      </div>
    ) : (
      <div key={b.key} style={{ minHeight: '20px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
        <Linkified text={b.line} onOpenUrl={onOpenUrl} />
      </div>
    )
  );
}

function attachmentLabel(f) {
  if (f.type === 'youtube') return 'YouTube';
  if (f.type === 'link') return 'リンク';
  if (f.type === 'form') return 'Google フォーム';
  const ext = (String(f.title || '').match(/\.([A-Za-z0-9]{2,5})$/) || [])[1]?.toLowerCase();
  const map = { pdf: 'PDF', jpg: '画像', jpeg: '画像', png: '画像', gif: '画像', heic: '画像', doc: 'Word', docx: 'Word', xls: 'Excel', xlsx: 'Excel', ppt: 'PowerPoint', pptx: 'PowerPoint', mp4: '動画', mov: '動画' };
  return map[ext] || 'Google ドライブ';
}

function AttachmentCard({ f, onOpenUrl }) {
  const iconName = f.type === 'youtube' ? 'youtube' : f.type === 'link' ? 'link' : f.type === 'form' ? 'form' : 'file';
  // サムネイル(画像など)があれば、アイコンの代わりに出す。読み込めなかったらアイコンに戻す
  const [thumbFailed, setThumbFailed] = useState(false);
  const showThumb = !!f.thumb && !thumbFailed;
  return (
    <button
      type="button"
      onClick={() => onOpenUrl(f.url)}
      style={{
        display: 'flex', alignItems: 'stretch', width: '100%', minHeight: '72px', padding: 0, textAlign: 'left',
        background: 'var(--surface)', border: '1px solid var(--line-strong)', borderRadius: '8px', overflow: 'hidden',
        cursor: 'pointer', font: 'inherit', color: 'inherit', touchAction: 'manipulation'
      }}
    >
      <span style={{ width: '88px', flexShrink: 0, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-body)', borderRight: '1px solid var(--line-strong)', position: 'relative' }}>
        {showThumb ? (
          <img
            src={f.thumb}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setThumbFailed(true)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Icon name={iconName} size={32} />
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0, padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px' }}>
        <span style={{ fontSize: '14px', lineHeight: '20px', fontWeight: 500, color: 'var(--text-strong)', wordBreak: 'break-all' }}>{f.title || f.url}</span>
        <span style={{ fontSize: '12px', lineHeight: '16px', color: 'var(--text-body)' }}>{attachmentLabel(f)}</span>
      </span>
    </button>
  );
}

const SHEET_CSS = '@keyframes sheetUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes fadeIn{from{opacity:0}to{opacity:1}}';

export function DetailView({ ann, onBack, onOpenClassroom, onOpenUrl }) {
  const style = POST_STYLES[ann.kind] || POST_STYLES.other;
  const attachments = ann.attachments || [];
  const isAnnouncement = ann.kind === 'announcement';
  // 本家と同じ: お知らせの見出しは「お知らせ」、課題・資料は投稿のタイトル
  const heading = isAnnouncement ? 'お知らせ' : (ann.postTitle || ann.title || KIND_LABELS[ann.kind] || '投稿');
  const text = ann.rawBody || (isAnnouncement ? (ann.body || ann.content) : (ann.bodyOnly || ''));
  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', fontFamily: GOOGLE_FONT }}
    >
      <style>{SHEET_CSS}</style>
      {/* 後ろの暗い部分(押すと閉じる) */}
      <div onClick={onBack} style={{ position: 'absolute', inset: 0, background: 'var(--overlay)', animation: 'fadeIn .18s ease-out' }} />
      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column', background: 'var(--surface)',
        height: 'calc(100% - max(2.2rem, env(safe-area-inset-top)))', borderRadius: '16px 16px 0 0',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.2)', overflow: 'hidden', animation: 'sheetUp .22s ease-out'
      }}>
        <header style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 8px 8px 8px', borderBottom: '1px solid #e3e3e3' }}>
          <button type="button" onClick={onBack} aria-label="閉じる" style={{ width: '48px', height: '48px', border: 'none', background: 'transparent', borderRadius: '50%', color: 'var(--text-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation' }}>
            <Icon name="close" />
          </button>
          <div style={{ flex: 1, minWidth: 0, fontSize: '14px', fontWeight: 500, color: 'var(--text-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ann.courseFull || ann.subject}
          </div>
          <button type="button" onClick={onOpenClassroom} aria-label="Classroomで開く" style={{ width: '48px', height: '48px', border: 'none', background: 'transparent', borderRadius: '50%', color: 'var(--text-body)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', touchAction: 'manipulation' }}>
            <Icon name="open" />
          </button>
        </header>

        <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch', padding: '24px 16px calc(24px + env(safe-area-inset-bottom))' }}>
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            {/* 見出し: 丸いアイコン + タイトル */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: style.bg, color: style.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px', flexShrink: 0 }}>
                <Icon name={style.icon} size={24} />
              </div>
              <h1 style={{ margin: 0, fontSize: '28px', lineHeight: '36px', fontWeight: 400, color: 'var(--text-strong)', overflowWrap: 'anywhere' }}>{heading}</h1>
            </div>
            {/* 投稿者 • 日付 (+ 期限) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', columnGap: '8px', rowGap: '8px', marginBottom: '16px', fontSize: '14px', lineHeight: '20px', color: 'var(--text-body)' }}>
              {ann.teacher && <span>{ann.teacher}</span>}
              {ann.teacher && <span aria-hidden="true">•</span>}
              <span>{ann.time}</span>
              {ann.due && <span style={{ marginLeft: 'auto', color: 'var(--text-strong)' }}>期限: {ann.due}</span>}
            </div>
            <div style={{ borderBottom: '1px solid var(--line-strong)', marginBottom: '16px' }} />

            {/* 本文: 整形なし */}
            {text && (
              <div style={{ marginBottom: '16px', fontSize: '14px', lineHeight: '20px', color: 'var(--text-strong)' }}>
                <PostText text={text} onOpenUrl={onOpenUrl} />
              </div>
            )}

            {/* 添付 */}
            {attachments.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {attachments.map((f, i) => <AttachmentCard key={i} f={f} onOpenUrl={onOpenUrl} />)}
              </div>
            )}

            <button
              type="button"
              onClick={onOpenClassroom}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '8px', padding: '10px 24px', borderRadius: '100px', border: '1px solid #747775', background: 'var(--surface)', color: 'var(--link)', fontFamily: 'inherit', fontSize: '14px', fontWeight: 500, cursor: 'pointer', touchAction: 'manipulation' }}
            >
              <Icon name="open" size={18} />
              Classroomで開く
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
