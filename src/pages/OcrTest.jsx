import { useEffect, useMemo, useState } from 'react';
import { coverage, matchLines } from '../lib/timetableMatch';

// 時間割の読み取りのテスト画面(保存はしない。写真は端末の中だけで読む)
// 開き方: アプリの「#/ocr-test」へ行く
// 読み取りには、日本語の文字認識データ(初回だけ CDN から読み込む)を使う

const DEFAULT_CANDIDATES = [
  '2年数学β(F)', '2年数学α(F)', '論理・表現Ⅱ(F)', '2年古典探究(F)', '2年体育(CF2)', '2年物理(F)',
  '2年論理国語(F)', '2年化学(F)', '英語コミュⅡ(F)', '2年保健(F)', '公共(F)', '地理探究(F)',
  'LHR（2年7組）', '2年総合的な探究',
].join('\n');

const box = { borderRadius: 14, background: 'var(--surface-2)', padding: '1em', display: 'flex', flexDirection: 'column', gap: '0.6em' };
const label = { fontSize: '0.857em', fontWeight: 600, color: 'var(--text-muted)' };

export default function OcrTest() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [candidatesText, setCandidatesText] = useState(DEFAULT_CANDIDATES);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [raw, setRaw] = useState(null); // { text, lines: [{text, confidence}] }

  // 選んだ写真のプレビュー(使い終わったら解放する)
  useEffect(() => {
    if (!file) { setPreviewUrl(''); return undefined; }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const candidates = useMemo(
    () => candidatesText.split('\n').map((s) => s.trim()).filter(Boolean),
    [candidatesText],
  );
  const lineResults = useMemo(() => (raw ? matchLines(raw.lines, candidates) : []), [raw, candidates]);
  const cover = useMemo(() => (raw ? coverage(lineResults, candidates) : []), [raw, lineResults, candidates]);

  async function run() {
    if (!file) return;
    setBusy(true);
    setError('');
    setRaw(null);
    setProgress('文字認識を準備中…');
    let worker = null;
    try {
      const { createWorker } = await import('tesseract.js');
      worker = await createWorker('jpn', 1, {
        logger: (m) => {
          if (m.status) setProgress(`${m.status}${m.progress ? ` ${Math.round(m.progress * 100)}%` : ''}`);
        },
      });
      const { data } = await worker.recognize(file, {}, { text: true, blocks: true });
      const lines = [];
      for (const b of data.blocks || []) {
        for (const p of b.paragraphs || []) {
          for (const l of p.lines || []) {
            if (l.text.trim()) lines.push({ text: l.text.trim(), confidence: l.confidence });
          }
        }
      }
      setRaw({ text: data.text, lines });
    } catch (e) {
      setError(`読み取りに失敗しました: ${e?.message || e}`);
    } finally {
      if (worker) await worker.terminate().catch(() => {});
      setBusy(false);
      setProgress('');
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, overflowY: 'auto', background: 'var(--surface)', padding: '2em 1.143em 3em', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: '1.571em', fontWeight: 800, color: 'var(--text-strong)', margin: '0 0 0.3em' }}>時間割の読み取りテスト</h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.857em', margin: '0 0 1em' }}>
        写真は保存しません。授業名の候補との近さで、読み取りの当たり外れを確かめます。
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9em' }}>
        <div style={box}>
          <div style={label}>1. 写真を選ぶ(または撮る)</div>
          <input type="file" accept="image/*" capture="environment" onChange={(e) => { setFile(e.target.files?.[0] || null); setRaw(null); }} />
          {previewUrl && <img src={previewUrl} alt="選んだ写真" style={{ width: '100%', borderRadius: 12, maxHeight: 360, objectFit: 'contain', background: 'var(--surface)' }} />}
        </div>

        <div style={box}>
          <div style={label}>2. 授業名の候補(1行に1つ)</div>
          <textarea
            value={candidatesText}
            onChange={(e) => setCandidatesText(e.target.value)}
            rows={10}
            style={{ width: '100%', boxSizing: 'border-box', borderRadius: 12, border: '1px solid var(--line)', padding: '0.7em', background: 'var(--surface)', color: 'var(--text-strong)', fontSize: '0.929em', fontFamily: 'inherit' }}
          />
        </div>

        <button
          type="button"
          onClick={run}
          disabled={!file || busy}
          style={{
            border: 'none', borderRadius: 999, padding: '0.9em', background: !file || busy ? 'var(--line-strong)' : '#0066cc',
            color: '#ffffff', fontWeight: 600, fontSize: '1em', cursor: !file || busy ? 'default' : 'pointer',
          }}
        >
          {busy ? '読み取り中…' : '3. 読み取る'}
        </button>
        {busy && <div style={{ color: 'var(--text-muted)', fontSize: '0.857em' }}>{progress}</div>}
        {error && <div style={{ color: '#b91c1c', fontSize: '0.929em' }}>{error}</div>}

        {raw && (
          <>
            <div style={box}>
              <div style={label}>4. 候補ごとの見つかり方(近さ 0 がぴったり一致)</div>
              {cover.map((c) => (
                <div key={c.candidate} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.6em', fontSize: '0.929em', alignItems: 'baseline' }}>
                  <span style={{ color: 'var(--text-strong)', fontWeight: 600, minWidth: 0 }}>{c.candidate}</span>
                  {c.found ? (
                    <span style={{ color: c.found.dist === 0 ? '#15803d' : '#0066cc', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      近さ {c.found.dist}{c.found.near.length ? `(他と同じくらい: ${c.found.near.length})` : ''}
                    </span>
                  ) : (
                    <span style={{ color: '#b91c1c', fontWeight: 600, whiteSpace: 'nowrap' }}>見つからない</span>
                  )}
                </div>
              ))}
            </div>

            <div style={box}>
              <div style={label}>5. 読み取った行(信頼度・近い候補)</div>
              {raw.lines.map((l, i) => {
                const r = lineResults[i];
                return (
                  <div key={i} style={{ borderTop: i ? '1px solid var(--line)' : 'none', paddingTop: i ? '0.5em' : 0, fontSize: '0.857em' }}>
                    <div style={{ color: 'var(--text-strong)', wordBreak: 'break-all' }}>{l.text}</div>
                    <div style={{ color: 'var(--text-muted)' }}>
                      信頼度 {Math.round(l.confidence)}%
                      {r?.hits.length ? ` ・ 近い候補: ${r.hits.slice(0, 3).map((h) => `${h.candidate}(${h.dist})`).join(' / ')}` : ' ・ 候補なし'}
                    </div>
                  </div>
                );
              })}
            </div>

            <details style={box}>
              <summary style={{ ...label, cursor: 'pointer' }}>6. 読み取りの生の文字</summary>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.786em', color: 'var(--text-strong)', margin: 0 }}>{raw.text}</pre>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
