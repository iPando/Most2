interface Props {
  onClose: () => void;
}

export default function InfoPanel({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800">Справка</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 text-gray-700">
          <section>
            <h3 className="text-lg font-semibold text-blue-800 mb-2">📋 О программе</h3>
            <p className="text-sm leading-relaxed">
              Веб-приложение для ведения реестра обращений. Работает прямо в браузере — 
              не требует установки дополнительных программ и не требует прав администратора.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-green-800 mb-3">🔗 Подключение к файлу данных</h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm space-y-2">
              <p>Для совместной работы нескольких сотрудников данные хранятся в общем JSON-файле на сетевом диске.</p>
              <ol className="list-decimal list-inside space-y-1 text-gray-700">
                <li>При первом запуске нажмите <strong>«Открыть существующий файл»</strong> и выберите файл данных на сетевом диске</li>
                <li>Или нажмите <strong>«Создать новый файл»</strong> и укажите место на сетевом диске</li>
                <li>После подключения все изменения <strong>автоматически сохраняются</strong> в файл</li>
                <li>Другие сотрудники открывают тот же файл — и видят актуальные данные</li>
              </ol>
              <p className="text-xs text-green-700 mt-2">
                💡 Файл нужно выбрать один раз — при следующих запусках подключение восстановится автоматически.
              </p>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-purple-800 mb-3">📝 Как работать</h3>
            <div className="space-y-3">
              <div className="flex gap-3 items-start">
                <span className="bg-purple-100 text-purple-700 font-bold rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 text-sm">1</span>
                <div>
                  <p className="font-medium text-gray-800">Добавление обращения</p>
                  <p className="text-sm text-gray-600">Нажмите «Новое обращение», заполните форму. Порядковый номер присваивается автоматически, дата поступления — текущая.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-purple-100 text-purple-700 font-bold rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 text-sm">2</span>
                <div>
                  <p className="font-medium text-gray-800">Выбор ответственного</p>
                  <p className="text-sm text-gray-600">Сначала выберите отдел — затем появится список сотрудников этого отдела.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-purple-100 text-purple-700 font-bold rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 text-sm">3</span>
                <div>
                  <p className="font-medium text-gray-800">Поиск и фильтрация</p>
                  <p className="text-sm text-gray-600">Используйте строку поиска для быстрого нахождения обращений. Фильтр по статусу — через выпадающий список.</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <span className="bg-purple-100 text-purple-700 font-bold rounded-full w-7 h-7 flex items-center justify-center flex-shrink-0 text-sm">4</span>
                <div>
                  <p className="font-medium text-gray-800">Редактирование</p>
                  <p className="text-sm text-gray-600">Нажмите на карандаш в строке обращения для изменения данных. Крестик — для удаления.</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-orange-800 mb-3">⚠️ Важно</h3>
            <ul className="text-sm space-y-2 text-gray-700">
              <li className="flex gap-2">
                <span className="text-orange-500">•</span>
                <span>Работает в браузерах <strong>Google Chrome</strong> и <strong>Microsoft Edge</strong> (версия 86+)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500">•</span>
                <span>Одновременно редактировать файл может только один человек (остальные видят данные на момент последнего сохранения)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500">•</span>
                <span>Если появилась ошибка сохранения — возможно файл открыт другим пользователем. Подождите и нажмите «Отключить» → подключитесь заново</span>
              </li>
              <li className="flex gap-2">
                <span className="text-orange-500">•</span>
                <span>Индикатор <span className="text-green-600 font-medium">«сохранено»</span> в шапке подтверждает, что данные записаны в файл</span>
              </li>
            </ul>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🔄 Экспорт / Импорт</h3>
            <p className="text-sm text-gray-600">
              Кнопки «Экспорт» и «Импорт» позволяют вручную сохранить/загрузить данные в виде JSON-файла. 
              Это полезно для создания резервных копий или переноса данных.
            </p>
          </section>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
}
