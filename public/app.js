// ===================================================================
// КОНФИГУРАЦИЯ
// ===================================================================
const DISTRICTS = ["Центральный","Северный","Южный","Западный","Восточный","Юго-Западный","Северо-Западный","Юго-Восточный","Северо-Восточный"];
const DEPARTMENTS = {"Отдел по работе с населением":["Иванов А.А.","Петрова М.И.","Сидоров В.К."],"Технический отдел":["Козлов Д.Н.","Новикова Е.С.","Морозов П.Р."],"Отдел контроля качества":["Волкова О.В.","Соколов И.Д.","Лебедева Н.А."],"Юридический отдел":["Кузнецов С.М.","Попова Т.Г.","Васильев Р.Л."]};
const STATUSES = ["Новая","В работе","Ожидает ответа","На рассмотрении","Решена","Отклонена","Закрыта"];

// ===================================================================
// СОСТОЯНИЕ ПРИЛОЖЕНИЯ
// ===================================================================
const TABS = {
  spb: { name: 'СПБ', complaints: [], fileHandle: null, fileName: '', lastSaved: '', isSaving: false, connectionStatus: 'checking', alertsDismissed: false, saveTimeout: null, deadlineTimer: null },
  pos: { name: 'ПОС', complaints: [], fileHandle: null, fileName: '', lastSaved: '', isSaving: false, connectionStatus: 'checking', alertsDismissed: false, saveTimeout: null, deadlineTimer: null }
};
let activeTab = 'spb';
let CONFIG = { districts: [...DISTRICTS], departments: JSON.parse(JSON.stringify(DEPARTMENTS)), statuses: [...STATUSES] };

function getTab() { return TABS[activeTab]; }

// ===================================================================
// ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК
// ===================================================================
function switchTab(tabName) {
  if (!TABS[tabName] && tabName !== 'summary') return;
  
  // Если переключились на вкладку с данными (spb или pos)
  if (tabName === 'spb' || tabName === 'pos') {
    activeTab = tabName;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-' + tabName).classList.add('active');
    document.querySelectorAll('.tab')[tabName === 'spb' ? 0 : 1].classList.add('active');
    render();
  } else if (tabName === 'summary') {
    // Для сводной вкладки переключаем вид и обновляем данные
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById('tab-summary').classList.add('active');
    document.querySelectorAll('.tab')[2].classList.add('active');
    initSummaryMonthSelector();
    renderSummary();
  }
}

// ===================================================================
// УТИЛИТЫ ДЛЯ РАБОЧИХ ДНЕЙ
// ===================================================================
function isWeekend(date) { const day = date.getDay(); return day === 0 || day === 6; }
function workdaysBetween(from, to) {
  const f = new Date(from); f.setHours(0,0,0,0);
  const t = new Date(to); t.setHours(0,0,0,0);
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
}

function getDeadlineAlerts() {
  const tab = getTab();
  const today = new Date(); today.setHours(0,0,0,0);
  const alerts = [];
  for (const c of tab.complaints) {
    if (c.isCompleted || !c.responseDeadline) continue;
    const dl = new Date(c.responseDeadline); dl.setHours(0,0,0,0);
    const daysLeft = workdaysBetween(today, dl);
    if (daysLeft <= 2) {
      let message = '', isOverdue = false;
      if (daysLeft < 0) { isOverdue = true; message = `Просрочено на ${Math.abs(daysLeft)} р. дн.`; }
      else if (daysLeft === 0) message = 'Срок — СЕГОДНЯ!';
      else if (daysLeft === 1) message = 'Срок — завтра (1 р. дн.)';
      else if (daysLeft === 2) message = 'Срок через 2 р. дня';
      alerts.push({ ...c, daysLeft, isOverdue, message });
    }
  }
  alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  return alerts;
}

function getDeadlineClass(deadline, isCompleted) {
  if (!deadline || isCompleted) return '';
  const today = new Date(); today.setHours(0,0,0,0);
  const dl = new Date(deadline); dl.setHours(0,0,0,0);
  const days = workdaysBetween(today, dl);
  if (days < 0) return 'deadline-overdue';
  if (days === 0) return 'deadline-today';
  if (days <= 2) return 'deadline-soon';
  return '';
}

function getDeadlineTooltip(deadline, isCompleted) {
  if (!deadline) return 'Срок не указан';
  if (isCompleted) return `Срок: ${deadline}`;
  const today = new Date(); today.setHours(0,0,0,0);
  const dl = new Date(deadline); dl.setHours(0,0,0,0);
  const days = workdaysBetween(today, dl);
  if (days < 0) return `Просрочено на ${Math.abs(days)} р. дн. (срок: ${deadline})`;
  if (days === 0) return `Срок — СЕГОДНЯ (${deadline})`;
  if (days === 1) return `Остался 1 р. день (срок: ${deadline})`;
  if (days === 2) return `Осталось 2 р. дня (срок: ${deadline})`;
  return `Срок: ${deadline} (осталось ${days} р. дн.)`;
}

// ===================================================================
// ФАЙЛОВОЕ ХРАНИЛИЩЕ
// ===================================================================
const DB_NAME = 'complaints_registry_db';
const STORE_NAME = 'file_handles';

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE_NAME)) r.result.createObjectStore(STORE_NAME); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function saveFH(handle) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(handle, activeTab);
  return new Promise((r, j) => { tx.oncomplete = r; tx.onerror = j; });
}

