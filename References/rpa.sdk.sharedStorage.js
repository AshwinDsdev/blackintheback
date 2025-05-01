//rpa.sdk.sharedstorage.js

/**
 * rpa.sdk.sharedstorage.ts
 *
 * Implementation of the Shared Storage API for Island RPA extensions.
 * Uses IndexedDB as the persistent storage backend.
 * Fully typed and documented according to the API specification.
 */
// ===== Helper: Open or Create IndexedDB Database =====
function openDB(storeName) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(storeName);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("store");
        request.result.createObjectStore("meta");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  // ===== Main SDK Implementation =====
  const sharedstorage = {
    /**
     * Stores data in the specified store.
     * If the store does not exist, it will be created.
     * If the store already exists, the data will be added to the store.
     * If the store is full or an error occurs, the data will not be added.
     *
     * @param storeName The name of the store to store the data in.
     * @param key The key to store the data under.
     * @param data The data to store.
     * @returns A promise that resolves with a success indicator and optional error message.
     *
     * @example
     * await storeData('myStore', 'myKey', { foo: 'bar' });
     * // => { success: true }
     *
     * @example
     * await storeData('myStore', 'myKey', { foo: 'baz' });
     * // => { success: false, error: 'Quota exceeded' }
     */
    async storeData(storeName, key, data) {
      try {
        const db = await openDB(storeName);
        const tx = db.transaction(["store", "meta"], "readwrite");
        const store = tx.objectStore("store");
        const meta = tx.objectStore("meta");
        store.put(data, key);
        meta.put(Date.now(), "lastUpdated");
        return await new Promise((resolve) => {
          tx.oncomplete = () => {
            db.close();
            resolve({ success: true });
          };
          tx.onerror = () => {
            db.close();
            resolve({
              success: false,
              error: tx.error?.message || "Transaction error",
            });
          };
          tx.onabort = () => {
            db.close();
            resolve({
              success: false,
              error: tx.error?.message || "Transaction aborted",
            });
          };
        });
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    /**
     * Returns the last updated timestamp for the given store.
     * @param storeName The name of the store to get the last updated for.
     * @returns An object containing the last updated timestamp or error.
     * @example
     * const result = await getLastUpdated('myStore');
     * if (result.success) console.log(result.lastUpdated);
     */
    async getLastUpdated(storeName) {
      try {
        const db = await openDB(storeName);
        const tx = db.transaction("meta", "readonly");
        const meta = tx.objectStore("meta");
        const request = meta.get("lastUpdated");
        return await new Promise((resolve) => {
          request.onsuccess = () => {
            db.close();
            resolve({ success: true, lastUpdated: request.result });
          };
          request.onerror = () => {
            db.close();
            resolve({ success: false, error: request.error?.message });
          };
        });
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    /**
     * Get data from the store
     * @param storeName The name of the store to get data from
     * @param key The key of the data to get
     * @returns The data stored in the store, or undefined if no data is found
     * @example
     * const result = await getData('myStore', 'myKey');
     * if (result.success) console.log(result.data);
     */
    async getData(storeName, key) {
      try {
        const db = await openDB(storeName);
        const tx = db.transaction("store", "readonly");
        const store = tx.objectStore("store");
        const request = store.get(key);
        return await new Promise((resolve) => {
          request.onsuccess = () => {
            db.close();
            resolve({ success: true, data: request.result });
          };
          request.onerror = () => {
            db.close();
            resolve({ success: false, error: request.error?.message });
          };
        });
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    /**
     * Clears all data from the specified store.
     * @param storeName The name of the store to clear.
     * @returns A result indicating whether the store was cleared successfully.
     */
    async clearStore(storeName) {
      try {
        const db = await openDB(storeName);
        const tx = db.transaction("store", "readwrite");
        const store = tx.objectStore("store");
        store.clear();
        db.close();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
    /**
     * Deletes data from the specified store.
     * @param storeName The name of the store to delete data from.
     * @param key The key of the data to delete.
     * @returns A success or failure result for the deletion.
     * @example
     * const result = await deleteData('myStore', 'myKey');
     * if (result.success) console.log('Deleted');
     */
    async deleteData(storeName, key) {
      try {
        const db = await openDB(storeName);
        const tx = db.transaction("store", "readwrite");
        const store = tx.objectStore("store");
        store.delete(key);
        db.close();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  };
  export default sharedstorage;