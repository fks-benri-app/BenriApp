// 時間割の文字認識を、画面とは別のスレッド(Web Worker)で動かす。重い計算で、ほかのページが固まらないようにする。
// 写真は端末の中だけで読む。モデルと実行用の部品は public/ocr/ から読む(paddleOcr.js と同じ場所)。
import { PaddleOcrService } from 'paddleocr';

const BASE = import.meta.env.BASE_URL;
const MODEL_BASE = `${BASE}ocr/models`;
const ORT_BASE = `${BASE}ocr/ort/`;
const ORT_MODULE_URL = `${ORT_BASE}ort.min.mjs`;
const MAX_PIXEL_SIDE = 2400; // 写真の長い辺がこれより大きいときは縮める(スマホの写真は大きいので)

let servicePromise = null;

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`読み込めませんでした (${res.status}): ${url}`);
  return res.arrayBuffer();
}

// 読み込みは1回だけ(2回目以降は、読み込み済みのものを使う)
function loadService(post) {
  if (!servicePromise) {
    servicePromise = (async () => {
      post({ type: 'status', text: 'モデルを読み込み中…(初回だけ約20MB)' });
      const ort = await import(/* @vite-ignore */ ORT_MODULE_URL);
      ort.env.wasm.wasmPaths = ORT_BASE;
      ort.env.wasm.numThreads = 1; // 複数スレッドには、特別な HTTP ヘッダーが要るので使わない
      const [detModel, recModel, dictText] = await Promise.all([
        fetchBuffer(`${MODEL_BASE}/detection/PP-OCRv5_mobile_det_infer.ort`),
        fetchBuffer(`${MODEL_BASE}/recognition/PP-OCRv5_mobile_rec_infer.onnx`),
        fetch(`${MODEL_BASE}/recognition/ppocrv5_dict.txt`).then((r) => {
          if (!r.ok) throw new Error(`辞書を読み込めませんでした (${r.status})`);
          return r.text();
        }),
      ]);
      // 辞書の1行目は、CTC の「空白」の場所を取る印(文字ではない)。
      // 先頭を空白("")に直し、最後にスペースを足すと、モデルの出力(文字数+2)と並びが合う
      const lines = dictText.split(/\r?\n/);
      if (lines[lines.length - 1] === '') lines.pop();
      const dictionary = ['', ...lines.slice(1), ' '];
      post({ type: 'status', text: '文字認識を準備中…' });
      return PaddleOcrService.createInstance({
        ort,
        modelPreset: 'PP-OCRv5_mobile',
        detection: { modelBuffer: detModel },
        recognition: { modelBuffer: recModel, charactersDictionary: dictionary },
      });
    })().catch((e) => {
      servicePromise = null; // 失敗したときは、次に押したときにやり直せるようにする
      throw e;
    });
  }
  return servicePromise;
}

// 写真(ファイル)を、画素の並びにする。スマホの写真の向き(EXIF)に合わせて回す
async function fileToPixels(file) {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_PIXEL_SIDE / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale);
  const height = Math.round(bmp.height * scale);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const { data } = ctx.getImageData(0, 0, width, height);
  return { width, height, data: new Uint8Array(data.buffer) };
}

// 検出の設定。fine を true にすると、小さい文字や薄い文字の取りこぼしが減る一方、余計な枠が増えることもある
function detectionOptions(fine) {
  return fine ? { maxSideLength: 1600, boxScoreThreshold: 0.3, unclipRatio: 2.0 } : {};
}

self.onmessage = async (e) => {
  const { id, file, fine } = e.data;
  const post = (msg) => self.postMessage({ id, ...msg });
  try {
    const service = await loadService(post);
    post({ type: 'status', text: '写真を読み込み中…' });
    const pixels = await fileToPixels(file);
    post({ type: 'status', text: '文字を探しています…' });
    const results = await service.recognize(pixels, {
      detection: detectionOptions(fine),
      onProgress(p) {
        if (p.type === 'det') post({ type: 'status', text: '文字を探しています…' });
        else if (p.type === 'rec' && p.progress) post({ type: 'status', text: `読み取り中 ${p.progress.current}/${p.progress.total}` });
      },
    });
    const items = results
      .filter((r) => r.text && r.text.trim())
      .map((r) => ({
        text: r.text.trim(),
        confidence: Math.round(r.confidence * 100),
        bbox: { x0: r.box.x, y0: r.box.y, x1: r.box.x + r.box.width, y1: r.box.y + r.box.height },
      }));
    post({ type: 'done', items });
  } catch (err) {
    post({ type: 'error', message: err?.message || String(err) });
  }
};