async function loadFH() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const r = tx.objectStore(STORE_NAME).get(activeTab);
  return new Promise((res, rej) => { r.onsuccess = () => res(r.result || null); r.onerror = rej; });
}

async function removeFH() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(activeTab);
  return new Promise((r, j) => { tx.oncomplete = r; tx.onerror = j; });
}

function isFSASupported() { return 'showOpenFilePicker' in window; }

async function pickDataFile() {
  try {
    const [h] = await window.showOpenFilePicker({
      types: [{ description: 'JSON файл данных', accept: { 'application/json': ['.json'] } }],
      multiple: false
    });
    await saveFH(h);
    return h;
  } catch { return null; }
}

async function createDataFile() {
  try {
    const tab = getTab();
    const suggestedName = `reestr_${activeTab}.json`;
    const h = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'JSON файл данных', accept: { 'application/json': ['.json'] } }]
    });
    const w = await h.createWritable();
    const obj = { complaints: [], config: CONFIG };
    await w.write(JSON.stringify(obj, null, 2));
    await w.close();
    await saveFH(h);
    return h;
  } catch { return null; }
}

async function readData(h) {
  const f = await h.getFile();
  const t = await f.text();
  if (!t.trim()) return { complaints: [], config: null };
  const d = JSON.parse(t);
  if (Array.isArray(d)) return { complaints: d, config: null };
  else if (d && typeof d === 'object') return { complaints: d.complaints || [], config: d.config || null };
  return { complaints: [], config: null };
}

async function writeData(h, data) {
  const w = await h.createWritable();
  const obj = { complaints: data, config: CONFIG };
  await w.write(JSON.stringify(obj, null, 2));
  await w.close();
}

async function getSavedHandle() {
  try {
    const h = await loadFH();
    if (h) {
      const p = await h.queryPermission({ mode: 'readwrite' });
      if (p === 'granted') return h;
      const np = await h.requestPermission({ mode: 'readwrite' });
      if (np === 'granted') return h;
    }
    return null;
  } catch { return null; }
}

// ===================================================================
// ДАННЫЕ
// ===================================================================
async function loadDataFromHandle(h) {
  const tab = getTab();
  try {
    const data = await readData(h);
    tab.complaints = data.complaints || [];
    if (data.config) {
      CONFIG.districts = data.config.districts || [...DISTRICTS];
      CONFIG.departments = data.config.departments || JSON.parse(JSON.stringify(DEPARTMENTS));
      CONFIG.statuses = data.config.statuses || [...STATUSES];
    }
    tab.connectionStatus = 'connected';
    const f = await h.getFile();
    tab.fileName = f.name;
    render();
  } catch {
    showNotification('error', 'Ошибка чтения файла');
    tab.connectionStatus = 'disconnected';
    render();
  }
}

async function saveDataToHandle() {
  const tab = getTab();
  if (!tab.fileHandle) return;
  tab.isSaving = true;
  renderConnectionStatus();
  try {
    await writeData(tab.fileHandle, tab.complaints);
    tab.lastSaved = new Date().toLocaleTimeString('ru-RU');
  } catch {
    showNotification('error', 'Ошибка сохранения!');
    tab.connectionStatus = 'disconnected';
  } finally {
    tab.isSaving = false;
    renderConnectionStatus();
  }
}

function scheduleSave() {
  const tab = getTab();
  if (tab.saveTimeout) clearTimeout(tab.saveTimeout);
  tab.saveTimeout = setTimeout(() => saveDataToHandle(), 500);
}

function saveToLS() {
  const tab = getTab();
  localStorage.setItem(`complaints_registry_${activeTab}`, JSON.stringify({ complaints: tab.complaints, config: CONFIG }));
}

