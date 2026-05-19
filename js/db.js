const DB_NAME = 'nannenshita-db';
const DB_VERSION = 1;
const STORE = 'items';

let _db = null;

async function openDB() {
  if (_db) return _db;
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains(STORE)) {
        const store = d.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('category', 'category');
        store.createIndex('endDate', 'endDate');
      }
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror = e => reject(e.target.error);
  });
}

export const DB = {
  async getAll() {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const req = d.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  },

  async get(id) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const req = d.transaction(STORE, 'readonly').objectStore(STORE).get(id);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  },

  async put(item) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const req = d.transaction(STORE, 'readwrite').objectStore(STORE).put(item);
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = e => reject(e.target.error);
    });
  },

  async delete(id) {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const req = d.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = e => reject(e.target.error);
    });
  },
};
