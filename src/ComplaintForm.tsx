import { useState } from 'react';
import type { Complaint, Config } from './types';

interface ComplaintFormProps {
  config: Config;
  initialData?: Complaint;
  onSubmit: (data: Omit<Complaint, 'id'>) => void;
  onClose: () => void;
}

export function ComplaintForm({ config, initialData, onSubmit, onClose }: ComplaintFormProps) {
  const [formData, setFormData] = useState({
    complaintNumber: initialData?.complaintNumber || '',
    complaintText: initialData?.complaintText || '',
    district: initialData?.district || '',
    object: initialData?.object || '',
    receivedDate: initialData?.receivedDate || new Date().toISOString().split('T')[0],
    responseDeadline: initialData?.responseDeadline || '',
    department: initialData?.department || '',
    responsibles: initialData?.responsibles || [''],
    status: initialData?.status || 'Новая',
    isCompleted: initialData?.isCompleted || false
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.complaintNumber || !formData.complaintText || !formData.district) {
      alert('Заполните обязательные поля');
      return;
    }
    onSubmit(formData);
  };

  const addResponsible = () => {
    setFormData({ ...formData, responsibles: [...formData.responsibles, ''] });
  };

  const removeResponsible = (index: number) => {
    const newResponsibles = formData.responsibles.filter((_: string, i: number) => i !== index);
    setFormData({ ...formData, responsibles: newResponsibles.length > 0 ? newResponsibles : [''] });
  };

  const updateResponsible = (index: number, value: string) => {
    const newResponsibles = [...formData.responsibles];
    newResponsibles[index] = value;
    setFormData({ ...formData, responsibles: newResponsibles });
  };

  const toggleComplete = () => {
    setFormData({ ...formData, isCompleted: !formData.isCompleted });
  };

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
        }}
      >
        <div style={{
          position: 'sticky',
          top: 0,
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '16px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderRadius: '12px 12px 0 0',
          zIndex: 1
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>
            {initialData ? 'Редактирование обращения' : 'Новое обращение'}
          </h2>
          <button 
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              border: 'none',
              background: 'none',
              borderRadius: '8px',
              color: '#9ca3af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
              Номер обращения <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.complaintNumber}
              onChange={(e) => setFormData({ ...formData, complaintNumber: e.target.value })}
              placeholder="ОБР-2024-001"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
              Текст жалобы <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              value={formData.complaintText}
              onChange={(e) => setFormData({ ...formData, complaintText: e.target.value })}
              placeholder="Описание жалобы..."
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                resize: 'vertical',
                minHeight: '80px'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                Район <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <select
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              >
                <option value="">Выберите район</option>
                {config.districts.map((d: string) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                Объект
              </label>
              <input
                type="text"
                value={formData.object}
                onChange={(e) => setFormData({ ...formData, object: e.target.value })}
                placeholder="Адрес или название"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                Дата поступления
              </label>
              <input
                type="date"
                value={formData.receivedDate}
                onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>
                Автоматически — текущая дата
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
                Ответ до
              </label>
              <input
                type="date"
                value={formData.responseDeadline}
                onChange={(e) => setFormData({ ...formData, responseDeadline: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
              Отдел
            </label>
            <select
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value, responsibles: [''] })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            >
              <option value="">Выберите отдел</option>
              {Object.keys(config.departments).map((d: string) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
              Ответственные сотрудники
            </label>
            {formData.responsibles.map((resp: string, index: number) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                <select
                  value={resp}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => updateResponsible(index, e.target.value)}
                  disabled={!formData.department}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    outline: 'none',
                    background: !formData.department ? '#f3f4f6' : 'white'
                  }}
                >
                  <option value="">{formData.department ? 'Выберите сотрудника' : 'Сначала выберите отдел'}</option>
                  {formData.department && config.departments[formData.department]?.map((e: string) => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
                {index === 0 ? (
                  <button
                    type="button"
                    onClick={addResponsible}
                    title="Добавить сотрудника"
                    style={{
                      width: '32px',
                      height: '32px',
                      border: 'none',
                      borderRadius: '6px',
                      background: '#dcfce7',
                      color: '#16a34a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                    </svg>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => removeResponsible(index)}
                    title="Удалить"
                    style={{
                      width: '32px',
                      height: '32px',
                      border: 'none',
                      borderRadius: '6px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      flexShrink: 0
                    }}
                  >
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '4px' }}>
              Статус
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none'
              }}
            >
              {config.statuses.map((s: string) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div style={{
            borderTop: '1px solid #e5e7eb',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginLeft: '-24px',
            marginRight: '-24px',
            marginBottom: '-24px'
          }}>
            <div style={{ flex: 1 }}>
              {initialData && (
                <button
                  type="button"
                  onClick={toggleComplete}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontWeight: 500,
                    border: 'none',
                    fontSize: '14px',
                    background: formData.isCompleted ? '#6b7280' : '#16a34a',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {formData.isCompleted ? 'Отменить завершение' : 'Завершить'}
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 500,
                  border: 'none',
                  fontSize: '14px',
                  background: '#6b7280',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
              <button
                type="submit"
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 500,
                  border: 'none',
                  fontSize: '14px',
                  background: '#2563eb',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                {initialData ? 'Сохранить' : 'Добавить'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
