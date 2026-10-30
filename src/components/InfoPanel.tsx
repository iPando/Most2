interface Props {
  onClose: () => void;
}

export default function InfoPanel({ onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-xl">
          <h2 className="text-xl font-bold text-gray-800">О системе и развёртывании</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-6 text-gray-700">
          <section>
            <h3 className="text-lg font-semibold text-blue-800 mb-2 flex items-center gap-2">
              <span className="bg-blue-100 p-1 rounded">📋</span> Описание
            </h3>
            <p className="text-sm leading-relaxed">
              Веб-приложение для ведения реестра обращений граждан. Заменяет Excel-таблицу, 
              обеспечивая удобный ввод, поиск, фильтрацию и хранение данных. 
              Работает в любом современном браузере без установки дополнительных программ.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-green-800 mb-2 flex items-center gap-2">
              <span className="bg-green-100 p-1 rounded">🌐</span> Варианты развёртывания в сети
            </h3>
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <h4 className="font-medium text-gray-800 mb-1">Вариант 1: Простой (сетевой диск + экспорт/импорт)</h4>
                <ul className="text-sm space-y-1 text-gray-600 list-disc list-inside">
                  <li>Разместите собранный файл <code className="bg-gray-200 px-1 rounded">index.html</code> на сетевом диске</li>
                  <li>Каждый сотрудник открывает его через браузер по сетевому пути</li>
                  <li>Данные хранятся локально в браузере каждого пользователя</li>
                  <li>Для обмена данными используйте кнопки «Экспорт» и «Импорт» (JSON-файл на сетевом диске)</li>
                  <li><strong>Плюсы:</strong> не нужен сервер, не нужны права администратора</li>
                  <li><strong>Минусы:</strong> нет автоматической синхронизации в реальном времени</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border">
                <h4 className="font-medium text-gray-800 mb-1">Вариант 2: Простой сервер (Python, 1 файл)</h4>
                <ul className="text-sm space-y-1 text-gray-600 list-disc list-inside">
                  <li>Создайте файл <code className="bg-gray-200 px-1 rounded">server.py</code> на любом компьютере в сети</li>
                  <li>Запустите: <code className="bg-gray-200 px-1 rounded">python server.py</code></li>
                  <li>Все сотрудники заходят по адресу <code className="bg-gray-200 px-1 rounded">http://IP-сервера:8080</code></li>
                  <li>Данные хранятся в JSON-файле на сервере, синхронизация автоматическая</li>
                  <li><strong>Плюсы:</strong> реальная многопользовательская работа, не нужна установка</li>
                  <li><strong>Минусы:</strong> нужен один компьютер как сервер</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border">
                <h4 className="font-medium text-gray-800 mb-1">Вариант 3: Разделение прав (редакторы / просмотрщики)</h4>
                <ul className="text-sm space-y-1 text-gray-600 list-disc list-inside">
                  <li>Настроить простой пароль для режима «Редактор» и «Только просмотр»</li>
                  <li>Редакторы могут добавлять/изменять записи</li>
                  <li>Просмотрщики видят только таблицу без кнопок редактирования</li>
                  <li>Можно реализовать в рамках Варианта 2</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-purple-800 mb-2 flex items-center gap-2">
              <span className="bg-purple-100 p-1 rounded">💡</span> Рекомендация
            </h3>
            <p className="text-sm leading-relaxed">
              Для вашей ситуации (несколько сотрудников, разное время, без прав администратора) 
              оптимальный вариант — <strong>Вариант 2</strong>: простой Python-сервер на одном из компьютеров. 
              Python обычно уже установлен или легко скачивается без прав администратора (portable-версия). 
              Все сотрудники работают через браузер, данные синхронизируются автоматически.
            </p>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-orange-800 mb-2 flex items-center gap-2">
              <span className="bg-orange-100 p-1 rounded">⚙️</span> Пример server.py
            </h3>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto">
{`from http.server import HTTPServer, SimpleHTTPRequestHandler
import json, os

DATA_FILE = 'data.json'

class Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/api/data':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            data = open(DATA_FILE).read() if os.path.exists(DATA_FILE) else '[]'
            self.wfile.write(data.encode())
        else:
            super().do_GET()
    
    def do_POST(self):
        if self.path == '/api/data':
            length = int(self.headers['Content-Length'])
            body = self.rfile.read(length)
            with open(DATA_FILE, 'w') as f:
                f.write(body.decode())
            self.send_response(200)
            self.end_headers()

print("Сервер запущен на http://0.0.0.0:8080")
HTTPServer(('0.0.0.0', 8080), Handler).serve_forever()`}
            </pre>
          </section>
        </div>

        <div className="sticky bottom-0 bg-white border-t px-6 py-4 rounded-b-xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Понятно, закрыть
          </button>
        </div>
      </div>
    </div>
  );
}
