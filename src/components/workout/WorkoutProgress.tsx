import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Calendar, Dumbbell, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExerciseData {
  date: string;
  weight: number;
  displayDate: string;
}

interface ExerciseStats {
  lastWeight: number;
  maxWeight: number;
  totalSessions: number;
}

const WorkoutProgress = () => {
  const [exercises, setExercises] = useState<string[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ExerciseData[]>([]);
  const [stats, setStats] = useState<ExerciseStats | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchExercises();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workout_sessions'
        },
        () => {
          fetchExercises();
          if (selectedExercise) {
            fetchExerciseData(selectedExercise);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_exercises'
        },
        () => {
          fetchExercises();
          if (selectedExercise) {
            fetchExerciseData(selectedExercise);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'exercise_sets'
        },
        () => {
          if (selectedExercise) {
            fetchExerciseData(selectedExercise);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedExercise]);

  useEffect(() => {
    if (selectedExercise) {
      fetchExerciseData(selectedExercise);
    }
  }, [selectedExercise]);

  const fetchExercises = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    const { data: sessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', user.id);

    if (sessionsError) {
      toast({
        title: 'Erro ao carregar exercícios',
        description: sessionsError.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (!sessions || sessions.length === 0) {
      setExercises([]);
      setLoading(false);
      return;
    }

    const sessionIds = sessions.map(s => s.id);

    const { data, error } = await supabase
      .from('session_exercises')
      .select('exercise_name')
      .in('session_id', sessionIds);

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

  const fetchExerciseData = async (exerciseName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return;

    // Get all sessions with this exercise
    const { data: sessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('id, date')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (sessionsError || !sessions) {
      toast({
        title: 'Erro ao carregar dados',
        description: sessionsError?.message,
        variant: 'destructive',
      });
      return;
    }

    const sessionIds = sessions.map(s => s.id);

    // Get exercises matching the name
    const { data: exercises, error: exercisesError } = await supabase
      .from('session_exercises')
      .select('id, session_id')
      .eq('exercise_name', exerciseName)
      .in('session_id', sessionIds);

    if (exercisesError || !exercises) {
      setChartData([]);
      setStats(null);
      return;
    }

    const exerciseIds = exercises.map(e => e.id);

    if (exerciseIds.length === 0) {
      setChartData([]);
      setStats(null);
      return;
    }

    // Get all sets for these exercises
    const { data: sets, error: setsError } = await supabase
      .from('exercise_sets')
      .select('exercise_id, weight')
      .in('exercise_id', exerciseIds);

    if (setsError || !sets) {
      setChartData([]);
      setStats(null);
      return;
    }

    // Group sets by session date and calculate max weight per session
    const dataByDate = new Map<string, number[]>();

    exercises.forEach(exercise => {
      const session = sessions.find(s => s.id === exercise.session_id);
      if (!session) return;

      const exerciseSets = sets.filter(s => s.exercise_id === exercise.id);
      const weights = exerciseSets.map(s => Number(s.weight));

      if (weights.length > 0) {
        if (!dataByDate.has(session.date)) {
          dataByDate.set(session.date, []);
        }
        dataByDate.get(session.date)!.push(Math.max(...weights));
      }
    });

    // Convert to chart data format
    const processedData: ExerciseData[] = Array.from(dataByDate.entries())
      .map(([date, weights]) => ({
        date,
        weight: Math.max(...weights), // Use max weight for that date
        displayDate: format(new Date(date), 'dd/MM', { locale: ptBR })
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setChartData(processedData);

    // Calculate stats
    if (processedData.length > 0) {
      const allWeights = processedData.map(d => d.weight);
      setStats({
        lastWeight: allWeights[allWeights.length - 1],
        maxWeight: Math.max(...allWeights),
        totalSessions: processedData.length
      });
    } else {
      setStats(null);
    }
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
            </>
          )}
        </CardContent>
      </Card>

      {selectedExercise && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Evolução de carga no exercício {selectedExercise}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length < 2 ? (
              <div className="text-center text-muted-foreground py-8">
                Ainda não há dados suficientes para gerar o gráfico de progressão deste exercício.
              </div>
            ) : (
              <>
                <div className="w-full h-64 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="displayDate" 
                        stroke="#666"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#666"
                        style={{ fontSize: '12px' }}
                        label={{ value: 'Carga (kg)', angle: -90, position: 'insideLeft' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#fff',
                          border: '1px solid #E53935',
                          borderRadius: '8px'
                        }}
                        formatter={(value: number) => [`${value} kg`, 'Carga']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#E53935" 
                        strokeWidth={2}
                        dot={{ fill: '#E53935', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {stats && (
                  <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-1">
                        <Dumbbell className="h-4 w-4" />
                        Última carga
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {stats.lastWeight} kg
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-1">
                        <TrendingUp className="h-4 w-4" />
                        Maior carga
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {stats.maxWeight} kg
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        Total de sessões
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {stats.totalSessions}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WorkoutProgress;