// ===================================================================
// ЭКСПОРТ/ИМПОРТ
// ===================================================================
function exportData() {
  const tab = getTab();
  const obj = { complaints: tab.complaints, config: CONFIG };
  const b = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const u = URL.createObjectURL(b);
  const a = document.createElement('a');
  a.href = u;
  a.download = `reestr_${activeTab}_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(u);
  showNotification('success', 'Файл экспортирован');
}

function importData() {
  const i = document.createElement('input');
  i.type = 'file';
  i.accept = '.json';
  i.onchange = e => {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = ev => {
      try {
        const d = JSON.parse(ev.target.result);
        const tab = getTab();
        if (Array.isArray(d)) { tab.complaints = d; }
        else if (d && typeof d === 'object') {
          tab.complaints = d.complaints || [];
          if (d.config) {
            CONFIG.districts = d.config.districts || CONFIG.districts;
            CONFIG.departments = d.config.departments || CONFIG.departments;
            CONFIG.statuses = d.config.statuses || CONFIG.statuses;
          }
        } else { showNotification('error', 'Неверный формат'); return; }
        saveToLS();
        if (tab.fileHandle) scheduleSave();
        updateStatusFilter();
        render();
        showNotification('success', 'Данные импортированы!');
      } catch { showNotification('error', 'Ошибка чтения'); }
    };
    r.readAsText(f);
  };
  i.click();
}

// ===================================================================
// ДЕЙСТВИЯ С ОБРАЩЕНИЯМИ
// ===================================================================
function getNextId() {
  const tab = getTab();
  return tab.complaints.length === 0 ? 1 : Math.max(...tab.complaints.map(c => c.id)) + 1;
}

function addComplaint(data) {
  const tab = getTab();
  tab.complaints.push({ ...data, id: getNextId() });
  saveToLS();
  if (tab.fileHandle) scheduleSave();
  render();
}

function updateComplaint(id, data) {
  const tab = getTab();
  tab.complaints = tab.complaints.map(c => c.id === id ? { ...data, id } : c);
  saveToLS();
  if (tab.fileHandle) scheduleSave();
  render();
}

function deleteComplaint(id) {
  const tab = getTab();
  if (!confirm('Удалить обращение?')) return;
  tab.complaints = tab.complaints.filter(c => c.id !== id);
  saveToLS();
  if (tab.fileHandle) scheduleSave();
  render();
}

function toggleComplete(id) {
  const tab = getTab();
  tab.complaints = tab.complaints.map(c => c.id === id ? { ...c, isCompleted: !c.isCompleted } : c);
  saveToLS();
  if (tab.fileHandle) scheduleSave();
  render();
}

// ===================================================================
// ФАЙЛ
// ===================================================================
async function connectFile() {
  const tab = getTab();
  const h = await pickDataFile();
  if (h) {
    tab.fileHandle = h;
    await loadDataFromHandle(h);
    showNotification('success', 'Файл подключён!');
    render();
  }
}

async function createFile() {
  const tab = getTab();
  const h = await createDataFile();
  if (h) {
    tab.fileHandle = h;
    tab.complaints = [];
    tab.connectionStatus = 'connected';
    const f = await h.getFile();
    tab.fileName = f.name;
    showNotification('success', 'Файл создан!');
    render();
  }
}

async function disconnectFile() {
  const tab = getTab();
  await removeFH();
  tab.fileHandle = null;
  tab.connectionStatus = 'disconnected';
  tab.fileName = '';
  tab.lastSaved = '';
  render();
}

// ===================================================================
// УВЕДОМЛЕНИЯ
// ===================================================================
function showNotification(type, text) {
  const el = document.getElementById('notification');
  el.className = `notification ${type}`;
  el.textContent = text;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}

// ===================================================================
// ФИЛЬТРАЦИЯ
// ===================================================================
function getElementId(baseId) {
  return activeTab === 'spb' ? baseId : `${baseId}-${activeTab}`;
}

function getFiltered() {
  const tab = getTab();
  const hc = document.getElementById(getElementId('hideCompleted')).checked;
  const sf = document.getElementById(getElementId('statusFilter')).value;
  const s = document.getElementById(getElementId('searchInput')).value.toLowerCase();
  return tab.complaints.filter(c => {
    if (hc && c.isCompleted) return false;
    if (sf && c.status !== sf) return false;
    if (s) {
      const responsiblesStr = Array.isArray(c.responsibles) ? c.responsibles.join(' ') : (c.responsible || '');
      const h = `${c.complaintNumber} ${c.complaintText} ${c.object} ${responsiblesStr} ${c.district}`.toLowerCase();
      if (!h.includes(s)) return false;
    }
    return true;
  });
}



function saveFilter() {
  localStorage.setItem(`hide_completed_${activeTab}`, document.getElementById(getElementId('hideCompleted')).checked);
}

// ===================================================================
// ОТОБРАЖЕНИЕ СОТРУДНИКОВ
// ===================================================================
function getResponsiblesDisplay(c) {
  if (Array.isArray(c.responsibles) && c.responsibles.length > 0) return c.responsibles.join(', ');
  else if (c.responsible && typeof c.responsible === 'string' && c.responsible.trim()) return c.responsible;
  return '—';
}

// ===================================================================
// РЕНДЕРИНГ
// ===================================================================
function render() {
  renderConnectionStatus();
  renderBanners();
  renderAlertsButton();
  renderStats();
  renderTable();
  const disconnectBtn = document.getElementById(getElementId('disconnectBtn'));
  const addBtn = document.getElementById(getElementId('addBtn'));
  if (disconnectBtn) disconnectBtn.style.display = getTab().fileHandle ? '' : 'none';
  if (addBtn) addBtn.disabled = getTab().connectionStatus === 'disconnected' && isFSASupported();
  updateFloatingButton();
}

function renderConnectionStatus() {
  const el = document.getElementById('connectionStatus');
  const tab = getTab();
  if (tab.connectionStatus === 'connected') {
    const sc = tab.isSaving ? 'saving' : '';
    const st = tab.isSaving
      ? '<span style="color:#fde68a;font-size:12px">💾 сохранение...</span>'
      : tab.lastSaved ? `<span style="color:#bbf7d0;font-size:12px">✓ ${tab.lastSaved}</span>` : '';
    el.innerHTML = `<div class="status-badge status-connected"><span class="dot ${sc}"></span><span style="color:#bbf7d0;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(tab.fileName)}</span>${st}</div>`;
  } else if (tab.connectionStatus === 'not_supported') {
    el.innerHTML = `<div class="status-badge status-local"><span class="dot"></span><span style="color:#fde68a">Локальный режим</span></div>`;
  } else el.innerHTML = '';
}

function renderBanners() {
  const el = document.getElementById(getElementId('banners'));
  const tab = getTab();
  const nc = tab.connectionStatus === 'disconnected' && isFSASupported();
  const ns = tab.connectionStatus === 'not_supported';
  if (nc) {
    el.innerHTML = `<div class="banner banner-warning"><div class="banner-icon">⚠️</div><div><h3>Файл данных не подключён</h3><p>Для совместной работы выберите файл данных на сетевом диске или создайте новый.</p><div class="banner-actions"><button class="btn btn-warning btn-sm" onclick="connectFile()">📂 Открыть файл</button><button class="btn btn-outline btn-sm" onclick="createFile()">📄 Создать новый</button></div></div></div>`;
  } else if (ns) {
    el.innerHTML = `<div class="banner banner-info"><div class="banner-icon">ℹ️</div><div><h3>Локальный режим</h3><p>Данные сохраняются в браузере. Используйте «Экспорт»/«Импорт» для обмена. Рекомендуется Chrome или Edge.</p></div></div>`;
  } else el.innerHTML = '';
}

