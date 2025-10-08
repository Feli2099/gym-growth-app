import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const WorkoutProgress = () => {
  const [exercises, setExercises] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchExercises();
  }, []);

  const fetchExercises = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('session_exercises')
      .select('exercise_name');

    if (error) {
      toast({
        title: 'Erro ao carregar exercícios',
        description: error.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const uniqueExercises = Array.from(
      new Set(data?.map(item => item.exercise_name) || [])
    ).sort((a, b) => a.localeCompare(b));

    setExercises(uniqueExercises);
    setLoading(false);
  };

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
          {loading ? (
            <div className="text-center text-muted-foreground">
              Carregando exercícios...
            </div>
          ) : exercises.length === 0 ? (
            <div className="text-center text-muted-foreground">
              Nenhum exercício registrado ainda. Vá até a aba Registrar para começar.
            </div>
          ) : (
            <>
              <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um exercício registrado" />
                </SelectTrigger>
                <SelectContent>
                  {exercises.map((exercise) => (
                    <SelectItem key={exercise} value={exercise}>
                      {exercise}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedExercise && (
                <div className="mt-6 text-center text-muted-foreground">
                  Gráfico de progressão em desenvolvimento
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkoutProgress;
