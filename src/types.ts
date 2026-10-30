export interface Complaint {
  id: number; // Порядковый номер (авто)
  complaintNumber: string; // Номер обращения
  complaintText: string; // Текст жалобы
  district: string; // Район
  object: string; // Объект
  receivedDate: string; // Дата поступления
  responseDeadline: string; // Ответ до
  department: string; // Отдел
  responsible: string; // Ответственный сотрудник
  status: string; // Статус жалобы
  isCompleted: boolean; // Завершено
}

export type ComplaintFormData = Omit<Complaint, 'id'>;