function renderAlertsButton() {
  const el = document.getElementById('alertsBtn');
  const a = getDeadlineAlerts();
  if (a.length === 0) { el.innerHTML = ''; return; }
  const ov = a.filter(x => x.isOverdue).length;
  const ur = a.filter(x => !x.isOverdue).length;
  const cls = ov > 0 ? 'overdue' : 'urgent';
  let txt = '';
  if (ov > 0) txt += `Просрочено: ${ov}`;
  if (ur > 0) { if (txt) txt += ' '; txt += `Скоро: ${ur}`; }
  el.innerHTML = `<button class="alert-btn ${cls}" onclick="showDeadlineAlerts()"><svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>${txt}</button>`;
}

function renderStats() {
  const el = document.getElementById(getElementId('stats'));
  const tab = getTab();
  const f = getFiltered();
  const comp = tab.complaints.filter(c => c.isCompleted).length;
  const inp = tab.complaints.filter(c => !c.isCompleted).length;
  const hc = document.getElementById(getElementId('hideCompleted')).checked;
  el.innerHTML = `<span>Всего: <strong>${tab.complaints.length}</strong></span><span>Показано: <strong>${f.length}</strong></span><span>Завершено: <strong style="color:#16a34a">${comp}</strong></span><span>В работе: <strong style="color:#2563eb">${inp}</strong></span>${hc ? `<span style="color:#9ca3af">(скрыто: ${comp})</span>` : ''}`;
}

function renderTable() {
  const ct = document.getElementById(getElementId('tableContainer'));
  const f = getFiltered();
  if (f.length === 0) {
    ct.innerHTML = `<div class="table-wrapper"><div class="empty-state"><svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg><h3>Нет обращений</h3><p>Нажмите «Новое обращение» чтобы добавить запись</p></div></div>`;
    return;
  }
  let rows = '';
  for (const c of f) {
    const dlc = getDeadlineClass(c.responseDeadline, c.isCompleted);
    const dlt = getDeadlineTooltip(c.responseDeadline, c.isCompleted);
    const stcIdx = CONFIG.statuses.indexOf(c.status);
    const stc = stcIdx >= 0 && stcIdx < 7 ? `status-${c.status}` : `status-custom-${stcIdx % 6}`;
    const cc = c.isCompleted ? 'completed' : '';
    const chc = c.isCompleted ? 'checked' : '';
    rows += `<tr class="${cc}"><td class="cell-id">${c.id}</td><td class="cell-number">${esc(c.complaintNumber)}</td><td class="cell-text" title="${esc(c.complaintText)}" onclick="toggleExpand(this,event)">${esc(c.complaintText)}</td><td class="cell-district">${esc(c.district)}</td><td class="cell-object" title="${esc(c.object)}" onclick="toggleExpand(this,event)">${esc(c.object || '—')}</td><td class="cell-date">${c.receivedDate}</td><td class="cell-date ${dlc}" title="${esc(dlt)}">${c.responseDeadline || '—'}</td><td class="cell-dept">${c.department ? `<div class="dept-name">${esc(c.department)}</div><div class="emp-name">${esc(getResponsiblesDisplay(c))}</div>` : '<span style="color:#9ca3af">—</span>'}</td><td><span class="status-pill ${stc}">${esc(c.status)}</span></td><td style="text-align:center"><button class="complete-btn ${chc}" onclick="toggleComplete(${c.id})" title="${c.isCompleted ? 'Завершено' : 'Не завершено'}"><svg fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg></button></td><td><div class="actions-cell"><button class="action-btn edit" onclick="showEditForm(${c.id})" title="Редактировать"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></button><button class="action-btn delete" onclick="deleteComplaint(${c.id})" title="Удалить"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></div></td></tr>`;
  }
  ct.innerHTML = `<div class="table-wrapper"><div class="table-scroll"><table><thead><tr><th>№</th><th>Номер обр.</th><th>Текст жалобы</th><th>Район</th><th>Объект</th><th>Поступление</th><th>Ответ до <span style="font-weight:400;color:#9ca3af;font-size:11px">(р.д.)</span></th><th>Ответственный</th><th>Статус</th><th style="text-align:center">✓</th><th style="text-align:center">Действия</th></tr></thead><tbody>${rows}</tbody></table></div></div>`;
}

// ===================================================================
// РАСКРЫТИЕ СТРОК
// ===================================================================
function toggleExpand(el, event) {
  event.stopPropagation();
  el.classList.toggle('expanded');
}

// ===================================================================
// ВСТАВКА ИЗ БУФЕРА
// ===================================================================
async function pasteFromClipboard(fieldId) {
  try {
    const text = await navigator.clipboard.readText();
    const field = document.getElementById(fieldId);
    if (field) { field.value = text; field.focus(); }
  } catch { showNotification('error', 'Не удалось прочитать буфер обмена'); }
}

// ===================================================================
// ФОРМА
// ===================================================================
function showAddForm() {
  const t = new Date().toISOString().slice(0, 10);
  showForm({ complaintNumber: '', complaintText: '', district: '', object: '', receivedDate: t, responseDeadline: '', department: '', responsibles: [''], status: 'Новая', isCompleted: false }, true, false);
}

