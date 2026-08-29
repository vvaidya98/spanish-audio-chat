// Local-only session history via IndexedDB. Per-browser storage, no backend
// involved — session transcripts never leave the user's machine.
const DB_NAME = 'spanish-audio-chat'
// SAC-090: bumped 1 -> 2 to add the savedWords store below, alongside
// (not replacing) the existing sessions store — onupgradeneeded's
// objectStoreNames.contains() guards mean the sessions store is untouched
// on this upgrade; only a brand-new store gets created.
const DB_VERSION = 2
const STORE_NAME = 'sessions'
const SAVED_WORDS_STORE = 'savedWords'

function openDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB is not available in this browser'))
      return
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('mode', 'mode', { unique: false })
        store.createIndex('scenario', 'scenario', { unique: false })
        store.createIndex('timestamp', 'timestamp', { unique: false })
      }
      if (!db.objectStoreNames.contains(SAVED_WORDS_STORE)) {
        const wordsStore = db.createObjectStore(SAVED_WORDS_STORE, { keyPath: 'id' })
        wordsStore.createIndex('dateAdded', 'dateAdded', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Generic timestamp+random id — despite the name, already reused as-is for
// saved words below rather than duplicated under a second name, since the
// underlying mechanism (and the "never actually collides in practice for a
// single-browser store" reasoning) is identical for both use cases.
export function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export async function saveSession(session) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(session)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function getAllSessions() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).getAll()
    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

// SAC-090: personal vocabulary bank. A small, single-user store (no
// multi-user contention to worry about), so the case-insensitive duplicate
// check below just reads everything and compares client-side rather than
// maintaining a second lowercased index purely for this one lookup.
export async function getAllSavedWords() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAVED_WORDS_STORE, 'readonly')
    const request = tx.objectStore(SAVED_WORDS_STORE).getAll()
    request.onsuccess = () => resolve((request.result || []).sort((a, b) => b.dateAdded - a.dateAdded))
    request.onerror = () => reject(request.error)
  })
}

export async function saveWord({ spanish, english, source }) {
  const trimmedSpanish = spanish.trim()
  const existing = await getAllSavedWords()
  const duplicate = existing.find((w) => w.spanish.toLowerCase() === trimmedSpanish.toLowerCase())
  if (duplicate) return { alreadySaved: true, word: duplicate }

  const word = {
    id: generateSessionId(),
    spanish: trimmedSpanish,
    english: english.trim(),
    dateAdded: Date.now(),
    source,
    reviewCount: 0,
    timesCorrect: 0,
  }
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAVED_WORDS_STORE, 'readwrite')
    tx.objectStore(SAVED_WORDS_STORE).put(word)
    tx.oncomplete = () => resolve({ alreadySaved: false, word })
    tx.onerror = () => reject(tx.error)
  })
}

export async function deleteWord(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAVED_WORDS_STORE, 'readwrite')
    tx.objectStore(SAVED_WORDS_STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

// Reads the current record inside the same readwrite transaction it writes
// back to, so two review answers landing close together can't race and
// silently drop one's increment.
export async function updateWordReviewStats(id, wasCorrect) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(SAVED_WORDS_STORE, 'readwrite')
    const store = tx.objectStore(SAVED_WORDS_STORE)
    const getRequest = store.get(id)
    getRequest.onsuccess = () => {
      const word = getRequest.result
      if (!word) return
      word.reviewCount = (word.reviewCount || 0) + 1
      if (wasCorrect) word.timesCorrect = (word.timesCorrect || 0) + 1
      store.put(word)
    }
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
