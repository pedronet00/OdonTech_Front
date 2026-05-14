import type { Patient, Appointment, RecordEntry, FinanceTransaction } from '../../domain/models/types';

export const mockPatients: Patient[] = [
  { id: '1', name: 'Maria Silva', email: 'maria@example.com', phone: '(11) 98765-4321', birthDate: '1985-04-12', joinDate: '2023-01-15' },
  { id: '2', name: 'João Santos', email: 'joao@example.com', phone: '(11) 91234-5678', birthDate: '1990-11-23', joinDate: '2023-05-10' },
  { id: '3', name: 'Ana Costa', email: 'ana@example.com', phone: '(11) 99988-7766', birthDate: '1975-08-05', joinDate: '2024-02-28' },
];

export const mockAppointments: Appointment[] = [
  { id: '1', patientId: '1', patientName: 'Maria Silva', date: '2024-06-15', time: '10:00', type: 'routine', status: 'scheduled' },
  { id: '2', patientId: '2', patientName: 'João Santos', date: '2024-06-15', time: '14:30', type: 'evaluation', status: 'scheduled' },
  { id: '3', patientId: '3', patientName: 'Ana Costa', date: '2024-06-16', time: '09:00', type: 'procedure', status: 'scheduled' },
];

export const mockRecords: RecordEntry[] = [
  {
    id: '1',
    patientId: '1',
    date: '2023-01-15',
    anamnesis: 'Paciente relata sensibilidade no dente 36.',
    procedure: 'Avaliação inicial + Profilaxia',
    notes: 'Agendada restauração para próxima semana.'
  }
];

export const mockTransactions: FinanceTransaction[] = [
  { id: '1', patientId: '1', patientName: 'Maria Silva', amount: 250, date: '2024-05-10', description: 'Profilaxia', status: 'paid' },
  { id: '2', patientId: '2', patientName: 'João Santos', amount: 800, date: '2024-06-10', description: 'Clareamento', status: 'pending' },
];
