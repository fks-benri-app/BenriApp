# OCR(PaddleOCR)の配布物について

このフォルダには、時間割の読み取りに使うファイルを、アプリと同じ配信元(GitHub Pages)から読めるように置いています。

| ファイル | 元 | ライセンス |
| --- | --- | --- |
| models/detection/PP-OCRv5_mobile_det_infer.ort | npm `pdfmarkdown-ppocrv5-models@1.0.0`(PaddleOCR PP-OCRv5 mobile を ONNX 化したもの) | Apache-2.0 |
| models/recognition/PP-OCRv5_mobile_rec_infer.onnx | 同上 | Apache-2.0 |
| models/recognition/ppocrv5_dict.txt | 同上 | Apache-2.0 |
| ort/ort.min.mjs、ort/ort-wasm-simd-threaded.* | npm `onnxruntime-web@1.30.0` | MIT(package.json の license 欄による) |

- 上の元の LICENSE 全文は、LICENSE-models.txt(モデル側)にあります。
- onnxruntime-web の全文は、上流のリポジトリ(microsoft/onnxruntime)の LICENSE を参照してください。配布パッケージには同梱されていません。