function showEditForm(id) {
  const tab = getTab();
  const c = tab.complaints.find(x => x.id === id);
  if (c) {
    let responsibles = [];
    if (Array.isArray(c.responsibles) && c.responsibles.length > 0) responsibles = [...c.responsibles];
    else if (c.responsible && typeof c.responsible === 'string' && c.responsible.trim()) responsibles = [c.responsible];
    if (responsibles.length === 0) responsibles = [''];
    const data = {
      complaintNumber: c.complaintNumber || '', complaintText: c.complaintText || '', district: c.district || '',
      object: c.object || '', receivedDate: c.receivedDate || '', responseDeadline: c.responseDeadline || '',
      department: c.department || '', responsibles: responsibles, status: c.status || 'Новая', isCompleted: !!c.isCompleted
    };
    showForm(data, false, c.isCompleted);
  }
}

function showForm(data, isNew, isCompleted = false) {
  const dOpts = CONFIG.districts.map(d => {
    const isSelected = data.district && data.district === d;
    return `<option value="${esc(d)}"${isSelected ? ' selected="selected"' : ''}>${esc(d)}</option>`;
  }).join('');
  const depOpts = Object.keys(CONFIG.departments).map(d => {
    const isSelected = data.department && data.department === d;
    return `<option value="${esc(d)}"${isSelected ? ' selected="selected"' : ''}>${esc(d)}</option>`;
  }).join('');
  const stOpts = CONFIG.statuses.map(s => {
    const isSelected = data.status && data.status === s;
    return `<option value="${esc(s)}"${isSelected ? ' selected="selected"' : ''}>${esc(s)}</option>`;
  }).join('');
  if (!Array.isArray(data.responsibles) || data.responsibles.length === 0) data.responsibles = [''];
  window._formResponsibles = [...data.responsibles];
  window._formDepartment = data.department || '';
  document.getElementById('modals').innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal"><div class="modal-header"><h2>${isNew ? 'Новое обращение' : 'Редактирование'}</h2><button class="modal-close" onclick="closeModal()"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div><div class="modal-body"><div class="form-group"><label>Номер обращения <span class="required">*</span></label><div class="input-with-paste"><input type="text" id="f_number" value="${esc(data.complaintNumber)}" placeholder="ОБР-2024-001"><button class="paste-btn" onclick="pasteFromClipboard('f_number')" title="Вставить из буфера"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></button></div></div><div class="form-group"><label>Текст жалобы <span class="required">*</span></label><div class="input-with-paste"><textarea id="f_text">${esc(data.complaintText)}</textarea><button class="paste-btn" onclick="pasteFromClipboard('f_text')" title="Вставить из буфера"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></button></div></div><div class="form-row"><div class="form-group"><label>Район <span class="required">*</span></label><select id="f_district"><option value="">Выберите район</option>${dOpts}</select></div><div class="form-group"><label>Объект</label><div class="input-with-paste"><input type="text" id="f_object" value="${esc(data.object)}" placeholder="Адрес или название"><button class="paste-btn" onclick="pasteFromClipboard('f_object')" title="Вставить из буфера"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></button></div></div></div><div class="form-row"><div class="form-group"><label>Дата поступления</label><input type="date" id="f_received" value="${data.receivedDate}"><div class="hint">Автоматически — текущая дата</div></div><div class="form-group"><label>Ответ до</label><input type="date" id="f_deadline" value="${data.responseDeadline}"></div></div><div class="form-row"><div class="form-group"><label>Отдел</label><select id="f_department" onchange="onDeptChange()"><option value="">Выберите отдел</option>${depOpts}</select></div><div class="form-group"><label>Ответственные сотрудники</label><div id="responsiblesContainer"></div></div></div><div class="form-group"><label>Статус</label><select id="f_status">${stOpts}</select></div></div><div class="modal-footer"><div style="flex:1">${!isNew ? `<button id="completeToggleBtn" class="btn ${isCompleted ? 'btn-secondary' : 'btn-success'}" onclick="toggleCompleteFromModal(${data.id}, ${!isCompleted})">${isCompleted ? 'Отменить завершение' : 'Завершить'}</button>` : ''}</div><button class="btn btn-secondary" onclick="closeModal()">Отмена</button><button class="btn btn-primary" onclick="submitForm(${isNew}, ${data.id || null})">${isNew ? 'Добавить' : 'Сохранить'}</button></div></div></div>`;
  setTimeout(() => renderResponsibles(), 0);
}

function onDeptChange() {
  const d = document.getElementById('f_department').value;
  window._formDepartment = d;
  window._formResponsibles = [''];
  renderResponsibles();
}

function renderResponsibles() {
  const container = document.getElementById('responsiblesContainer');
  if (!container) return;
  const dept = window._formDepartment;
  const emps = dept ? (CONFIG.departments[dept] || []) : [];
  const responsibles = window._formResponsibles || [''];
  let html = '';
  for (let i = 0; i < responsibles.length; i++) {
    const currentValue = responsibles[i] || '';
    const options = emps.map(e => `<option value="${esc(e)}"${currentValue === e ? ' selected' : ''}>${esc(e)}</option>`).join('');
    const placeholder = dept ? 'Выберите сотрудника' : 'Сначала выберите отдел';
    const disabled = !dept ? 'disabled' : '';
    html += `<div class="responsible-row"><select onchange="onResponsibleChange(${i}, this.value)" ${disabled}><option value="">${placeholder}</option>${options}</select>`;
    if (i === 0) {
      html += `<button type="button" class="emp-action-btn add" onclick="addResponsibleField()" title="Добавить сотрудника"><svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg></button>`;
    } else {
      html += `<button type="button" class="emp-action-btn remove" onclick="removeResponsibleField(${i})" title="Удалить"><svg fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button>`;
    }
    html += `</div>`;
  }
  container.innerHTML = html;
}

