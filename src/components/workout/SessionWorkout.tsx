import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Save } from 'lucide-react';

interface ExerciseSet {
  setNumber: number;
  reps: string;
  weight: string;
}

interface Exercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
}

const SessionWorkout = () => {
  const [sessionName, setSessionName] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addExercise = () => {
    if (!newExerciseName.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite o nome do exercício',
        variant: 'destructive',
      });
      return;
    }

    const newExercise: Exercise = {
      id: crypto.randomUUID(),
      name: newExerciseName.trim(),
      sets: [{ setNumber: 1, reps: '', weight: '' }],
    };

    setExercises([...exercises, newExercise]);
    setNewExerciseName('');
  };

  const removeExercise = (exerciseId: string) => {
    setExercises(exercises.filter((ex) => ex.id !== exerciseId));
  };

  const addSet = (exerciseId: string) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id === exerciseId) {
          const newSetNumber = ex.sets.length + 1;
          return {
            ...ex,
            sets: [...ex.sets, { setNumber: newSetNumber, reps: '', weight: '' }],
          };
        }
        return ex;
      })
    );
  };

  const removeSet = (exerciseId: string, setNumber: number) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id === exerciseId) {
          const newSets = ex.sets
            .filter((s) => s.setNumber !== setNumber)
            .map((s, idx) => ({ ...s, setNumber: idx + 1 }));
          return { ...ex, sets: newSets };
        }
        return ex;
      })
    );
  };

  const updateSet = (exerciseId: string, setNumber: number, field: 'reps' | 'weight', value: string) => {
    setExercises(
      exercises.map((ex) => {
        if (ex.id === exerciseId) {
          return {
            ...ex,
            sets: ex.sets.map((s) => (s.setNumber === setNumber ? { ...s, [field]: value } : s)),
          };
        }
        return ex;
      })
    );
  };

  const saveSession = async () => {
    if (!sessionName.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite o nome da sessão',
        variant: 'destructive',
      });
      return;
    }

    if (exercises.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos um exercício',
        variant: 'destructive',
      });
      return;
    }

    // Validate all sets
    for (const exercise of exercises) {
      if (exercise.sets.length === 0) {
        toast({
          title: 'Erro',
          description: `O exercício "${exercise.name}" precisa de pelo menos uma série`,
          variant: 'destructive',
        });
        return;
      }

      for (const set of exercise.sets) {
        if (!set.reps || !set.weight) {
          toast({
            title: 'Erro',
            description: `Complete todas as séries do exercício "${exercise.name}"`,
            variant: 'destructive',
          });
          return;
        }
      }
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: user.id,
        name: sessionName.trim(),
        date: sessionDate,
      })
      .select()
      .single();

    if (sessionError || !session) {
      toast({
        title: 'Erro ao salvar',
        description: sessionError?.message || 'Erro ao criar sessão',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    // Create exercises and sets
    for (const exercise of exercises) {
      const { data: exerciseData, error: exerciseError } = await supabase
        .from('session_exercises')
        .insert({
          session_id: session.id,
          exercise_name: exercise.name,
        })
        .select()
        .single();

      if (exerciseError || !exerciseData) {
        toast({
          title: 'Erro ao salvar',
          description: `Erro ao salvar exercício "${exercise.name}"`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Create sets
      const setsToInsert = exercise.sets.map((set) => ({
        exercise_id: exerciseData.id,
        set_number: set.setNumber,
        reps: parseInt(set.reps),
        weight: parseFloat(set.weight),
      }));

      const { error: setsError } = await supabase.from('exercise_sets').insert(setsToInsert);

      if (setsError) {
        toast({
          title: 'Erro ao salvar',
          description: `Erro ao salvar séries do exercício "${exercise.name}"`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    toast({
      title: 'Treino salvo!',
      description: 'Sua sessão foi salva com sucesso.',
    });

    // Reset form
    setSessionName('');
    setSessionDate(new Date().toISOString().split('T')[0]);
    setExercises([]);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nova Sessão de Treino
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sessionName">Nome da Sessão</Label>
              <Input
                id="sessionName"
                placeholder="Ex: Treino de Peito"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sessionDate">Data</Label>
              <Input
                id="sessionDate"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="newExercise">Adicionar Exercício</Label>
            <div className="flex gap-2">
              <Input
                id="newExercise"
                placeholder="Nome do exercício"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addExercise()}
              />
              <Button onClick={addExercise} type="button">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {exercises.map((exercise) => (
        <Card key={exercise.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{exercise.name}</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => removeExercise(exercise.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {exercise.sets.map((set) => (
              <div key={set.setNumber} className="flex items-center gap-2">
                <span className="text-sm font-medium w-16">Série {set.setNumber}</span>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`reps-${exercise.id}-${set.setNumber}`} className="text-xs">
                      Reps
                    </Label>
                    <Input
                      id={`reps-${exercise.id}-${set.setNumber}`}
                      type="number"
                      placeholder="0"
                      value={set.reps}
                      onChange={(e) => updateSet(exercise.id, set.setNumber, 'reps', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`weight-${exercise.id}-${set.setNumber}`} className="text-xs">
                      Carga (kg)
                    </Label>
                    <Input
                      id={`weight-${exercise.id}-${set.setNumber}`}
                      type="number"
                      step="0.5"
                      placeholder="0"
                      value={set.weight}
                      onChange={(e) => updateSet(exercise.id, set.setNumber, 'weight', e.target.value)}
                    />
                  </div>
                </div>
                {exercise.sets.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSet(exercise.id, set.setNumber)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => addSet(exercise.id)} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Série
            </Button>
          </CardContent>
        </Card>
      ))}

      {exercises.length > 0 && (
        <Button onClick={saveSession} disabled={loading} className="w-full" size="lg">
          <Save className="h-5 w-5 mr-2" />
          {loading ? 'Salvando...' : 'Salvar Treino'}
        </Button>
      )}
    </div>
  );
};

export default SessionWorkout;
