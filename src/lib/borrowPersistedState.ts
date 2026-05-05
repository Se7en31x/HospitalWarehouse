/**
 * สถานะยืมที่เคยถูกเก็บในเบราว์เซอร์ (localStorage + IndexedDB)
 * — ล้างเมื่อออกจากระบบ / เมื่อ user เปลี่ยน เพื่อไม่ให้รูปหรือฟอร์มค้างแปลก ๆ
 */

export const BORROW_LOCAL_STORAGE_KEYS = {
  CART: "borrow_cart",
  RETURN_DATE: "borrow_return_date",
  DEPT: "borrow_dept",
  FORM_DRAFT: "hpk_borrow_external_draft_v1",
} as const;

const BORROW_DRAFT_IDB = {
  db: "hpk-borrow-workspace",
  version: 1,
  store: "draft",
} as const;

const BORROW_DRAFT_IDB_KEY_FILES = "external_attachments_v1";

type IdbDraftFile = { name: string; type: string; lastModified: number; data: ArrayBuffer };

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("no idb"));
      return;
    }
    const req = indexedDB.open(BORROW_DRAFT_IDB.db, BORROW_DRAFT_IDB.version);
    req.onerror = () => reject(req.error ?? new Error("idb open"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(BORROW_DRAFT_IDB.store)) {
        db.createObjectStore(BORROW_DRAFT_IDB.store);
      }
    };
  });
}

export async function saveBorrowFormDraftFiles(files: File[]): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const parts: IdbDraftFile[] = await Promise.all(
    files.map(async (f) => ({
      name: f.name,
      type: f.type,
      lastModified: f.lastModified,
      data: await f.arrayBuffer(),
    }))
  );
  const db = await idbOpen();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BORROW_DRAFT_IDB.store, "readwrite");
    const st = tx.objectStore(BORROW_DRAFT_IDB.store);
    st.put(parts, BORROW_DRAFT_IDB_KEY_FILES);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadBorrowFormDraftFiles(): Promise<File[]> {
  if (typeof indexedDB === "undefined") return [];
  let db: IDBDatabase;
  try {
    db = await idbOpen();
  } catch {
    return [];
  }
  const parts = await new Promise<IdbDraftFile[] | undefined>((resolve, reject) => {
    const tx = db.transaction(BORROW_DRAFT_IDB.store, "readonly");
    const st = tx.objectStore(BORROW_DRAFT_IDB.store);
    const g = st.get(BORROW_DRAFT_IDB_KEY_FILES);
    g.onsuccess = () => resolve(g.result as IdbDraftFile[] | undefined);
    g.onerror = () => reject(g.error);
  });
  if (!Array.isArray(parts) || parts.length === 0) return [];
  return parts.map(
    (p) =>
      new File([p.data], p.name, {
        type: p.type || "application/octet-stream",
        lastModified: p.lastModified,
      })
  );
}

export async function clearBorrowFormDraftAttachments(): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  try {
    const db = await idbOpen();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(BORROW_DRAFT_IDB.store, "readwrite");
      tx.objectStore(BORROW_DRAFT_IDB.store).delete(BORROW_DRAFT_IDB_KEY_FILES);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignore */
  }
}

export function removeBorrowCartPageLocalStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(BORROW_LOCAL_STORAGE_KEYS.CART);
    localStorage.removeItem(BORROW_LOCAL_STORAGE_KEYS.RETURN_DATE);
    localStorage.removeItem(BORROW_LOCAL_STORAGE_KEYS.DEPT);
  } catch {
    /* ignore */
  }
}

export function removeBorrowFormDraftLocalStorage(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(BORROW_LOCAL_STORAGE_KEYS.FORM_DRAFT);
  } catch {
    /* ignore */
  }
}

/** ลบร่างใน localStorage + ไฟล์แนบใน IndexedDB */
export async function clearBorrowFormDraftStorage(): Promise<void> {
  removeBorrowFormDraftLocalStorage();
  await clearBorrowFormDraftAttachments();
}

/**
 * ล้างทุกอย่างที่เกี่ยวกับการยืมในเบราว์เซอร์ (ควรเรียกก่อน signOut)
 */
export async function clearAllBorrowPersistedState(): Promise<void> {
  removeBorrowCartPageLocalStorage();
  await clearBorrowFormDraftStorage();
}