function onResponsibleChange(idx, value) { window._formResponsibles[idx] = value; }
function addResponsibleField() { window._formResponsibles.push(''); renderResponsibles(); }
function removeResponsibleField(idx) { window._formResponsibles.splice(idx, 1); if (window._formResponsibles.length === 0) window._formResponsibles = ['']; renderResponsibles(); }

function submitForm(isNew, id) {
  const n = document.getElementById('f_number').value.trim();
  const t = document.getElementById('f_text').value.trim();
  const d = document.getElementById('f_district').value;
  if (!n || !t || !d) { alert('Заполните обязательные поля!'); return; }
  const responsibles = (window._formResponsibles || []).filter(v => v && v.trim());
  const tab = getTab();
  const currentComplaint = isNew ? null : tab.complaints.find(x => x.id === id);
  const data = {
    complaintNumber: n, complaintText: t, district: d,
    object: document.getElementById('f_object').value.trim(),
    receivedDate: document.getElementById('f_received').value,
    responseDeadline: document.getElementById('f_deadline').value,
    department: document.getElementById('f_department').value,
    responsibles: responsibles,
    status: document.getElementById('f_status').value,
    isCompleted: currentComplaint ? currentComplaint.isCompleted : false
  };
  if (isNew) addComplaint(data); else updateComplaint(id, data);
  closeModal();
}

function closeModal() { document.getElementById('modals').innerHTML = ''; }

function toggleCompleteFromModal(id, shouldClose) {
  const tab = getTab();
  const c = tab.complaints.find(x => x.id === id);
  if (c) {
    c.isCompleted = !c.isCompleted;
    saveToLS();
    if (tab.fileHandle) scheduleSave();
    render();
    if (shouldClose) closeModal();
    else {
      const completeBtn = document.getElementById('completeToggleBtn');
      if (completeBtn) {
        if (c.isCompleted) {
          completeBtn.textContent = 'Отменить завершение';
          completeBtn.className = 'btn btn-secondary';
          completeBtn.setAttribute('onclick', 'toggleCompleteFromModal(' + id + ', false)');
        } else {
          completeBtn.textContent = 'Завершить';
          completeBtn.className = 'btn btn-success';
          completeBtn.setAttribute('onclick', 'toggleCompleteFromModal(' + id + ', true)');
        }
      }
    }
  }
}

// ===================================================================
// ОПОВЕЩЕНИЯ
// ===================================================================
function showDeadlineAlerts() {
  const a = getDeadlineAlerts();
  const ov = a.filter(x => x.isOverdue);
  const ur = a.filter(x => !x.isOverdue);
  let h = `<div class="modal-overlay" onclick="if(event.target===this)closeAlerts()"><div class="modal alerts-modal"><div class="alerts-header"><div><h2>⏰ Внимание! Истекают сроки</h2><p>${ov.length > 0 ? `${ov.length} просрочено, ` : ''}${ur.length} в ближайшие 2 рабочих дня</p></div><button class="modal-close" style="color:white" onclick="closeAlerts()"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div><div class="alerts-body">`;
  if (ov.length > 0) {
    h += `<div class="alerts-section"><h3 class="overdue"><span class="alert-count overdue">${ov.length}</span> Просрочено</h3>`;
    for (const x of ov) h += renderAlertItem(x, 'overdue');
    h += `</div>`;
  }
  if (ur.length > 0) {
    h += `<div class="alerts-section"><h3 class="urgent"><span class="alert-count urgent">${ur.length}</span> Скоро истекает</h3>`;
    for (const x of ur) h += renderAlertItem(x, 'urgent');
    h += `</div>`;
  }
  h += `</div><div class="alerts-footer"><p>💡 Расчёт учитывает только рабочие дни</p><button class="btn btn-secondary btn-sm" onclick="closeAlerts()">Закрыть</button></div></div></div>`;
  document.getElementById('modals').innerHTML = h;
}

function renderAlertItem(a, type) {
  const empDisplay = getResponsiblesDisplay(a);
  const empStr = empDisplay && empDisplay !== '—' ? `<span>👤 ${esc(empDisplay)}</span>` : '';
  return `<div class="alert-item ${type}"><div class="alert-item-info"><div class="alert-item-header"><span class="alert-item-number ${type}">${esc(a.complaintNumber)}</span><span class="alert-item-badge ${type}">${esc(a.message)}</span></div><div class="alert-item-text">${esc(a.complaintText)}</div><div class="alert-item-meta"><span>📍 ${esc(a.district)}${a.object ? `, ${esc(a.object)}` : ''}</span>${empStr}<span>📅 Срок: ${a.responseDeadline}</span></div></div><button class="btn btn-sm" style="margin-left:12px;flex-shrink:0;background:${type === 'overdue' ? '#dc2626' : '#d97706'};color:white" onclick="goToComplaint(${a.id})">Открыть</button></div>`;
}

function closeAlerts() {
  const tab = getTab();
  tab.alertsDismissed = true;
  closeModal();
}

