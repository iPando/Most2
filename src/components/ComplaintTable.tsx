import { Complaint } from '../types';
import { workdaysBetween, isSameDate } from '../utils/workdays';

interface Props {
  complaints: Complaint[];
  onEdit: (complaint: Complaint) => void;
  onDelete: (id: number) => void;
  onToggleComplete: (id: number) => void;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'Новая': return 'bg-blue-100 text-blue-800';
    case 'В работе': return 'bg-yellow-100 text-yellow-800';
    case 'Ожидает ответа': return 'bg-purple-100 text-purple-800';
    case 'На рассмотрении': return 'bg-orange-100 text-orange-800';
    case 'Решена': return 'bg-green-100 text-green-800';
    case 'Отклонена': return 'bg-red-100 text-red-800';
    case 'Закрыта': return 'bg-gray-100 text-gray-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

// Вычислить класс для ячейки срока
function getDeadlineCellClass(deadline: string, isCompleted: boolean): string {
  if (!deadline || isCompleted) return 'text-gray-600';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(deadline);
  dl.setHours(0, 0, 0, 0);
  const daysLeft = workdaysBetween(today, dl);

  if (daysLeft < 0) return 'text-red-700 font-bold bg-red-50';
  if (daysLeft === 0) return 'text-orange-700 font-bold bg-orange-50';
  if (daysLeft <= 2) return 'text-amber-700 font-semibold bg-amber-50';
  return 'text-gray-600';
}

function getDeadlineTooltip(deadline: string, isCompleted: boolean): string {
  if (!deadline) return 'Срок не указан';
  if (isCompleted) return `Срок: ${deadline}`;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dl = new Date(deadline);
  dl.setHours(0, 0, 0, 0);
  const daysLeft = workdaysBetween(today, dl);

  if (daysLeft < 0) return `Просрочено на ${Math.abs(daysLeft)} р. дн. (срок: ${deadline})`;
  if (daysLeft === 0) return `Срок — СЕГОДНЯ (${deadline})`;
  if (daysLeft === 1) return `Остался 1 р. день (срок: ${deadline})`;
  if (daysLeft === 2) return `Осталось 2 р. дня (срок: ${deadline})`;
  return `Срок: ${deadline} (осталось ${daysLeft} р. дн.)`;
}

export default function ComplaintTable({ complaints, onEdit, onDelete, onToggleComplete }: Props) {
  if (complaints.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
        <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-medium text-gray-500">Нет обращений</h3>
        <p className="text-gray-400 mt-1">Нажмите «Новое обращение» чтобы добавить запись</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-gray-600 w-12">№</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-600 w-32">Номер обр.</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-600 min-w-[200px]">Текст жалобы</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-600 w-28">Район</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-600 w-36">Объект</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-600 w-28">Поступление</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-600 w-32">
                <span className="flex items-center gap-1">
                  Ответ до
                  <span className="text-xs text-gray-400 font-normal">(р.д.)</span>
                </span>
              </th>
              <th className="px-3 py-3 text-left font-semibold text-gray-600 w-40">Ответственный</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-600 w-28">Статус</th>
              <th className="px-3 py-3 text-center font-semibold text-gray-600 w-20">
                <span title="Завершено — кликните для переключения">✓</span>
              </th>
              <th className="px-3 py-3 text-center font-semibold text-gray-600 w-24">Действия</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {complaints.map((c) => (
              <tr key={c.id} className={`hover:bg-gray-50 transition-colors ${c.isCompleted ? 'opacity-60' : ''}`}>
                <td className="px-3 py-3 text-gray-500 font-mono">{c.id}</td>
                <td className="px-3 py-3 font-medium text-blue-700">{c.complaintNumber}</td>
                <td className="px-3 py-3 text-gray-700 max-w-[300px]">
                  <div className="truncate" title={c.complaintText}>{c.complaintText}</div>
                </td>
                <td className="px-3 py-3 text-gray-600">{c.district}</td>
                <td className="px-3 py-3 text-gray-600">
                  <div className="truncate" title={c.object}>{c.object || '—'}</div>
                </td>
                <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{c.receivedDate}</td>
                <td className={`px-3 py-3 whitespace-nowrap rounded-sm ${getDeadlineCellClass(c.responseDeadline, c.isCompleted)}`} title={getDeadlineTooltip(c.responseDeadline, c.isCompleted)}>
                  {c.responseDeadline || '—'}
                </td>
                <td className="px-3 py-3">
                  {c.department && (
                    <div className="text-xs">
                      <div className="text-gray-400">{c.department}</div>
                      <div className="text-gray-700 font-medium">{c.responsible || '—'}</div>
                    </div>
                  )}
                  {!c.department && <span className="text-gray-400">—</span>}
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(c.status)}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <button
                    onClick={() => onToggleComplete(c.id)}
                    title={c.isCompleted ? 'Завершено — нажмите, чтобы снять' : 'Не завершено — нажмите, чтобы завершить'}
                    className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition-all hover:scale-110 ${
                      c.isCompleted
                        ? 'bg-green-500 border-green-600 text-white shadow-sm'
                        : 'bg-white border-gray-300 hover:border-green-400 text-transparent'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onEdit(c)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Редактировать"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(c.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Удалить"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
