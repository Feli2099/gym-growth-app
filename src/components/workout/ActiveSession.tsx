import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, CheckCircle2, Play } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ExerciseSet {
  id?: string;
  exercise_id: string;
  set_number: number;
  reps: number;
  weight: number;
}

interface Exercise {
  id: string;
  exercise_name: string;
  sets: ExerciseSet[];
}

interface ActiveSessionProps {
  onSessionEnd: () => void;
}

const ActiveSession = ({ onSessionEnd }: ActiveSessionProps) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentExerciseName, setCurrentExerciseName] = useState('');
  const [currentReps, setCurrentReps] = useState('');
  const [currentWeight, setCurrentWeight] = useState('');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestedWeight, setSuggestedWeight] = useState<number | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadActiveSession();
  }, []);

  const loadActiveSession = async () => {
    const stored = localStorage.getItem('activeSession');
    if (stored) {
      const { sessionId: id, sessionName: name, sessionDate: date } = JSON.parse(stored);
      setSessionId(id);
      setSessionName(name);
      setSessionDate(date);
      await loadSessionExercises(id);
    }
  };

  const loadSessionExercises = async (sessionId: string) => {
    const { data: exercisesData } = await supabase
      .from('session_exercises')
      .select('*')
      .eq('session_id', sessionId);

    if (!exercisesData) return;

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

    setExercises(exercisesWithSets);
  };

  const fetchLastWeightSuggestion = async (exerciseName: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get last 2 sessions with this exercise
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id, date')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(5);

    if (!sessions || sessions.length === 0) return;

    const sessionIds = sessions.map(s => s.id);

    const { data: exercises } = await supabase
      .from('session_exercises')
      .select('id, session_id')
      .eq('exercise_name', exerciseName)
      .in('session_id', sessionIds)
      .limit(1);

    if (!exercises || exercises.length === 0) {
      setSuggestedWeight(null);
      return;
    }

    const { data: sets } = await supabase
      .from('exercise_sets')
      .select('weight')
      .eq('exercise_id', exercises[0].id)
      .order('set_number', { ascending: false })
      .limit(1);

    if (sets && sets.length > 0) {
      const lastWeight = Number(sets[0].weight);
      setSuggestedWeight(lastWeight + 2.5);
    }
  };

  const startSession = async () => {
    if (!sessionName.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite o nome da sessão',
        variant: 'destructive',
      });
      return;
    }

    const date = new Date().toISOString().split('T')[0];
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado',
        variant: 'destructive',
      });
      return;
    }

    const { data: session, error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        name: sessionName.trim(),
        date: date,
      })
      .select()
      .single();

    if (error || !session) {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a sessão',
        variant: 'destructive',
      });
      return;
    }

    setSessionId(session.id);
    setSessionDate(date);
    localStorage.setItem('activeSession', JSON.stringify({
      sessionId: session.id,
      sessionName: sessionName.trim(),
      sessionDate: date,
    }));

    toast({
      title: 'Sessão iniciada!',
      description: 'Agora você pode registrar suas séries.',
    });
  };

  const addSet = async () => {
    if (!sessionId) return;

    if (!currentReps || !currentWeight) {
      toast({
        title: 'Erro',
        description: 'Preencha repetições e carga',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    let exerciseId = selectedExerciseId;

    // Se não tem exercício selecionado e tem nome, criar novo
    if (!exerciseId && currentExerciseName.trim()) {
      const { data: newExercise, error: exerciseError } = await supabase
        .from('session_exercises')
        .insert({
          session_id: sessionId,
          exercise_name: currentExerciseName.trim(),
        })
        .select()
        .single();

      if (exerciseError || !newExercise) {
        toast({
          title: 'Erro',
          description: 'Não foi possível criar o exercício',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      exerciseId = newExercise.id;
      setExercises([...exercises, {
        id: newExercise.id,
        exercise_name: newExercise.exercise_name,
        sets: [],
      }]);
      setSelectedExerciseId(newExercise.id);
    }

    if (!exerciseId) {
      toast({
        title: 'Erro',
        description: 'Selecione ou crie um exercício',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const exercise = exercises.find(e => e.id === exerciseId);
    const setNumber = (exercise?.sets.length || 0) + 1;

    const { data: newSet, error: setError } = await supabase
      .from('exercise_sets')
      .insert({
        exercise_id: exerciseId,
        set_number: setNumber,
        reps: parseInt(currentReps),
        weight: parseFloat(currentWeight),
      })
      .select()
      .single();

    if (setError || !newSet) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar a série',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    setExercises(exercises.map(ex => 
      ex.id === exerciseId 
        ? { ...ex, sets: [...ex.sets, newSet] }
        : ex
    ));

    setCurrentReps('');
    setCurrentWeight('');
    setLoading(false);

    toast({
      title: 'Série registrada!',
      description: `Série ${setNumber} salva com sucesso.`,
    });
  };

  const deleteSet = async (exerciseId: string, setId: string) => {
    const { error } = await supabase
      .from('exercise_sets')
      .delete()
      .eq('id', setId);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível deletar a série',
        variant: 'destructive',
      });
      return;
    }

    await loadSessionExercises(sessionId!);
    
    toast({
      title: 'Série removida',
      description: 'A série foi deletada com sucesso.',
    });
  };

  const endSession = () => {
    localStorage.removeItem('activeSession');
    toast({
      title: 'Treino finalizado!',
      description: 'Sessão encerrada com sucesso.',
    });
    onSessionEnd();
  };

  if (!sessionId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-primary" />
            Iniciar Nova Sessão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sessionName">Nome do Treino</Label>
            <Input
              id="sessionName"
              placeholder="Ex: Treino de Peito - 04/10/2025"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              maxLength={100}
            />
          </div>
          <Button onClick={startSession} className="w-full" size="lg">
            <Play className="h-5 w-5 mr-2" />
            Iniciar Sessão
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 border-primary">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-primary">Sessão Ativa</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{sessionName}</p>
              <p className="text-xs text-muted-foreground">{new Date(sessionDate).toLocaleDateString('pt-BR')}</p>
            </div>
            <Button onClick={() => setShowEndDialog(true)} variant="destructive" size="sm">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Finalizar
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar Série</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exerciseName">Exercício</Label>
            {exercises.length > 0 && (
              <select
                className="w-full h-11 px-3 rounded-md border border-input bg-background text-base"
                value={selectedExerciseId || ''}
                onChange={(e) => {
                  setSelectedExerciseId(e.target.value);
                  setCurrentExerciseName('');
                  setSuggestedWeight(null);
                }}
              >
                <option value="">Novo exercício...</option>
                {exercises.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.exercise_name}</option>
                ))}
              </select>
            )}
            {(!selectedExerciseId || exercises.length === 0) && (
              <Input
                id="exerciseName"
                placeholder="Nome do exercício"
                value={currentExerciseName}
                className="h-11 text-base"
                onChange={(e) => {
                  const name = e.target.value;
                  setCurrentExerciseName(name);
                  setSelectedExerciseId(null);
                  if (name.trim().length > 2) {
                    fetchLastWeightSuggestion(name.trim());
                  } else {
                    setSuggestedWeight(null);
                  }
                }}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="reps" className="text-sm">Repetições</Label>
              <Input
                id="reps"
                type="number"
                placeholder="0"
                value={currentReps}
                className="h-12 text-base"
                onChange={(e) => setCurrentReps(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-sm">
                Carga (kg)
                {suggestedWeight && (
                  <span className="ml-2 text-xs text-primary font-normal">
                    Sugestão: {suggestedWeight}kg
                  </span>
                )}
              </Label>
              <Input
                id="weight"
                type="number"
                step="0.5"
                placeholder={suggestedWeight ? String(suggestedWeight) : "0"}
                value={currentWeight}
                className="h-12 text-base"
                onChange={(e) => setCurrentWeight(e.target.value)}
              />
            </div>
          </div>

          <Button onClick={addSet} disabled={loading} className="w-full h-12 text-base" size="lg">
            <Plus className="h-5 w-5 mr-2" />
            {loading ? 'Salvando...' : 'Registrar Série'}
          </Button>
        </CardContent>
      </Card>

      {exercises.map(exercise => {
        const totalVolume = exercise.sets.reduce((sum, set) => 
          sum + (set.weight * set.reps), 0
        );
        const maxWeight = exercise.sets.length > 0 
          ? Math.max(...exercise.sets.map(s => s.weight))
          : 0;

        return (
          <Card key={exercise.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{exercise.exercise_name}</CardTitle>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="font-semibold text-primary">Vol: {totalVolume.toFixed(0)}kg</span>
                  {maxWeight > 0 && (
                    <>
                      <span>•</span>
                      <span>PR: {maxWeight}kg</span>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {exercise.sets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma série registrada ainda
                </p>
              ) : (
                exercise.sets.map(set => (
                  <div key={set.id} className="flex items-center justify-between bg-muted/30 rounded-lg p-3">
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-primary min-w-[60px]">Série {set.set_number}</span>
                      <span className="text-sm text-muted-foreground">{set.reps} reps</span>
                      <span className="font-bold">{set.weight} kg</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSet(exercise.id, set.id!)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        );
      })}

      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar Treino?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao finalizar, esta sessão será encerrada e salva no histórico. Você não poderá adicionar mais séries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={endSession}>Finalizar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ActiveSession;
