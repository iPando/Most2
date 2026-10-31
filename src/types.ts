// ===== ТИПЫ =====
export interface Complaint {
  id: number;
  complaintNumber: string;
  complaintText: string;
  district: string;
  object: string;
  receivedDate: string;
  responseDeadline: string;
  department: string;
  responsibles: string[];
  status: string;
  isCompleted: boolean;
}

export interface Config {
  districts: string[];
  departments: Record<string, string[]>;
  statuses: string[];
}
