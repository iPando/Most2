import { useState, useEffect, useRef, useCallback } from 'react';
import { ComplaintForm } from './ComplaintForm';

// ===== ТИПЫ =====
export interface Complaint {
  id: number;
  complaintNumber: string;
  complaintText: string;
  district: string;
  object: string;
  receivedDate: string;
  responseDeadline: string;
  department: string;
  responsibles: string[];
  status: string;
  isCompleted: boolean;
}

export interface Config {
  districts: string[];
  departments: Record<string, string[]>;
  statuses: string[];
}

interface DeadlineAlert extends Complaint {
  daysLeft: number;
  isOverdue: boolean;
  message: string;
}

// ===== КОНФИГУРАЦИЯ ПО УМОЛЧАНИЮ =====
const DEFAULT_CONFIG: Config = {
  districts: ['Центральный', 'Северный', 'Южный', 'Западный', 'Восточный', 'Юго-Западный', 'Северо-Западный', 'Юго-Восточный', 'Северо-Восточный'],
  departments: {
    'Отдел по работе с населением': ['Иванов А.А.', 'Петрова М.И.', 'Сидоров В.К.'],
    'Технический отдел': ['Козлов Д.Н.', 'Новикова Е.С.', 'Морозов П.Р.'],
    'Отдел контроля качества': ['Волкова О.В.', 'Соколов И.Д.', 'Лебедева Н.А.'],
    'Юридический отдел': ['Кузнецов С.М.', 'Попова Т.Г.', 'Васильев Р.Л.']
  },
  statuses: ['Новая', 'В работе', 'Ожидает ответа', 'На рассмотрении', 'Решена', 'Отклонена', 'Закрыта']
};

// ===== УТИЛИТЫ ДЛЯ РАБОЧИХ ДНЕЙ =====
const isWeekend = (date: Date): boolean => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const workdaysBetween = (from: Date, to: Date): number => {
  const f = new Date(from); f.setHours(0, 0, 0, 0);
  const t = new Date(to); t.setHours(0, 0, 0, 0);
  if (f.getTime() === t.getTime()) return 0;
  const sign = t > f ? 1 : -1;
  let count = 0;
  const cur = new Date(f);
  let safety = 0;
  while (safety++ < 2000) {
    cur.setDate(cur.getDate() + sign);
    if (!isWeekend(cur)) count += sign;
    if (cur.getTime() === t.getTime()) break;
  }
  return count;
};

const getDeadlineAlerts = (complaints: Complaint[]): DeadlineAlert[] => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alerts: DeadlineAlert[] = [];
  
  for (const c of complaints) {
    if (c.isCompleted || !c.responseDeadline) continue;
    const dl = new Date(c.responseDeadline);
    dl.setHours(0, 0, 0, 0);
    const daysLeft = workdaysBetween(today, dl);
    
    if (daysLeft <= 2) {
      let message = '';
      let isOverdue = false;
      
      if (daysLeft < 0) {
        isOverdue = true;
        message = `Просрочено на ${Math.abs(daysLeft)} р. дн.`;
      } else if (daysLeft === 0) {
        message = 'Срок — СЕГОДНЯ!';
      } else if (daysLeft === 1) {
        message = 'Срок — завтра (1 р. дн.)';
      } else if (daysLeft === 2) {
        message = 'Срок через 2 р. дня';
      }
      
      alerts.push({ ...c, daysLeft, isOverdue, message });
    }
  }
  
  alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  return alerts;
};

