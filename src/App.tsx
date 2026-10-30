import { useState, useEffect, useCallback, useRef } from 'react';
import { Complaint, ComplaintFormData } from './types';
import { COMPLAINT_STATUSES } from './data/constants';
import ComplaintForm from './components/ComplaintForm';
import ComplaintTable from './components/ComplaintTable';
import InfoPanel from './components/InfoPanel';
import {
  isFileSystemAccessSupported,
  pickDataFile,
  createDataFile,
  readDataFromFile,
  writeDataToFile,
  getSavedHandle,
  clearSavedHandle,
  exportAsFile,
  importFromFile,
} from './utils/fileStorage';

type ConnectionStatus = 'checking' | 'connected' | 'disconnected' | 'not_supported';

function App() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchText, setSearchText] = useState('');
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const [fileName, setFileName] = useState<string>('');
  const [lastSaved, setLastSaved] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const complaintsRef = useRef<Complaint[]>([]);

  // Обновляем ref при изменении complaints
  useEffect(() => {
    complaintsRef.current = complaints;
  }, [complaints]);

  const showNotification = useCallback((type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Загрузка данных из файла
  const loadData = useCallback(async (handle: FileSystemFileHandle) => {
    try {
      const data = await readDataFromFile(handle);
      setComplaints(data);
      setConnectionStatus('connected');
      const file = await handle.getFile();
      setFileName(file.name);
    } catch {
      showNotification('error', 'Ошибка чтения файла данных');
      setConnectionStatus('disconnected');
    }
  }, [showNotification]);

  // Сохранение данных в файл (с дебаунсом)
  const saveData = useCallback(async (data: Complaint[]) => {
    if (!fileHandle) return;
    setIsSaving(true);
    try {
      await writeDataToFile(fileHandle, data);
      setLastSaved(new Date().toLocaleTimeString('ru-RU'));
    } catch {
      showNotification('error', 'Ошибка сохранения! Возможно, файл заблокирован другим пользователем.');
      setConnectionStatus('disconnected');
    } finally {
      setIsSaving(false);
    }
  }, [fileHandle, showNotification]);

  // Автосохранение с дебаунсом
  const scheduleSave = useCallback((data: Complaint[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveData(data);
    }, 500);
  }, [saveData]);

  // Инициализация — пробуем восстановить подключение к файлу
  useEffect(() => {
    const init = async () => {
      if (!isFileSystemAccessSupported()) {
        setConnectionStatus('not_supported');
        // Загружаем из localStorage как fallback
        const saved = localStorage.getItem('complaints_registry');
        if (saved) {
          try { setComplaints(JSON.parse(saved)); } catch { /* ignore */ }
        }
        return;
      }

      const handle = await getSavedHandle();
      if (handle) {
        setFileHandle(handle);
        await loadData(handle);
      } else {
        setConnectionStatus('disconnected');
      }
    };
    init();
  }, [loadData]);

  // Fallback — сохраняем в localStorage если нет файлового хранилища
  useEffect(() => {
    if (connectionStatus === 'not_supported') {
      localStorage.setItem('complaints_registry', JSON.stringify(complaints));
    }
  }, [complaints, connectionStatus]);

  // Подключение к файлу данных
  const handleConnectFile = async () => {
    const handle = await pickDataFile();
    if (handle) {
      setFileHandle(handle);
      await loadData(handle);
      showNotification('success', 'Файл данных подключён!');
    }
  };

  // Создание нового файла данных
  const handleCreateFile = async () => {
    const handle = await createDataFile();
    if (handle) {
      setFileHandle(handle);
      setComplaints([]);
      setConnectionStatus('connected');
      const file = await handle.getFile();
      setFileName(file.name);
      showNotification('success', 'Новый файл данных создан!');
    }
  };

  // Отключение файла
  const handleDisconnect = async () => {
    await clearSavedHandle();
    setFileHandle(null);
    setConnectionStatus('disconnected');
    setFileName('');
    setLastSaved('');
  };

  const getNextId = () => {
    if (complaints.length === 0) return 1;
    return Math.max(...complaints.map(c => c.id)) + 1;
  };

  const handleAdd = (data: ComplaintFormData) => {
    const newComplaints = [...complaints, { ...data, id: getNextId() }];
    setComplaints(newComplaints);
    setShowForm(false);
    if (fileHandle) scheduleSave(newComplaints);
  };

  const handleEdit = (data: ComplaintFormData) => {
    if (!editingComplaint) return;
    const newComplaints = complaints.map(c =>
      c.id === editingComplaint.id ? { ...data, id: editingComplaint.id } : c
    );
    setComplaints(newComplaints);
    setEditingComplaint(null);
    if (fileHandle) scheduleSave(newComplaints);
  };

  const handleDelete = (id: number) => {
    if (confirm('Удалить обращение?')) {
      const newComplaints = complaints.filter(c => c.id !== id);
      setComplaints(newComplaints);
      if (fileHandle) scheduleSave(newComplaints);
    }
  };

  const handleToggleComplete = (id: number) => {
    const newComplaints = complaints.map(c =>
      c.id === id ? { ...c, isCompleted: !c.isCompleted } : c
    );
    setComplaints(newComplaints);
    if (fileHandle) scheduleSave(newComplaints);
  };

  const handleExport = () => {
    exportAsFile(complaints);
    showNotification('success', 'Файл экспортирован');
  };

  const handleImport = async () => {
    try {
      const data = await importFromFile();
      setComplaints(data);
      if (fileHandle) scheduleSave(data);
      showNotification('success', 'Данные импортированы!');
    } catch {
      showNotification('error', 'Ошибка импорта файла');
    }
  };

  // Повторная попытка подключения
  const handleReconnect = async () => {
    if (fileHandle) {
      await loadData(fileHandle);
    }
  };

  const filteredComplaints = complaints.filter(c => {
    const matchStatus = !filterStatus || c.status === filterStatus;
    const matchSearch = !searchText ||
      c.complaintNumber.toLowerCase().includes(searchText.toLowerCase()) ||
      c.complaintText.toLowerCase().includes(searchText.toLowerCase()) ||
      c.object.toLowerCase().includes(searchText.toLowerCase()) ||
      c.responsible.toLowerCase().includes(searchText.toLowerCase());
    return matchStatus && matchSearch;
  });

  const needsFileConnection = connectionStatus === 'disconnected' && isFileSystemAccessSupported();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium animate-fade-in ${
          notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'
        }`}>
          {notification.text}
        </div>
      )}

      {/* Header */}
      <header className="bg-blue-800 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold">Реестр обращений</h1>
                <p className="text-blue-200 text-sm">Система учёта жалоб и обращений</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Connection status */}
              <div className="flex items-center gap-2 text-sm">
                {connectionStatus === 'connected' && (
                  <div className="flex items-center gap-2 bg-green-700/50 px-3 py-1.5 rounded-lg">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    <span className="text-green-100">{fileName}</span>
                    {lastSaved && <span className="text-green-300 text-xs">сохранено: {lastSaved}</span>}
                    {isSaving && <span className="text-yellow-300 text-xs">сохранение...</span>}
                  </div>
                )}
                {connectionStatus === 'not_supported' && (
                  <div className="flex items-center gap-2 bg-yellow-700/50 px-3 py-1.5 rounded-lg">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                    <span className="text-yellow-100">Локальный режим</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowInfo(true)}
                className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Справка
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* File connection banner */}
      {needsFileConnection && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-amber-800">Файл данных не подключён</h3>
                <p className="text-sm text-amber-700 mt-1">
                  Для совместной работы выберите файл данных на сетевом диске или создайте новый.
                  Все изменения будут автоматически сохраняться в этот файл.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleConnectFile}
                    className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    📂 Открыть существующий файл
                  </button>
                  <button
                    onClick={handleCreateFile}
                    className="bg-white hover:bg-gray-50 text-amber-800 border border-amber-300 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    📄 Создать новый файл
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Not supported banner */}
      {connectionStatus === 'not_supported' && (
        <div className="max-w-7xl mx-auto px-4 mt-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-800">Режим локального хранения</h3>
                <p className="text-sm text-blue-700 mt-1">
                  Ваш браузер не поддерживает прямой доступ к файлам. Данные сохраняются в браузере.
                  Используйте кнопки «Экспорт» / «Импорт» для обмена данными через сетевой диск.
                  <br />
                  <strong>Рекомендация:</strong> используйте браузер Google Chrome или Microsoft Edge для полной функциональности.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowForm(true)}
              disabled={needsFileConnection}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Новое обращение
            </button>

            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Поиск по номеру, тексту, объекту, сотруднику..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Все статусы</option>
              {COMPLAINT_STATUSES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-1"
                title="Экспорт данных в JSON-файл"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Экспорт
              </button>
              <button
                onClick={handleImport}
                className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-1"
                title="Импорт данных из JSON-файла"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Импорт
              </button>
              {fileHandle && (
                <button
                  onClick={handleDisconnect}
                  className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-1"
                  title="Отключить файл данных"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  Отключить
                </button>
              )}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
            <span>Всего: <strong className="text-gray-800">{complaints.length}</strong></span>
            <span>Показано: <strong className="text-gray-800">{filteredComplaints.length}</strong></span>
            <span>Завершено: <strong className="text-green-600">{complaints.filter(c => c.isCompleted).length}</strong></span>
            <span>В работе: <strong className="text-blue-600">{complaints.filter(c => !c.isCompleted).length}</strong></span>
          </div>
        </div>

        {/* Table */}
        <ComplaintTable
          complaints={filteredComplaints}
          onEdit={(c: Complaint) => setEditingComplaint(c)}
          onDelete={handleDelete}
          onToggleComplete={handleToggleComplete}
        />
      </div>

      {/* Add Modal */}
      {showForm && (
        <ComplaintForm
          onSubmit={handleAdd}
          onClose={() => setShowForm(false)}
          title="Новое обращение"
        />
      )}

      {/* Edit Modal */}
      {editingComplaint && (
        <ComplaintForm
          onSubmit={handleEdit}
          onClose={() => setEditingComplaint(null)}
          initialData={editingComplaint}
          title="Редактирование обращения"
        />
      )}

      {/* Info Panel */}
      {showInfo && (
        <InfoPanel onClose={() => setShowInfo(false)} />
      )}
    </div>
  );
}

export default App;
