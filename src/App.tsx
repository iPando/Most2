import { useState, useEffect } from 'react';
import { Complaint, ComplaintFormData } from './types';
import { DISTRICTS, DEPARTMENTS, COMPLAINT_STATUSES } from './data/constants';
import ComplaintForm from './components/ComplaintForm';
import ComplaintTable from './components/ComplaintTable';
import InfoPanel from './components/InfoPanel';

const STORAGE_KEY = 'complaints_registry';

function App() {
  const [complaints, setComplaints] = useState<Complaint[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });
  const [showForm, setShowForm] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(complaints));
  }, [complaints]);

  const getNextId = () => {
    if (complaints.length === 0) return 1;
    return Math.max(...complaints.map(c => c.id)) + 1;
  };

  const handleAdd = (data: ComplaintFormData) => {
    const newComplaint: Complaint = { ...data, id: getNextId() };
    setComplaints([...complaints, newComplaint]);
    setShowForm(false);
  };

  const handleEdit = (data: ComplaintFormData) => {
    if (!editingComplaint) return;
    setComplaints(complaints.map(c => c.id === editingComplaint.id ? { ...data, id: editingComplaint.id } : c));
    setEditingComplaint(null);
  };

  const handleDelete = (id: number) => {
    if (confirm('Удалить обращение?')) {
      setComplaints(complaints.filter(c => c.id !== id));
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(complaints, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reestr_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (Array.isArray(data)) {
          setComplaints(data);
          alert('Данные успешно импортированы!');
        }
      } catch {
        alert('Ошибка чтения файла!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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

  return (
    <div className="min-h-screen bg-gray-50">
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
                <p className="text-blue-200 text-sm">Система учёта жалоб и обращений граждан</p>
              </div>
            </div>
            <button
              onClick={() => setShowInfo(true)}
              className="bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              О системе
            </button>
          </div>
        </div>
      </header>

      {/* Toolbar */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
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
              <label className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-1 cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Импорт
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-4 text-sm text-gray-500">
            <span>Всего обращений: <strong className="text-gray-800">{complaints.length}</strong></span>
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
