import { format } from 'date-fns';

interface WorkoutExportData {
  date: string;
  sessionName: string;
  muscleGroup: string;
  exercise: string;
  setNumber: number;
  reps: number;
  weight: number;
}

const escapeCSV = (val: string | number): string => {
  const str = String(val);
  const safe = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const exportToCSV = (data: WorkoutExportData[], filename: string) => {
  const headers = ['Data', 'Nome da Sessão', 'Grupo Muscular', 'Exercício', 'Série', 'Repetições', 'Carga (kg)'];
  
  const csvContent = [
    headers.map(h => escapeCSV(h)).join(','),
    ...data.map(row => [
      escapeCSV(row.date),
      escapeCSV(row.sessionName),
      escapeCSV(row.muscleGroup || '-'),
      escapeCSV(row.exercise),
      escapeCSV(row.setNumber),
      escapeCSV(row.reps),
      escapeCSV(row.weight)
    ].join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