// ===== ГЛАВНЫЙ КОМПОНЕНТ =====
export default function App() {
  const [activeTab, setActiveTab] = useState<'spb' | 'pos' | 'summary'>('spb');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Загрузка из localStorage при старте
  useEffect(() => {
    const saved = localStorage.getItem('complaints_registry');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setComplaints(parsed);
        } else if (parsed.complaints) {
          setComplaints(parsed.complaints);
          if (parsed.config) setConfig(parsed.config);
        }
      } catch (e) {
        console.error('Ошибка загрузки данных:', e);
      }
    }
  }, []);

  // Сохранение в localStorage
  const saveToLocalStorage = useCallback((data: Complaint[]) => {
    localStorage.setItem('complaints_registry', JSON.stringify({ complaints: data, config }));
  }, [config]);

  // Автосохранение
  const scheduleSave = useCallback((data: Complaint[]) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToLocalStorage(data);
    }, 500);
  }, [saveToLocalStorage]);

  // Уведомления
  const showNotification = useCallback((type: 'success' | 'error', text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Фильтрация
  const filteredComplaints = complaints.filter(c => {
    if (hideCompleted && c.isCompleted) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (searchText) {
      const searchStr = `${c.complaintNumber} ${c.complaintText} ${c.object} ${c.responsibles.join(' ')} ${c.district}`.toLowerCase();
      if (!searchStr.includes(searchText.toLowerCase())) return false;
    }
    return true;
  });

  // Действия с обращениями
  const getNextId = () => {
    if (complaints.length === 0) return 1;
    return Math.max(...complaints.map(c => c.id)) + 1;
  };

  const handleAdd = (data: Omit<Complaint, 'id'>) => {
    const newComplaints = [...complaints, { ...data, id: getNextId() }];
    setComplaints(newComplaints);
    setShowForm(false);
    scheduleSave(newComplaints);
  };

  const handleEdit = (id: number, data: Omit<Complaint, 'id'>) => {
    const newComplaints = complaints.map(c => c.id === id ? { ...data, id } : c);
    setComplaints(newComplaints);
    setEditingComplaint(null);
    scheduleSave(newComplaints);
  };

  const handleDelete = (id: number) => {
    if (!confirm('Удалить обращение?')) return;
    const newComplaints = complaints.filter(c => c.id !== id);
    setComplaints(newComplaints);
    scheduleSave(newComplaints);
  };

  const handleToggleComplete = (id: number) => {
    const newComplaints = complaints.map(c => c.id === id ? { ...c, isCompleted: !c.isCompleted } : c);
    setComplaints(newComplaints);
    scheduleSave(newComplaints);
  };

  // Статистика
  const stats = {
    total: complaints.length,
    shown: filteredComplaints.length,
    completed: complaints.filter(c => c.isCompleted).length,
    inProgress: complaints.filter(c => !c.isCompleted).length
  };

  const deadlineAlerts = getDeadlineAlerts(complaints);

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Уведомление */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          zIndex: 100,
          padding: '12px 16px',
          borderRadius: '8px',
          color: 'white',
          fontSize: '14px',
          fontWeight: 500,
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          background: notification.type === 'success' ? '#16a34a' : '#dc2626'
        }}>
          {notification.text}
        </div>
      )}

      {/* ШАПКА */}
      <header style={{ 
        background: '#1e40af', 
        color: 'white', 
        padding: '16px 24px',
        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          maxWidth: '1400px', 
          margin: '0 auto', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* ЛЕВАЯ ЧАСТЬ - ЛОГОТИП */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ 
              background: 'rgba(255,255,255,0.2)', 
              padding: '8px', 
              borderRadius: '8px'
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M2 16 Q12 8 22 16" strokeLinecap="round"/>
                <line x1="6" y1="16" x2="6" y2="20" strokeLinecap="round"/>
                <line x1="12" y1="12" x2="12" y2="20" strokeLinecap="round"/>
                <line x1="18" y1="16" x2="18" y2="20" strokeLinecap="round"/>
                <line x1="2" y1="16" x2="22" y2="16" strokeLinecap="round"/>
                <line x1="2" y1="20" x2="22" y2="20" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>Реестр обращений</h1>
              <p style={{ fontSize: '13px', color: '#bfdbfe', margin: 0 }}>Мостотрест</p>
            </div>
          </div>

          {/* ЦЕНТР - ВКЛАДКИ */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div style={{ 
              display: 'flex', 
              gap: '4px', 
              background: 'rgba(0,0,0,0.15)', 
              padding: '4px', 
              borderRadius: '10px'
            }}>
              {(['spb', 'pos', 'summary'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: '8px 20px',
                    borderRadius: '7px',
                    border: 'none',
                    background: activeTab === tab ? 'white' : 'transparent',
                    color: activeTab === tab ? '#1e40af' : 'rgba(255,255,255,0.75)',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    letterSpacing: '0.3px'
                  }}
                >
                  {tab === 'spb' ? 'СПБ' : tab === 'pos' ? 'ПОС' : 'Сводная'}
                </button>
              ))}
            </div>
          </div>

          {/* ПРАВАЯ ЧАСТЬ - КНОПКИ */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Кнопка оповещений */}
            {deadlineAlerts.length > 0 && (
              <button 
                onClick={() => setShowAlerts(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'white',
                  cursor: 'pointer',
                  background: deadlineAlerts.some(a => a.isOverdue) ? '#dc2626' : '#d97706'
                }}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {deadlineAlerts.filter(a => a.isOverdue).length > 0 && `Просрочено: ${deadlineAlerts.filter(a => a.isOverdue).length} `}
                {deadlineAlerts.filter(a => !a.isOverdue).length > 0 && `Скоро: ${deadlineAlerts.filter(a => !a.isOverdue).length}`}
              </button>
            )}

            {/* Индикатор файла */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 12px',
              borderRadius: '8px',
              fontSize: '13px',
              background: 'rgba(22,101,52,0.5)'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80' }}></span>
              <span style={{ color: '#bbf7d0', fontSize: '12px' }}>Локальное хранилище</span>
            </div>

            {/* Кнопка Настройки */}
            <button 
              onClick={() => setShowSettings(true)}
              title="Настройки"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
            </button>

            {/* Кнопка Справка */}
            <button 
              onClick={() => setShowInfo(true)}
              title="Справка"
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* КОНТЕНТ */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '16px 12px' }}>
        
        {/* ВКЛАДКА СПБ */}
        {activeTab === 'spb' && (
          <>
            {/* Панель инструментов */}
            <div style={{ 
              background: 'white', 
              borderRadius: '12px', 
              border: '1px solid #e5e7eb',
              padding: '16px',
              marginBottom: '16px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <button 
                  onClick={() => setShowForm(true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 500,
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '14px',
                    background: '#2563eb',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                  </svg>
                  Новое обращение
                </button>

                <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
                  <svg style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: '#9ca3af' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input 
                    type="text"
                    placeholder="Поиск по номеру, тексту, объекту, сотруднику..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px 8px 36px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: 'white'
                  }}
                >
                  <option value="">Все статусы</option>
                  {config.statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  background: '#f9fafb',
                  fontSize: '14px'
                }}>
                  <input 
                    type="checkbox"
                    checked={hideCompleted}
                    onChange={(e) => setHideCompleted(e.target.checked)}
                    style={{ width: '16px', height: '16px', accentColor: '#2563eb' }}
                  />
                  Скрыть завершённые
                </label>

                <button 
                  onClick={() => {
                    const dataStr = JSON.stringify({ complaints, config }, null, 2);
                    const blob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `reestr_${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                    showNotification('success', 'Данные экспортированы');
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Экспорт
                </button>

                <button 
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        try {
                          const data = JSON.parse(ev.target?.result as string);
                          if (data.complaints) {
                            setComplaints(data.complaints);
                            if (data.config) setConfig(data.config);
                            showNotification('success', 'Данные импортированы');
                          }
                        } catch {
                          showNotification('error', 'Ошибка импорта');
                        }
                      };
                      reader.readAsText(file);
                    };
                    input.click();
                  }}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    background: '#ea580c',
                    color: 'white',
                    border: 'none',
                    cursor: 'pointer'
                  }}
                >
                  Импорт
                </button>
              </div>

              <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280', flexWrap: 'wrap' }}>
                <span>Всего: <strong style={{ color: '#1f2937' }}>{stats.total}</strong></span>
                <span>Показано: <strong style={{ color: '#1f2937' }}>{stats.shown}</strong></span>
                <span>Завершено: <strong style={{ color: '#16a34a' }}>{stats.completed}</strong></span>
                <span>В работе: <strong style={{ color: '#2563eb' }}>{stats.inProgress}</strong></span>
              </div>
            </div>

            {/* Таблица */}
            <div style={{ 
              background: 'white', 
              borderRadius: '12px', 
              border: '1px solid #e5e7eb',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              overflow: 'hidden'
            }}>
              {filteredComplaints.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center' }}>
                  <svg style={{ width: '64px', height: '64px', color: '#d1d5db', margin: '0 auto 16px' }} fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  <h3 style={{ fontSize: '18px', color: '#6b7280', fontWeight: 500 }}>Нет обращений</h3>
                  <p style={{ color: '#9ca3af', marginTop: '4px' }}>Нажмите «Новое обращение» чтобы добавить запись</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <tr>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#4b5563' }}>№</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#4b5563' }}>Номер обр.</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#4b5563' }}>Текст жалобы</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#4b5563' }}>Район</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#4b5563' }}>Объект</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#4b5563' }}>Поступление</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#4b5563' }}>Ответ до</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#4b5563' }}>Ответственный</th>
                        <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600, color: '#4b5563' }}>Статус</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: '#4b5563' }}>✓</th>
                        <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600, color: '#4b5563' }}>Действия</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredComplaints.map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6', opacity: c.isCompleted ? 0.55 : 1 }}>
                          <td style={{ padding: '8px', color: '#6b7280', fontFamily: 'monospace' }}>{c.id}</td>
                          <td style={{ padding: '8px', color: '#1d4ed8', fontWeight: 600 }}>{c.complaintNumber}</td>
                          <td style={{ padding: '8px', maxWidth: '350px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.complaintText}>
                            {c.complaintText}
                          </td>
                          <td style={{ padding: '8px', color: '#4b5563' }}>{c.district}</td>
                          <td style={{ padding: '8px', color: '#4b5563', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.object}>
                            {c.object}
                          </td>
                          <td style={{ padding: '8px', whiteSpace: 'nowrap', color: '#4b5563' }}>{c.receivedDate}</td>
                          <td style={{ padding: '8px', whiteSpace: 'nowrap', color: '#4b5563' }}>{c.responseDeadline}</td>
                          <td style={{ padding: '8px', fontSize: '12px' }}>
                            <div style={{ color: '#9ca3af' }}>{c.department}</div>
                            <div style={{ fontWeight: 500 }}>{c.responsibles.join(', ')}</div>
                          </td>
                          <td style={{ padding: '8px' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '999px',
                              fontSize: '12px',
                              fontWeight: 500,
                              background: c.status === 'Новая' ? '#dbeafe' : c.status === 'В работе' ? '#fef3c7' : c.status === 'Решена' ? '#dcfce7' : '#f3f4f6',
                              color: c.status === 'Новая' ? '#1e40af' : c.status === 'В работе' ? '#92400e' : c.status === 'Решена' ? '#166534' : '#374151'
                            }}>
                              {c.status}
                            </span>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleToggleComplete(c.id)}
                              title={c.isCompleted ? 'Завершено — нажмите, чтобы снять' : 'Не завершено — нажмите, чтобы завершить'}
                              style={{
                                width: '28px',
                                height: '28px',
                                borderRadius: '6px',
                                border: c.isCompleted ? '2px solid #16a34a' : '2px solid #d1d5db',
                                background: c.isCompleted ? '#22c55e' : 'white',
                                color: c.isCompleted ? 'white' : 'transparent',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                padding: 0
                              }}
                            >
                              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                              </svg>
                            </button>
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                              <button 
                                onClick={() => setEditingComplaint(c)}
                                title="Редактировать"
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  border: 'none',
                                  background: 'none',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#9ca3af',
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                              >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                                </svg>
                              </button>
                              <button 
                                onClick={() => handleDelete(c.id)}
                                title="Удалить"
                                style={{
                                  width: '28px',
                                  height: '28px',
                                  border: 'none',
                                  background: 'none',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#9ca3af',
                                  cursor: 'pointer',
                                  padding: 0
                                }}
                              >
                                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ВКЛАДКА ПОС */}
        {activeTab === 'pos' && (
          <div style={{
            background: 'white',
            border: '2px dashed #d1d5db',
            borderRadius: '12px',
            padding: '80px 24px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📋</div>
            <h2 style={{ fontSize: '22px', color: '#374151', marginBottom: '8px' }}>Реестр ПОС</h2>
            <p style={{ fontSize: '14px' }}>
              Здесь будет аналогичная таблица для обращений ПОС.<br/>
              Структура и функциональность будут идентичны вкладке СПБ.
            </p>
          </div>
        )}

        {/* ВКЛАДКА Сводная */}
        {activeTab === 'summary' && (
          <div style={{
            background: 'white',
            border: '2px dashed #d1d5db',
            borderRadius: '12px',
            padding: '80px 24px',
            textAlign: 'center',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>📊</div>
            <h2 style={{ fontSize: '22px', color: '#374151', marginBottom: '8px' }}>Сводный отчёт</h2>
            <p style={{ fontSize: '14px' }}>
              Здесь будут выводиться отчёты по данным из обеих таблиц (СПБ и ПОС).
            </p>
          </div>
        )}
      </div>

      {/* Модальные окна */}
      {showForm && (
        <ComplaintForm
          config={config}
          onSubmit={(data) => {
            const newComplaints = [...complaints, { ...data, id: getNextId() }];
            setComplaints(newComplaints);
            setShowForm(false);
            scheduleSave(newComplaints);
          }}
          onClose={() => setShowForm(false)}
        />
      )}
      {editingComplaint && (
        <ComplaintForm
          config={config}
          initialData={editingComplaint}
          onSubmit={(data) => {
            const newComplaints = complaints.map(c => c.id === editingComplaint.id ? { ...data, id: editingComplaint.id } : c);
            setComplaints(newComplaints);
            setEditingComplaint(null);
            scheduleSave(newComplaints);
          }}
          onClose={() => setEditingComplaint(null)}
        />
      )}
      {showSettings && <div>Настройки (TODO)</div>}
      {showInfo && <div>Справка (TODO)</div>}
      {showAlerts && <div>Оповещения о сроках (TODO)</div>}
    </div>
  );
}
