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

export const exportToCSV = (data: WorkoutExportData[], filename: string) => {
  const headers = ['Data', 'Nome da Sessão', 'Grupo Muscular', 'Exercício', 'Série', 'Repetições', 'Carga (kg)'];
  
  const csvContent = [
    headers.join(','),
    ...data.map(row => [
      row.date,
      row.sessionName,
      row.muscleGroup || '-',
      row.exercise,
      row.setNumber,
      row.reps,
      row.weight
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
