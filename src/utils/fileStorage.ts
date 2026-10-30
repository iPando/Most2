import { Complaint, ComplaintFormData } from '../types';

const DB_NAME = 'complaints_registry_db';
const STORE_NAME = 'file_handles';
const HANDLE_KEY = 'data_file_handle';

// Сохраняем FileHandle в IndexedDB для повторного использования
async function saveFileHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// Загружаем FileHandle из IndexedDB
async function loadFileHandle(): Promise<FileSystemFileHandle | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const request = tx.objectStore(STORE_NAME).get(HANDLE_KEY);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function removeFileHandle(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(HANDLE_KEY);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Проверка поддержки File System Access API
export function isFileSystemAccessSupported(): boolean {
  return 'showOpenFilePicker' in window;
}

// Запросить у пользователя выбор файла данных
export async function pickDataFile(): Promise<FileSystemFileHandle | null> {
  try {
    const [handle] = await (window as any).showOpenFilePicker({
      types: [
        {
          description: 'JSON файл данных',
          accept: { 'application/json': ['.json'] },
        },
      ],
      multiple: false,
    });
    await saveFileHandle(handle);
    return handle;
  } catch {
    return null;
  }
}

// Создать новый файл данных
export async function createDataFile(): Promise<FileSystemFileHandle | null> {
  try {
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: `reestr_obrashcheniy.json`,
      types: [
        {
          description: 'JSON файл данных',
          accept: { 'application/json': ['.json'] },
        },
      ],
    });
    // Записываем пустой массив
    const writable = await handle.createWritable();
    await writable.write('[]');
    await writable.close();
    await saveFileHandle(handle);
    return handle;
  } catch {
    return null;
  }
}

// Прочитать данные из файла
export async function readDataFromFile(handle: FileSystemFileHandle): Promise<Complaint[]> {
  try {
    const file = await handle.getFile();
    const text = await file.text();
    if (!text.trim()) return [];
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error('Ошибка чтения файла:', e);
    throw e;
  }
}

// Записать данные в файл
export async function writeDataToFile(handle: FileSystemFileHandle, complaints: Complaint[]): Promise<void> {
  try {
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(complaints, null, 2));
    await writable.close();
  } catch (e) {
    console.error('Ошибка записи файла:', e);
    throw e;
  }
}

// Получить сохранённый handle
export async function getSavedHandle(): Promise<FileSystemFileHandle | null> {
  try {
    const handle = await loadFileHandle();
    if (handle) {
      // Проверяем, что разрешение ещё действует
      const permission = await (handle as any).queryPermission({ mode: 'readwrite' });
      if (permission === 'granted') {
        return handle;
      }
      // Запрашиваем разрешение
      const newPermission = await (handle as any).requestPermission({ mode: 'readwrite' });
      if (newPermission === 'granted') {
        return handle;
      }
    }
    return null;
  } catch {
    return null;
  }
}

export async function clearSavedHandle(): Promise<void> {
  await removeFileHandle();
}

// Экспорт через скачивание (fallback)
export function exportAsFile(complaints: Complaint[]): void {
  const dataStr = JSON.stringify(complaints, null, 2);
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `reestr_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// Импорт через загрузку файла (fallback)
export function importFromFile(): Promise<Complaint[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) { reject(new Error('Файл не выбран')); return; }
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (Array.isArray(data)) {
            resolve(data);
          } else {
            reject(new Error('Неверный формат файла'));
          }
        } catch {
          reject(new Error('Ошибка чтения файла'));
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}
