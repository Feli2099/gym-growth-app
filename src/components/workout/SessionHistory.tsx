import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Dumbbell, TrendingUp, History as HistoryIcon, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportToCSV } from '@/utils/exportData';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface ExerciseSet {
  set_number: number;
  reps: number;
  weight: number;
}

interface SessionExercise {
  id: string;
  exercise_name: string;
  sets: ExerciseSet[];
}

interface WorkoutSession {
  id: string;
  name: string;
  date: string;
  exercises: SessionExercise[];
}

const SessionHistory = () => {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return;

    // Fetch sessions
    const { data: sessionsData, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      setLoading(false);
      return;
    }

    if (!sessionsData || sessionsData.length === 0) {
      setLoading(false);
      return;
    }

    // Fetch exercises for each session
    const sessionsWithExercises = await Promise.all(
      sessionsData.map(async (session) => {
        const { data: exercisesData } = await supabase
          .from('session_exercises')
          .select('*')
          .eq('session_id', session.id);

        if (!exercisesData) return { ...session, exercises: [] };

        // Fetch sets for each exercise
        const exercisesWithSets = await Promise.all(
          exercisesData.map(async (exercise) => {
            const { data: setsData } = await supabase
              .from('exercise_sets')
              .select('*')
              .eq('exercise_id', exercise.id)
              .order('set_number', { ascending: true });

            return {
              id: exercise.id,
              exercise_name: exercise.exercise_name,
              sets: setsData || [],
            };
          })
        );

        return {
          id: session.id,
          name: session.name,
          date: session.date,
          exercises: exercisesWithSets,
        };
      })
    );

    setSessions(sessionsWithExercises);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Dumbbell className="h-8 w-8 animate-pulse text-primary" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Nenhum treino registrado ainda.</p>
        </CardContent>
      </Card>
    );
  }

  const latestSession = sessions[0];

  const calculateExerciseStats = (exercise: SessionExercise) => {
    if (exercise.sets.length === 0) return { avgWeight: 0, avgReps: 0 };
    
    const totalWeight = exercise.sets.reduce((sum, set) => sum + set.weight, 0);
    const totalReps = exercise.sets.reduce((sum, set) => sum + set.reps, 0);
    
    return {
      avgWeight: totalWeight / exercise.sets.length,
      avgReps: totalReps / exercise.sets.length,
    };
  };

  const handleExportCSV = async () => {
    const exportData = sessions.flatMap(session =>
      session.exercises.flatMap(exercise =>
        exercise.sets.map(set => ({
          date: format(new Date(session.date), 'dd/MM/yyyy', { locale: ptBR }),
          sessionName: session.name,
          muscleGroup: (session as any).muscle_group || '-',
          exercise: exercise.exercise_name,
          setNumber: set.set_number,
          reps: set.reps,
          weight: set.weight,
        }))
      )
    );

    exportToCSV(
      exportData,
      `treinos-${format(new Date(), 'yyyy-MM-dd')}.csv`
    );

    toast({
      title: 'Dados exportados!',
      description: 'Seu histórico foi exportado em formato CSV.',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HistoryIcon className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-primary">Histórico</h2>
        </div>
        <Button onClick={handleExportCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Last Workout Highlight */}
      <Card className="border-2 border-primary shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg text-primary">Último Treino</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {format(new Date(latestSession.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
          <h3 className="text-xl font-semibold">{latestSession.name}</h3>
          <div className="space-y-3">
            {latestSession.exercises.slice(0, 3).map((exercise) => {
              const stats = calculateExerciseStats(exercise);
              return (
                <div key={exercise.id} className="bg-muted/30 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{exercise.exercise_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {exercise.sets.length}x séries
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground">
                    <span>Média: {stats.avgWeight.toFixed(1)} kg</span>
                    <span>•</span>
                    <span>{stats.avgReps.toFixed(1)} reps</span>
                  </div>
                </div>
              );
            })}
            {latestSession.exercises.length > 3 && (
              <p className="text-sm text-muted-foreground text-center">
                +{latestSession.exercises.length - 3} exercícios
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* All Sessions */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Todos os Treinos</h3>
        <Accordion type="single" collapsible className="space-y-3">
          {sessions.map((session, index) => (
            <div key={session.id}>
              {index > 0 && (
                <div className="flex items-center gap-4 my-4">
                  <div className="h-px bg-border flex-1" />
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(session.date), "dd MMM", { locale: ptBR })}
                  </div>
                  <div className="h-px bg-border flex-1" />
                </div>
              )}
              <AccordionItem value={session.id} className="border-2 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/50">
                  <div className="flex flex-col items-start gap-2 text-left w-full">
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-lg">{session.name}</span>
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(session.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-5 pb-5 pt-2">
                  <div className="space-y-5">
                    {session.exercises.map((exercise) => {
                      const stats = calculateExerciseStats(exercise);
                      return (
                        <div key={exercise.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-base">{exercise.exercise_name}</h4>
                            <div className="flex gap-3 text-xs text-muted-foreground">
                              <span className="font-medium text-primary">
                                {stats.avgWeight.toFixed(1)} kg média
                              </span>
                              <span>•</span>
                              <span>{stats.avgReps.toFixed(1)} reps</span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {exercise.sets.map((set) => (
                              <div
                                key={set.set_number}
                                className="flex items-center gap-4 text-sm bg-muted/40 rounded-lg px-4 py-3 hover:bg-muted/60 transition-colors"
                              >
                                <span className="font-semibold text-primary min-w-[70px]">
                                  Série {set.set_number}
                                </span>
                                <span className="text-muted-foreground">{set.reps} reps</span>
                                <span className="ml-auto font-bold text-foreground">
                                  {set.weight} kg
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </div>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default SessionHistory;
