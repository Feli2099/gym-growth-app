import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Dumbbell, TrendingUp } from 'lucide-react';
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4" style={{ color: 'hsl(var(--destructive))' }}>
          Histórico
        </h2>

        {/* Last Workout Highlight */}
        <Card className="mb-6 border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Último Treino</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              {format(new Date(latestSession.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </div>
            <h3 className="text-xl font-semibold">{latestSession.name}</h3>
            <div className="space-y-2">
              {latestSession.exercises.slice(0, 3).map((exercise) => (
                <div key={exercise.id} className="text-sm">
                  <span className="font-medium">{exercise.exercise_name}</span>
                  <span className="text-muted-foreground ml-2">
                    {exercise.sets.length}x séries
                  </span>
                </div>
              ))}
              {latestSession.exercises.length > 3 && (
                <p className="text-sm text-muted-foreground">
                  +{latestSession.exercises.length - 3} exercícios
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* All Sessions */}
        <Accordion type="single" collapsible className="space-y-4">
          {sessions.map((session) => (
            <AccordionItem key={session.id} value={session.id} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex flex-col items-start gap-1 text-left">
                  <span className="font-semibold">{session.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(session.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  {session.exercises.map((exercise) => (
                    <div key={exercise.id} className="space-y-2">
                      <h4 className="font-medium">{exercise.exercise_name}</h4>
                      <div className="space-y-1">
                        {exercise.sets.map((set) => (
                          <div
                            key={set.set_number}
                            className="flex items-center gap-4 text-sm bg-muted/50 rounded px-3 py-2"
                          >
                            <span className="font-medium w-16">Série {set.set_number}</span>
                            <span>{set.reps} reps</span>
                            <span className="ml-auto font-medium">{set.weight} kg</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};

export default SessionHistory;
