// PaddleOCR(PP-OCRv5 mobile)を、ブラウザの中で動かす(時間割の読み取りのテスト用)
// 写真は端末の外に出ない。モデルと実行用の部品だけを、CDN(jsDelivr)から初回に読み込む。
// モデル: pdfmarkdown-ppocrv5-models(PaddleOCR の PP-OCRv5 mobile を ONNX にしたもの。Apache-2.0。約20MB)
//   検出 det(.ort)・認識 rec(.onnx。日本語・中国語・英語)・文字の辞書

const ORT_VERSION = '1.30.0'; // package.json の onnxruntime-web に合わせる
const MODEL_BASE = 'https://cdn.jsdelivr.net/npm/pdfmarkdown-ppocrv5-models@1.0.0';
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
// 実行用の部品(onnxruntime-web。WebAssembly が約28MB)は、アプリに含めず、CDN から直接読み込む
// (アプリに含めると、配信するファイルが大きくなるため)
const ORT_MODULE_URL = `${ORT_BASE}ort.min.mjs`;
const MAX_PIXEL_SIDE = 2400; // 写真の長い辺がこれより大きいときは縮める(スマホの写真は大きいので)

let servicePromise = null;

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`読み込めませんでした (${res.status}): ${url}`);
  return res.arrayBuffer();
}

// 読み込みは1回だけ(2回目以降は、読み込み済みのものを使う)
export function loadPaddle(onStatus = () => {}) {
  if (!servicePromise) {
    servicePromise = (async () => {
      onStatus('モデルを読み込み中…(初回だけ約20MB)');
      const [{ PaddleOcrService }, ort] = await Promise.all([import('paddleocr'), import(/* @vite-ignore */ ORT_MODULE_URL)]);
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
      onStatus('文字認識を準備中…');
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
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0, width, height);
  if (bmp.close) bmp.close();
  const { data } = ctx.getImageData(0, 0, width, height);
  return { width, height, data: new Uint8Array(data.buffer) };
}

// 検出の設定。fine を true にすると、Zenn の記事(PaddleOCR の精度改善)の方向に寄せる:
//   検出する大きさを上げる(960→1600)・しきい値を下げる(box_thresh 0.6→0.3)・領域を広げる(unclip 1.5→2.0)
// 小さい文字や薄い文字の取りこぼしが減る一方、余計な枠が増えることもある
export function detectionOptions(fine) {
  return fine ? { maxSideLength: 1600, boxScoreThreshold: 0.3, unclipRatio: 2.0 } : {};
}

// 写真を読んで、行ごとの { text, confidence(0〜100), bbox: {x0,y0,x1,y1} } を返す
export async function recognizeWithPaddle(file, { fine = true } = {}, onStatus = () => {}) {
  const service = await loadPaddle(onStatus);
  onStatus('写真を読み込み中…');
  const pixels = await fileToPixels(file);
  onStatus('文字を探しています…');
  const results = await service.recognize(pixels, {
    detection: detectionOptions(fine),
    onProgress(e) {
      if (e.type === 'det') onStatus('文字を探しています…');
      else if (e.type === 'rec' && e.progress) onStatus(`読み取り中 ${e.progress.current}/${e.progress.total}`);
    },
  });
  return results
    .filter((r) => r.text && r.text.trim())
    .map((r) => ({
      text: r.text.trim(),
      confidence: Math.round(r.confidence * 100),
      bbox: { x0: r.box.x, y0: r.box.y, x1: r.box.x + r.box.width, y1: r.box.y + r.box.height },
    }));
}
