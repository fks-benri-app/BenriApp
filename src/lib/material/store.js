// 資料ファイルを端末(IndexedDB)に保存する。キーは Drive のファイル ID。
const DB_NAME = 'benri-materials';
const STORE = 'files';

let dbPromise = null;

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function run(mode, fn) {
  return openDb().then((db) => new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  }));
}

export const putMaterial = (rec) => run('readwrite', (s) => s.put(rec));
export const getMaterial = (id) => run('readonly', (s) => s.get(id));
export const listMaterialIds = () => run('readonly', (s) => s.getAllKeys());
export const deleteMaterial = (id) => run('readwrite', (s) => s.delete(id));
