import { DeadlineAlert } from '../utils/workdays';

interface Props {
  alerts: DeadlineAlert[];
  onClose: () => void;
  onGoToComplaint: (id: number) => void;
}

export default function DeadlineAlertsModal({ alerts, onClose, onGoToComplaint }: Props) {
  const overdue = alerts.filter(a => a.isOverdue);
  const urgent = alerts.filter(a => !a.isOverdue);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <h2 className="text-xl font-bold">Внимание! Истекают сроки</h2>
              <p className="text-red-100 text-sm">
                {overdue.length > 0 && `${overdue.length} просрочено, `}
                {urgent.length} в ближайшие 2 рабочих дня
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {overdue.length > 0 && (
            <section>
              <h3 className="font-bold text-red-700 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">
                  {overdue.length}
                </span>
                Просрочено
              </h3>
              <div className="space-y-2">
                {overdue.map(a => (
                  <div key={a.id} className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center justify-between hover:bg-red-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-red-800">{a.complaintNumber}</span>
                        <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-medium">
                          {a.message}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1 truncate">{a.complaintText}</p>
                      <div className="flex gap-3 text-xs text-gray-500 mt-1">
                        <span>📍 {a.district}{a.object ? `, ${a.object}` : ''}</span>
                        {a.responsible && <span>👤 {a.responsible}</span>}
                        <span>📅 Срок: {a.deadline}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onGoToComplaint(a.id)}
                      className="ml-3 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                    >
                      Открыть
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {urgent.length > 0 && (
            <section>
              <h3 className="font-bold text-amber-700 mb-2 flex items-center gap-2 text-sm uppercase tracking-wide">
                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold">
                  {urgent.length}
                </span>
                Скоро истекает срок
              </h3>
              <div className="space-y-2">
                {urgent.map(a => (
                  <div key={a.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between hover:bg-amber-100 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-amber-800">{a.complaintNumber}</span>
                        <span className="text-xs bg-amber-600 text-white px-2 py-0.5 rounded-full font-medium">
                          {a.message}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 mt-1 truncate">{a.complaintText}</p>
                      <div className="flex gap-3 text-xs text-gray-500 mt-1">
                        <span>📍 {a.district}{a.object ? `, ${a.object}` : ''}</span>
                        {a.responsible && <span>👤 {a.responsible}</span>}
                        <span>📅 Срок: {a.deadline}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => onGoToComplaint(a.id)}
                      className="ml-3 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex-shrink-0"
                    >
                      Открыть
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="border-t px-6 py-3 bg-gray-50 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            💡 Расчёт сроков учитывает только рабочие дни (без суббот и воскресений)
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
