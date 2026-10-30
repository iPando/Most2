import { useState } from 'react';
import { Complaint, ComplaintFormData } from '../types';
import { DISTRICTS, DEPARTMENTS, COMPLAINT_STATUSES } from '../data/constants';

interface Props {
  onSubmit: (data: ComplaintFormData) => void;
  onClose: () => void;
  initialData?: Complaint;
  title: string;
}

export default function ComplaintForm({ onSubmit, onClose, initialData, title }: Props) {
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState<ComplaintFormData>({
    complaintNumber: initialData?.complaintNumber || '',
    complaintText: initialData?.complaintText || '',
    district: initialData?.district || '',
    object: initialData?.object || '',
    receivedDate: initialData?.receivedDate || today,
    responseDeadline: initialData?.responseDeadline || '',
    department: initialData?.department || '',
    responsible: initialData?.responsible || '',
    status: initialData?.status || 'Новая',
    isCompleted: initialData?.isCompleted || false,
  });

  const departments = Object.keys(DEPARTMENTS);
  const employees = form.department ? DEPARTMENTS[form.department] || [] : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.complaintNumber || !form.complaintText || !form.district) {
      alert('Заполните обязательные поля!');
      return;
    }
    onSubmit(form);
  };

  const handleChange = (field: keyof ComplaintFormData, value: string | boolean) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      // Если отдел изменился, сбросить сотрудника
      if (field === 'department') {
        updated.responsible = '';
      }
      return updated;
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Номер обращения */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Номер обращения <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.complaintNumber}
              onChange={(e) => handleChange('complaintNumber', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Например: ОБР-2024-001"
              required
            />
          </div>

          {/* Текст жалобы */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Текст жалобы <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.complaintText}
              onChange={(e) => handleChange('complaintText', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="Описание жалобы..."
              required
            />
          </div>

          {/* Район и Объект */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Район <span className="text-red-500">*</span>
              </label>
              <select
                value={form.district}
                onChange={(e) => handleChange('district', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Выберите район</option>
                {DISTRICTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Объект
              </label>
              <input
                type="text"
                value={form.object}
                onChange={(e) => handleChange('object', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Адрес или название объекта"
              />
            </div>
          </div>

          {/* Даты */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата поступления
              </label>
              <input
                type="date"
                value={form.receivedDate}
                onChange={(e) => handleChange('receivedDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Автоматически — текущая дата</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ответ до
              </label>
              <input
                type="date"
                value={form.responseDeadline}
                onChange={(e) => handleChange('responseDeadline', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Ответственный */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Отдел
              </label>
              <select
                value={form.department}
                onChange={(e) => handleChange('department', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Выберите отдел</option>
                {departments.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ответственный сотрудник
              </label>
              <select
                value={form.responsible}
                onChange={(e) => handleChange('responsible', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={!form.department}
              >
                <option value="">{form.department ? 'Выберите сотрудника' : 'Сначала выберите отдел'}</option>
                {employees.map(emp => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Статус */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Статус жалобы
              </label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {COMPLAINT_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isCompleted}
                  onChange={(e) => handleChange('isCompleted', e.target.checked)}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Завершено</span>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {initialData ? 'Сохранить' : 'Добавить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
