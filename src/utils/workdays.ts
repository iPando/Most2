// Проверка, является ли дата выходным (суббота=6, воскресенье=0)
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Добавить N рабочих дней к дате
export function addWorkdays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    if (!isWeekend(result)) {
      added++;
    }
  }
  return result;
}

// Подсчитать количество рабочих дней между двумя датами (может быть отрицательным)
export function workdaysBetween(from: Date, to: Date): number {
  const fromDate = new Date(from);
  fromDate.setHours(0, 0, 0, 0);
  const toDate = new Date(to);
  toDate.setHours(0, 0, 0, 0);

  if (fromDate.getTime() === toDate.getTime()) return 0;

  const sign = toDate > fromDate ? 1 : -1;
  let count = 0;
  const current = new Date(fromDate);

  while (true) {
    current.setDate(current.getDate() + sign);
    if (!isWeekend(current)) {
      count += sign;
    }
    if (current.getTime() === toDate.getTime()) break;
    // Защита от бесконечного цикла
    if (Math.abs(count) > 1000) break;
  }
  return count;
}

// Сравнение дат только по дате (без времени)
export function isSameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export interface DeadlineAlert {
  id: number;
  complaintNumber: string;
  complaintText: string;
  district: string;
  object: string;
  responsible: string;
  deadline: string;
  daysLeft: number; // рабочих дней осталось
  isOverdue: boolean;
  message: string;
}

// Получить список оповещений о сроках
export function getDeadlineAlerts(complaints: { id: number; complaintNumber: string; complaintText: string; district: string; object: string; responsible: string; responseDeadline: string; isCompleted: boolean }[]): DeadlineAlert[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const alerts: DeadlineAlert[] = [];

  for (const c of complaints) {
    if (c.isCompleted) continue;
    if (!c.responseDeadline) continue;

    const deadline = new Date(c.responseDeadline);
    deadline.setHours(0, 0, 0, 0);

    const daysLeft = workdaysBetween(today, deadline);

    // Оповещаем если: просрочено (daysLeft < 0) или осталось 0, 1, 2 рабочих дня
    if (daysLeft <= 2) {
      let message = '';
      let isOverdue = false;

      if (daysLeft < 0) {
        isOverdue = true;
        const overdueDays = Math.abs(daysLeft);
        message = `Просрочено на ${overdueDays} р. дн.`;
      } else if (daysLeft === 0) {
        message = 'Срок — СЕГОДНЯ!';
      } else if (daysLeft === 1) {
        message = 'Срок — завтра (1 р. дн.)';
      } else if (daysLeft === 2) {
        message = 'Срок через 2 р. дня';
      }

      alerts.push({
        id: c.id,
        complaintNumber: c.complaintNumber,
        complaintText: c.complaintText,
        district: c.district,
        object: c.object,
        responsible: c.responsible,
        deadline: c.responseDeadline,
        daysLeft,
        isOverdue,
        message,
      });
    }
  }

  // Сортируем: сначала просроченные, потом по возрастанию дней
  alerts.sort((a, b) => a.daysLeft - b.daysLeft);
  return alerts;
}
