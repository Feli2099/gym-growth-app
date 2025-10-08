import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, Calendar, Dumbbell, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ExerciseData {
  date: string;
  weight: number;
  reps: number;
  displayDate: string;
}

interface ExerciseStats {
  lastWeight: number;
  maxWeight: number;
  avgReps: number;
  lastDate: string;
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
      .select('exercise_id, weight, reps')
      .in('exercise_id', exerciseIds);

    if (setsError || !sets) {
      setChartData([]);
      setStats(null);
      return;
    }

    // Group sets by session date and calculate max weight and avg reps per session
    const dataByDate = new Map<string, { weights: number[], reps: number[] }>();

    exercises.forEach(exercise => {
      const session = sessions.find(s => s.id === exercise.session_id);
      if (!session) return;

      const exerciseSets = sets.filter(s => s.exercise_id === exercise.id);
      const weights = exerciseSets.map(s => Number(s.weight));
      const reps = exerciseSets.map(s => Number(s.reps));

      if (weights.length > 0 && reps.length > 0) {
        if (!dataByDate.has(session.date)) {
          dataByDate.set(session.date, { weights: [], reps: [] });
        }
        dataByDate.get(session.date)!.weights.push(Math.max(...weights));
        dataByDate.get(session.date)!.reps.push(...reps);
      }
    });

    // Convert to chart data format
    const processedData: ExerciseData[] = Array.from(dataByDate.entries())
      .map(([date, data]) => ({
        date,
        weight: Math.max(...data.weights),
        reps: Math.round(data.reps.reduce((a, b) => a + b, 0) / data.reps.length),
        displayDate: format(new Date(date), 'dd/MM', { locale: ptBR })
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setChartData(processedData);

    // Calculate stats
    if (processedData.length > 0) {
      const allWeights = processedData.map(d => d.weight);
      const allReps = processedData.map(d => d.reps);
      const lastData = processedData[processedData.length - 1];
      
      setStats({
        lastWeight: allWeights[allWeights.length - 1],
        maxWeight: Math.max(...allWeights),
        avgReps: Math.round(allReps.reduce((a, b) => a + b, 0) / allReps.length),
        lastDate: format(new Date(lastData.date), "dd 'de' MMMM", { locale: ptBR }),
        totalSessions: processedData.length
      });
    } else {
      setStats(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-primary">Progressão</h2>
      </div>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary">Selecione um exercício</CardTitle>
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
        <Card className="shadow-lg border-2 border-primary/20">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-primary">
              <BarChart3 className="h-6 w-6" />
              Evolução de {selectedExercise}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length < 2 ? (
              <div className="text-center text-muted-foreground py-12 bg-muted/20 rounded-lg">
                <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">Ainda não há dados suficientes para gerar o gráfico de progressão deste exercício.</p>
                <p className="text-sm mt-2">Registre pelo menos 2 treinos para visualizar sua evolução.</p>
              </div>
            ) : (
              <>
                <div className="w-full h-80 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                      <XAxis 
                        dataKey="displayDate" 
                        stroke="hsl(var(--muted-foreground))"
                        style={{ fontSize: '13px', fontWeight: '500' }}
                        tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      />
                      <YAxis 
                        yAxisId="left"
                        stroke="hsl(4 90% 58%)"
                        style={{ fontSize: '13px', fontWeight: '500' }}
                        label={{ 
                          value: 'Carga (kg)', 
                          angle: -90, 
                          position: 'insideLeft',
                          style: { fill: 'hsl(4 90% 58%)', fontWeight: '600' }
                        }}
                        tick={{ fill: 'hsl(4 90% 58%)' }}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        stroke="hsl(217 91% 60%)"
                        style={{ fontSize: '13px', fontWeight: '500' }}
                        label={{ 
                          value: 'Repetições', 
                          angle: 90, 
                          position: 'insideRight',
                          style: { fill: 'hsl(217 91% 60%)', fontWeight: '600' }
                        }}
                        tick={{ fill: 'hsl(217 91% 60%)' }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '2px solid hsl(var(--primary))',
                          borderRadius: '12px',
                          padding: '12px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                        }}
                        labelStyle={{ fontWeight: '600', marginBottom: '8px' }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="line"
                      />
                      <Line 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="weight" 
                        stroke="hsl(4 90% 58%)" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(4 90% 58%)', r: 5, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 7, strokeWidth: 2 }}
                        name="Carga (kg)"
                        animationDuration={800}
                      />
                      <Line 
                        yAxisId="right"
                        type="monotone" 
                        dataKey="reps" 
                        stroke="hsl(217 91% 60%)" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(217 91% 60%)', r: 5, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 7, strokeWidth: 2 }}
                        name="Repetições"
                        animationDuration={800}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {stats && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t-2 border-border">
                    <div className="text-center bg-primary/5 rounded-xl p-4">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                        <Dumbbell className="h-4 w-4" />
                        Maior carga
                      </div>
                      <div className="text-3xl font-bold text-primary">
                        {stats.maxWeight}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">kg</div>
                    </div>
                    <div className="text-center bg-blue-500/5 rounded-xl p-4">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                        <TrendingUp className="h-4 w-4" />
                        Média de reps
                      </div>
                      <div className="text-3xl font-bold" style={{ color: 'hsl(217 91% 60%)' }}>
                        {stats.avgReps}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">repetições</div>
                    </div>
                    <div className="text-center bg-muted/50 rounded-xl p-4">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                        <Calendar className="h-4 w-4" />
                        Última data
                      </div>
                      <div className="text-base font-bold text-foreground">
                        {stats.lastDate}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{stats.lastWeight} kg</div>
                    </div>
                    <div className="text-center bg-muted/50 rounded-xl p-4">
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-2">
                        <BarChart3 className="h-4 w-4" />
                        Total sessões
                      </div>
                      <div className="text-3xl font-bold text-foreground">
                        {stats.totalSessions}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">treinos</div>
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
