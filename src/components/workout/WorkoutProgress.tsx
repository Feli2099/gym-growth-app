import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp } from 'lucide-react';

const WorkoutProgress = () => {
  const [exercises, setExercises] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Progressão</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Selecione um exercício</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedExercise} onValueChange={setSelectedExercise}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um exercício" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="supino">Supino reto</SelectItem>
              <SelectItem value="agachamento">Agachamento</SelectItem>
              <SelectItem value="levantamento">Levantamento terra</SelectItem>
            </SelectContent>
          </Select>
          {selectedExercise && (
            <div className="mt-6 text-center text-muted-foreground">
              Gráfico de progressão em desenvolvimento
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkoutProgress;