function goToComplaint(id) {
  closeAlerts();
  document.getElementById(getElementId('hideCompleted')).checked = false;
  document.getElementById(getElementId('statusFilter')).value = '';
  document.getElementById(getElementId('searchInput')).value = '';
  saveFilter();
  render();
  showEditForm(id);
}

// ===================================================================
// НАСТРОЙКИ
// ===================================================================
let currentConfigTab = 'departments';

function showConfigModal() {
  const html = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal config-modal"><div class="modal-header"><h2>Настройки списков</h2><button class="modal-close" onclick="closeModal()"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div><div class="modal-body"><div class="config-tabs"><button class="config-tab active" onclick="switchConfigTab('departments')">Отделы и сотрудники</button><button class="config-tab" onclick="switchConfigTab('districts')">Районы</button><button class="config-tab" onclick="switchConfigTab('statuses')">Статусы</button></div><div id="configContent"></div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Закрыть</button></div></div></div>`;
  document.getElementById('modals').innerHTML = html;
  renderConfigContent();
}

function switchConfigTab(tab) {
  currentConfigTab = tab;
  document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  renderConfigContent();
}

function renderConfigContent() {
  const container = document.getElementById('configContent');
  if (currentConfigTab === 'departments') renderDepartmentsConfig(container);
  else if (currentConfigTab === 'districts') renderDistrictsConfig(container);
  else if (currentConfigTab === 'statuses') renderStatusesConfig(container);
}

function renderDepartmentsConfig(container) {
  let html = '';
  const depts = Object.keys(CONFIG.departments);
  for (const dept of depts) {
    const emps = CONFIG.departments[dept];
    html += `<div class="config-dept-block"><div class="config-dept-header"><div class="config-dept-name">${esc(dept)}</div><button class="btn-icon danger" onclick="deleteDepartment('${esc(dept)}')" title="Удалить отдел"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></div><div class="config-emp-list">`;
    for (const emp of emps) {
      html += `<div class="config-emp-item"><div class="config-emp-name">${esc(emp)}</div><button class="btn-icon danger" onclick="deleteEmployee('${esc(dept)}','${esc(emp)}')" title="Удалить"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>`;
    }
    html += `</div><div class="config-add-form"><input type="text" id="newEmp_${dept.replace(/\s+/g, '_')}" placeholder="ФИО нового сотрудника"><button class="btn btn-primary btn-sm" onclick="addEmployee('${esc(dept)}')">Добавить</button></div></div>`;
  }
  html += `<div class="config-add-form" style="margin-top:20px"><input type="text" id="newDeptName" placeholder="Название нового отдела"><button class="btn btn-primary btn-sm" onclick="addDepartment()">Добавить отдел</button></div>`;
  container.innerHTML = html;
}

function renderDistrictsConfig(container) {
  let html = '<div class="config-list">';
  for (const district of CONFIG.districts) {
    html += `<div class="config-item"><div class="config-item-name">${esc(district)}</div><button class="btn-icon danger" onclick="deleteDistrict('${esc(district)}')" title="Удалить"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>`;
  }
  html += `</div><div class="config-add-form"><input type="text" id="newDistrictName" placeholder="Название нового района"><button class="btn btn-primary btn-sm" onclick="addDistrict()">Добавить</button></div>`;
  container.innerHTML = html;
}

function renderStatusesConfig(container) {
  let html = '<div class="config-list">';
  for (const status of CONFIG.statuses) {
    html += `<div class="config-item"><div class="config-item-name">${esc(status)}</div><button class="btn-icon danger" onclick="deleteStatus('${esc(status)}')" title="Удалить"><svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div>`;
  }
  html += `</div><div class="config-add-form"><input type="text" id="newStatusName" placeholder="Название нового статуса"><button class="btn btn-primary btn-sm" onclick="addStatus()">Добавить</button></div>`;
  container.innerHTML = html;
}

function addDepartment() {
  const input = document.getElementById('newDeptName');
  const name = input.value.trim();
  if (!name) { alert('Введите название отдела'); return; }
  if (CONFIG.departments[name]) { alert('Такой отдел уже существует'); return; }
  CONFIG.departments[name] = [];
  input.value = '';
  saveConfig();
  renderConfigContent();
  updateStatusFilter();
}

function deleteDepartment(name) {
  if (!confirm(`Удалить отдел "${name}"?`)) return;
  delete CONFIG.departments[name];
  saveConfig();
  renderConfigContent();
  updateStatusFilter();
}

function addEmployee(dept) {
  const input = document.getElementById(`newEmp_${dept.replace(/\s+/g, '_')}`);
  const name = input.value.trim();
  if (!name) { alert('Введите ФИО'); return; }
  if (CONFIG.departments[dept].includes(name)) { alert('Такой сотрудник уже есть'); return; }
  CONFIG.departments[dept].push(name);
  input.value = '';
  saveConfig();
  renderConfigContent();
}

function deleteEmployee(dept, emp) {
  if (!confirm(`Удалить сотрудника "${emp}"?`)) return;
  CONFIG.departments[dept] = CONFIG.departments[dept].filter(e => e !== emp);
  saveConfig();
  renderConfigContent();
}

function addDistrict() {
  const input = document.getElementById('newDistrictName');
  const name = input.value.trim();
  if (!name) { alert('Введите название'); return; }
  if (CONFIG.districts.includes(name)) { alert('Уже есть'); return; }
  CONFIG.districts.push(name);
  input.value = '';
  saveConfig();
  renderConfigContent();
}

