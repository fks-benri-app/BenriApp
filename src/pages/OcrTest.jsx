import { Fragment, useEffect, useMemo, useState } from 'react';
import { coverage, matchLines } from '../lib/timetableMatch';
import { buildGrid } from '../lib/timetableGrid';

// 時間割の読み取りのテスト画面(保存はしない。写真は端末の中だけで読む)
// 開き方: アプリの「#/ocr-test」へ行く
// 読み取りには、日本語の文字認識データ(初回だけ CDN から読み込む)を使う

const DEFAULT_CANDIDATES = [
  '2年数学β(F)', '2年数学α(F)', '論理・表現Ⅱ(F)', '2年古典探究(F)', '2年体育(CF2)', '2年物理(F)',
  '2年論理国語(F)', '2年化学(F)', '英語コミュⅡ(F)', '2年保健(F)', '公共(F)', '地理探究(F)',
  'LHR（2年7組）', '2年総合的な探究',
].join('\n');

const DAY_LABELS = ['月', '火', '水', '木', '金', '土'];
const PERIODS = 7;

const box = { borderRadius: 14, background: 'var(--surface-2)', padding: '1em', display: 'flex', flexDirection: 'column', gap: '0.6em' };
const label = { fontSize: '0.857em', fontWeight: 600, color: 'var(--text-muted)' };
const pickBtn = {
  borderRadius: 999, padding: '0.6em 1.1em', background: 'var(--surface)', color: '#0066cc',
  border: '1px solid var(--line-strong)', fontWeight: 600, fontSize: '0.929em', cursor: 'pointer', position: 'relative', overflow: 'hidden',
};
const hiddenInput = { position: 'absolute', inset: 0, opacity: 0, width: '100%', height: '100%', cursor: 'pointer' };

export default function OcrTest() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [candidatesText, setCandidatesText] = useState(DEFAULT_CANDIDATES);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [raw, setRaw] = useState(null); // { text, lines: [{text, confidence}], words: [{text, confidence, bbox}] }
  const [edits, setEdits] = useState({}); // 授業表で手で直したマス: { 'r-c': 候補名 | '' }

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
  const grid = useMemo(() => (raw ? buildGrid(raw.words, candidates, { days: DAY_LABELS.length, periods: PERIODS }) : null), [raw, candidates]);

  function onPick(e) {
    setFile(e.target.files?.[0] || null);
    setRaw(null);
    setEdits({});
    setError('');
    e.target.value = ''; // 同じ写真を選び直したときも、変更として扱う
  }

  async function run() {
    if (!file) return;
    setBusy(true);
    setError('');
    setRaw(null);
    setEdits({});
    setProgress('文字認識を準備中…');
    let worker = null;
    try {
      const { createWorker } = await import('tesseract.js');
      // 日本語データは fast 版を使う(表の組み立てで、best 版より行がずれにくかった)
      worker = await createWorker('jpn', 1, {
        langPath: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/jpn/4.0.0',
        logger: (m) => {
          if (m.status) setProgress(`${m.status}${m.progress ? ` ${Math.round(m.progress * 100)}%` : ''}`);
        },
      });
      const { data } = await worker.recognize(file, {}, { text: true, blocks: true });
      const lines = [];
      const words = [];
      for (const b of data.blocks || []) {
        for (const p of b.paragraphs || []) {
          for (const l of p.lines || []) {
            if (l.text.trim()) lines.push({ text: l.text.trim(), confidence: l.confidence });
            for (const w of l.words || []) {
              if (w.text.trim()) words.push({ text: w.text.trim(), confidence: w.confidence, bbox: w.bbox });
            }
          }
        }
      }
      setRaw({ text: data.text, lines, words });
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
          <div style={{ display: 'flex', gap: '0.6em', flexWrap: 'wrap' }}>
            <label style={pickBtn}>
              写真ライブラリから選ぶ
              <input type="file" accept="image/*" onChange={onPick} style={hiddenInput} />
            </label>
            <label style={pickBtn}>
              カメラで撮る
              <input type="file" accept="image/*" capture="environment" onChange={onPick} style={hiddenInput} />
            </label>
          </div>
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
            {grid && (
              <div style={box}>
                <div style={label}>4. 授業表(読み取りを曜日×時限に組み立てたもの)</div>
                <div style={{ fontSize: '0.786em', color: 'var(--text-muted)' }}>
                  候補と合わない(要確認)マス: {grid.rows.reduce((n, r) => n + r.cells.filter((c) => !c.match && c.raw).length, 0)}件。
                  マスを選び直すと直せます。
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: `2.2em repeat(${DAY_LABELS.length}, 1fr)`, gap: 4, alignItems: 'stretch' }}>
                  <div />
                  {DAY_LABELS.map((d) => <div key={d} style={{ textAlign: 'center', fontSize: '0.786em', fontWeight: 700, color: 'var(--text-muted)' }}>{d}</div>)}
                  {grid.rows.map((row) => (
                    <Fragment key={row.period}>
                      <div style={{ fontSize: '0.714em', color: 'var(--text-muted)', alignSelf: 'center' }}>{row.period}限</div>
                      {row.cells.map((cell) => {
                        const key = `${row.period}-${cell.day}`;
                        const value = key in edits ? edits[key] : (cell.match ? cell.match.candidate : '');
                        const sure = !(key in edits) && cell.match && cell.match.dist === 0;
                        const unsure = !(key in edits) && (!cell.match && cell.raw);
                        return (
                          <div key={key} style={{ background: 'var(--surface)', borderRadius: 8, padding: 3, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0,
                            outline: unsure ? '1px solid #f59e0b' : 'none' }}>
                            <select
                              value={value}
                              onChange={(e) => setEdits((prev) => ({ ...prev, [key]: e.target.value }))}
                              style={{ width: '100%', minWidth: 0, fontSize: '0.643em', color: sure ? '#15803d' : 'var(--text-strong)', border: 'none', background: 'transparent', padding: 0 }}
                            >
                              <option value="">（空き）</option>
                              {candidates.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            {unsure && <div style={{ fontSize: '0.6em', color: '#b45309', wordBreak: 'break-all' }}>{cell.raw.slice(0, 10)}</div>}
                          </div>
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            )}

            <div style={box}>
              <div style={label}>5. 候補ごとの見つかり方(近さ 0 がぴったり一致)</div>
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
              <div style={label}>6. 読み取った行(信頼度・近い候補)</div>
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
              <summary style={{ ...label, cursor: 'pointer' }}>7. 読み取りの生の文字</summary>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.786em', color: 'var(--text-strong)', margin: 0 }}>{raw.text}</pre>
            </details>
          </>
        )}
      </div>
    </div>
  );
}
