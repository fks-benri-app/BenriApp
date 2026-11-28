// PaddleOCR(PP-OCRv5 mobile)の窓口。文字認識は Web Worker(ocr.worker.js)で動かし、ページを固めない。
// 写真は端末の外に出ない。モデルと実行用の部品は、アプリと同じ配信元(public/ocr/)から読む。
// 外部の CDN には取りに行かない(第三者の配布元に依存しないため)。
// モデル: PaddleOCR の PP-OCRv5 mobile を ONNX にしたもの(Apache-2.0。約21MB)
//   検出 det(.ort)・認識 rec(.onnx。日本語・中国語・英語)・文字の辞書
// 配置と出典は public/ocr/NOTICE.md を参照。
// PDF は、メインスレッドで1ページ目を白背景の画像に描き直してから、同じ経路で読む(読み取り側は変えない)。
// pdf.js は PDF を開くときだけ読み込む。日本語の変換表とフォントは public/pdfjs/ から読む(外部に出ない)。

const BASE = import.meta.env.BASE_URL; // 例: /BenriApp/(vite.config.js の base に合わせる)
const MODEL_BASE = `${BASE}ocr/models`;
const ORT_BASE = `${BASE}ocr/ort/`;
// 実行用の部品(onnxruntime-web 1.30.0)。ort.min.mjs が、同じフォルダの wasm を読む
const ORT_MODULE_URL = `${ORT_BASE}ort.min.mjs`;

// 裏で、読み込みに使うファイルを1つずつ取っておく。読むだけで、動かさない(ページの動きを重くしないため)
export async function prefetchOcrParts() {
  const urls = [
    `${MODEL_BASE}/detection/PP-OCRv5_mobile_det_infer.ort`,
    `${MODEL_BASE}/recognition/PP-OCRv5_mobile_rec_infer.onnx`,
    `${MODEL_BASE}/recognition/ppocrv5_dict.txt`,
    ORT_MODULE_URL,
    `${ORT_BASE}ort-wasm-simd-threaded.mjs`,
    `${ORT_BASE}ort-wasm-simd-threaded.wasm`,
    `${ORT_BASE}ort-wasm-simd-threaded.jsep.mjs`,
    `${ORT_BASE}ort-wasm-simd-threaded.jsep.wasm`,
  ];
  for (const u of urls) {
    try {
      await (await fetch(u, { cache: 'force-cache' })).arrayBuffer(); // 1つずつ(同時に持つ量を減らす)
    } catch { /* 取れなければ、使うときにもう一度読む */ }
  }
}

let worker = null;
let seq = 0;
const pending = new Map(); // 依頼の番号 → { resolve, reject, onStatus }

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('./ocr.worker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => {
      const { id, type, text, items, message, timing } = e.data;
      const job = pending.get(id);
      if (!job) return;
      if (type === 'status') job.onStatus(text);
      else {
        pending.delete(id);
        if (type === 'done') {
          job.onTiming(timing);
          job.resolve(items);
        }
        else job.reject(new Error(message));
      }
    };
    worker.onerror = () => {
      // Worker が落ちたときは、待っている依頼をすべて失敗にし、次は作り直す
      for (const job of pending.values()) job.reject(new Error('文字認識の準備に失敗しました'));
      pending.clear();
      worker.terminate();
      worker = null;
    };
  }
  return worker;
}

const PDF_RENDER_SIDE = 2400; // 描き直すときの長い辺(ocr.worker.js の上限と同じ。大きくしても読みは変わらない)
let pdfjsPromise = null;

// pdf.js は必要になったときだけ読む(起動を重くしないため)
function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const [pdfjs, { default: workerSrc }] = await Promise.all([
        import('pdfjs-dist/build/pdf.mjs'),
        import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
      ]);
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      return pdfjs;
    })().catch((e) => {
      pdfjsPromise = null; // 失敗したときは、次にやり直せるようにする
      throw e;
    });
  }
  return pdfjsPromise;
}

// PDF の1ページ目を、白背景の PNG にする。文字の周りが透明だと、読みが崩れるため白で塗る
async function pdfFirstPageToPng(file) {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({
    data,
    cMapUrl: `${BASE}pdfjs/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${BASE}pdfjs/standard_fonts/`,
  }).promise;
  try {
    const page = await doc.getPage(1);
    const natural = page.getViewport({ scale: 1 });
    const scale = PDF_RENDER_SIDE / Math.max(natural.width, natural.height);
    const viewport = page.getViewport({ scale });
    const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    page.cleanup();
    return new File([blob], 'page1.png', { type: 'image/png' });
  } finally {
    await doc.destroy();
  }
}

function sendToWorker(file, fine, onStatus, onTiming) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onStatus, onTiming });
    getWorker().postMessage({ id, file, fine });
  });
}

// 写真か PDF を読んで、行ごとの { text, confidence(0〜100), bbox: {x0,y0,x1,y1} } を返す。文字認識は Worker で行う
export async function recognizeWithPaddle(file, { fine = true } = {}, onStatus = () => {}, onTiming = () => {}) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '');
  if (isPdf) onStatus('PDF を画像にしています…');
  const image = isPdf ? await pdfFirstPageToPng(file) : file;
  return sendToWorker(image, fine, onStatus, onTiming);
}