function deleteDistrict(name) {
  if (!confirm(`Удалить район "${name}"?`)) return;
  CONFIG.districts = CONFIG.districts.filter(d => d !== name);
  saveConfig();
  renderConfigContent();
}

function addStatus() {
  const input = document.getElementById('newStatusName');
  const name = input.value.trim();
  if (!name) { alert('Введите название'); return; }
  if (CONFIG.statuses.includes(name)) { alert('Уже есть'); return; }
  CONFIG.statuses.push(name);
  input.value = '';
  saveConfig();
  renderConfigContent();
  updateStatusFilter();
}

function deleteStatus(name) {
  if (!confirm(`Удалить статус "${name}"?`)) return;
  CONFIG.statuses = CONFIG.statuses.filter(s => s !== name);
  saveConfig();
  renderConfigContent();
  updateStatusFilter();
}

function saveConfig() {
  saveToLS();
  const tab = getTab();
  if (tab.fileHandle) scheduleSave();
  showNotification('success', 'Настройки сохранены');
}

function updateStatusFilter() {
  // Обновляем фильтры для обеих вкладок
  for (const tabKey of ['spb', 'pos']) {
    const sf = document.getElementById(tabKey === 'spb' ? 'statusFilter' : 'statusFilter-pos');
    if (sf) {
      const current = sf.value;
      sf.innerHTML = '<option value="">Все статусы</option>';
      for (const s of CONFIG.statuses) sf.innerHTML += `<option value="${esc(s)}">${esc(s)}</option>`;
      sf.value = current;
    }
  }
}

// ===================================================================
// СПРАВКА
// ===================================================================
function showInfo() {
  document.getElementById('modals').innerHTML = `<div class="modal-overlay" onclick="if(event.target===this)closeModal()"><div class="modal info-modal"><div class="modal-header"><h2>Справка</h2><button class="modal-close" onclick="closeModal()"><svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg></button></div><div class="info-body"><section><h3>📋 О программе</h3><p>Веб-приложение для ведения реестра обращений. Работает прямо в браузере — не требует установки дополнительных программ.</p></section><section><h3>🔗 Подключение к файлу</h3><div class="info-box"><p>Для совместной работы данные хранятся в JSON-файле на сетевом диске.</p><ol><li>Нажмите «Открыть файл» и выберите файл на сетевом диске</li><li>Или «Создать новый» для нового файла</li><li>Все изменения автосохраняются</li></ol></div></section><section><h3>📝 Как работать</h3><ul><li><strong>Добавление:</strong> «Новое обращение» → заполните форму</li><li><strong>Завершено:</strong> кликните ✓ в таблице</li><li><strong>Поиск:</strong> строка поиска и фильтр по статусу</li><li><strong>Сроки:</strong> подсветка (красный — просрочено, оранжевый — сегодня, жёлтый — скоро)</li></ul></section><section><h3>⚠️ Важно</h3><ul><li>Работает в Chrome и Edge (86+)</li><li>Индикатор «✓ время» — данные сохранены</li></ul></section></div><div class="modal-footer"><button class="btn btn-primary" onclick="closeModal()">Понятно</button></div></div></div>`;
}

// ===================================================================
// ПЛАВАЮЩАЯ КНОПКА
// ===================================================================
function updateFloatingButton() {
  const floatingBtn = document.getElementById('floatingAddBtn');
  const toolbarBtn = document.getElementById(getElementId('addBtn'));
  if (!floatingBtn || !toolbarBtn) return;
  const toolbarRect = toolbarBtn.getBoundingClientRect();
  const isScrolled = toolbarRect.top < -50;
  if (isScrolled && toolbarBtn.style.display !== 'none') floatingBtn.style.display = 'flex';
  else floatingBtn.style.display = 'none';
}

window.addEventListener('scroll', updateFloatingButton);
window.addEventListener('resize', updateFloatingButton);

// ===================================================================
// УТИЛИТЫ
// ===================================================================
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===================================================================
// ИНИЦИАЛИЗАЦИЯ
// ===================================================================
async function init() {
  // Инициализация фильтров для обеих вкладок
  for (const tabKey of ['spb', 'pos']) {
    const sf = document.getElementById(tabKey === 'spb' ? 'statusFilter' : 'statusFilter-pos');
    if (sf) {
      for (const s of CONFIG.statuses) sf.innerHTML += `<option value="${esc(s)}">${esc(s)}</option>`;
    }
    
    const hideCompleted = localStorage.getItem(`hide_completed_${tabKey}`);
    const hcElement = document.getElementById(tabKey === 'spb' ? 'hideCompleted' : 'hideCompleted-pos');
    if (hcElement && hideCompleted === 'true') hcElement.checked = true;
  }
  
  // Загрузка данных для обеих вкладок
  for (const tabKey of ['spb', 'pos']) {
    activeTab = tabKey;
    if (!isFSASupported()) {
      TABS[tabKey].connectionStatus = 'not_supported';
      const s = localStorage.getItem(`complaints_registry_${tabKey}`);
      if (s) try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) TABS[tabKey].complaints = parsed;
        else { TABS[tabKey].complaints = parsed.complaints || []; if (parsed.config) CONFIG = parsed.config; }
      } catch {}
    } else {
      const h = await getSavedHandle();
      if (h) {
        TABS[tabKey].fileHandle = h;
        await loadDataFromHandle(h);
      } else {
        TABS[tabKey].connectionStatus = 'disconnected';
      }
    }
  }
  
  activeTab = 'spb';
  render();
  
  setInterval(() => renderAlertsButton(), 30 * 60 * 1000);
}

















init();
