// Импортируем данные из JSON-файлов
// Для редактирования списков откройте соответствующие файлы в папке src/data/

import districtsData from './districts.json';
import departmentsData from './departments.json';
import statusesData from './statuses.json';

// Список районов
export const DISTRICTS: string[] = districtsData;

// Отделы и их сотрудники
export const DEPARTMENTS: Record<string, string[]> = departmentsData;

// Статусы жалоб
export const COMPLAINT_STATUSES: string[] = statusesData;
