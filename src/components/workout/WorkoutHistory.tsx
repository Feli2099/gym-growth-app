import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Workout {
  id: string;
  exercise: string;
  weight: number;
  sets: number;
  reps: number;
  notes: string;
  created_at: string;
}

const WorkoutHistory = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) setWorkouts(data);
    setLoading(false);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <History className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Histórico</h2>
      </div>
      {workouts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum treino registrado ainda
          </CardContent>
        </Card>
      ) : (
        workouts.map((workout) => (
          <Card key={workout.id}>
            <CardHeader>
              <CardTitle className="text-lg">{workout.exercise}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {format(new Date(workout.created_at), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-2">
                <div>
                  <p className="text-sm text-muted-foreground">Carga</p>
                  <p className="text-lg font-semibold">{workout.weight} kg</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Séries</p>
                  <p className="text-lg font-semibold">{workout.sets}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reps</p>
                  <p className="text-lg font-semibold">{workout.reps}</p>
                </div>
              </div>
              {workout.notes && (
                <p className="text-sm text-muted-foreground mt-2">{workout.notes}</p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

export default WorkoutHistory;
