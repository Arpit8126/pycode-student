export interface CustomDataset {
  name: string
  originalContent: string | ArrayBuffer
  currentContent: string | ArrayBuffer
  type: 'csv' | 'xlsx'
}

const DB_NAME = 'pycode_datasets_db'
const STORE_NAME = 'datasets'
const DB_VERSION = 1

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('IndexedDB is only available in browser environments.'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'name' })
      }
    }
  })
}

export async function getDatasets(): Promise<CustomDataset[]> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result || [])
  })
}

export async function saveDataset(dataset: CustomDataset): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.put(dataset)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}

export async function deleteDataset(name: string): Promise<void> {
  const db = await initDB()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.delete(name)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve()
  })
}
