// 資料ファイルと、そのサムネイルを端末(IndexedDB)に保存する。キーは Drive のファイル ID。
const DB_NAME = 'benri-materials';
const FILES = 'files';
const THUMBS = 'thumbs'; // 一覧の見た目(サムネイル)。ファイル本体と分けて、読みを軽くする

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 2);
      req.onupgradeneeded = () => {
        for (const name of [FILES, THUMBS]) {
          if (!req.result.objectStoreNames.contains(name)) req.result.createObjectStore(name, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function run(store, mode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export const putMaterial = (rec) => run(FILES, 'readwrite', (s) => s.put(rec));
export const getMaterial = (id) => run(FILES, 'readonly', (s) => s.get(id));
export const listMaterialIds = () => run(FILES, 'readonly', (s) => s.getAllKeys());
export const putThumb = (id, blob) => run(THUMBS, 'readwrite', (s) => s.put({ id, blob }));
export const getThumb = (id) => run(THUMBS, 'readonly', (s) => s.get(id)).then((r) => r?.blob || null);
export const deleteMaterial = (id) => Promise.all([
  run(FILES, 'readwrite', (s) => s.delete(id)),
  run(THUMBS, 'readwrite', (s) => s.delete(id)),
]);
