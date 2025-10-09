import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Save } from 'lucide-react';
import { format } from 'date-fns';

const MUSCLE_GROUPS = [
  'Peito',
  'Costas',
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Pernas',
  'Abdômen',
  'Glúteos',
  'Cardio',
];

interface ExerciseSet {
  setNumber: number;
  reps: number;
  weight: number;
}

interface Exercise {
  id: string;
  name: string;
  sets: ExerciseSet[];
}

const NewWorkoutSession = () => {
  const [sessionName, setSessionName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [sessionDate, setSessionDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addExercise = () => {
    const newExercise: Exercise = {
      id: crypto.randomUUID(),
      name: '',
      sets: [{ setNumber: 1, reps: 0, weight: 0 }]
    };
    setExercises([...exercises, newExercise]);
  };

  const removeExercise = (exerciseId: string) => {
    setExercises(exercises.filter(ex => ex.id !== exerciseId));
  };

  const updateExerciseName = (exerciseId: string, name: string) => {
    setExercises(exercises.map(ex => 
      ex.id === exerciseId ? { ...ex, name } : ex
    ));
  };

  const addSet = (exerciseId: string) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exerciseId) {
        const newSetNumber = ex.sets.length + 1;
        return {
          ...ex,
          sets: [...ex.sets, { setNumber: newSetNumber, reps: 0, weight: 0 }]
        };
      }
      return ex;
    }));
  };

  const removeSet = (exerciseId: string, setNumber: number) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets
            .filter(s => s.setNumber !== setNumber)
            .map((s, idx) => ({ ...s, setNumber: idx + 1 }))
        };
      }
      return ex;
    }));
  };

  const updateSet = (exerciseId: string, setNumber: number, field: 'reps' | 'weight', value: number) => {
    setExercises(exercises.map(ex => {
      if (ex.id === exerciseId) {
        return {
          ...ex,
          sets: ex.sets.map(s => 
            s.setNumber === setNumber ? { ...s, [field]: value } : s
          )
        };
      }
      return ex;
    }));
  };

  const handleSaveSession = async () => {
    if (!sessionName.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite um nome para a sessão',
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

    const invalidExercises = exercises.filter(ex => !ex.name.trim() || ex.sets.length === 0);
    if (invalidExercises.length > 0) {
      toast({
        title: 'Erro',
        description: 'Todos os exercícios devem ter nome e pelo menos uma série',
        variant: 'destructive',
      });
      return;
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
        name: sessionName,
        muscle_group: muscleGroup || null,
        date: sessionDate,
      })
      .select()
      .single();

    if (sessionError || !session) {
      toast({
        title: 'Erro ao criar sessão',
        description: sessionError?.message,
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
          title: 'Erro ao adicionar exercício',
          description: exerciseError?.message,
          variant: 'destructive',
        });
        continue;
      }

      // Create sets
      const setsData = exercise.sets.map(set => ({
        exercise_id: exerciseData.id,
        set_number: set.setNumber,
        reps: set.reps,
        weight: set.weight,
      }));

      const { error: setsError } = await supabase
        .from('exercise_sets')
        .insert(setsData);

      if (setsError) {
        toast({
          title: 'Erro ao adicionar séries',
          description: setsError?.message,
          variant: 'destructive',
        });
      }
    }

    setLoading(false);
    toast({
      title: 'Treino salvo!',
      description: 'Sua sessão foi registrada com sucesso.',
    });

    // Reset form
    setSessionName('');
    setMuscleGroup('');
    setSessionDate(format(new Date(), 'yyyy-MM-dd'));
    setExercises([]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Plus className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-primary">Registrar Treino</h2>
      </div>

      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-primary">Nova Sessão de Treino</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="sessionName" className="text-sm font-semibold">
              Nome da Sessão
            </Label>
            <Input
              id="sessionName"
              placeholder="Ex: Treino de Peito"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="muscleGroup" className="text-sm font-semibold">
              Grupo Muscular
            </Label>
            <Select value={muscleGroup} onValueChange={setMuscleGroup}>
              <SelectTrigger id="muscleGroup" className="h-11">
                <SelectValue placeholder="Selecione o grupo muscular" />
              </SelectTrigger>
              <SelectContent>
                {MUSCLE_GROUPS.map((group) => (
                  <SelectItem key={group} value={group}>
                    {group}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sessionDate" className="text-sm font-semibold">
              Data
            </Label>
            <Input
              id="sessionDate"
              type="date"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
              className="h-11"
            />
          </div>
        </CardContent>
      </Card>

      {exercises.map((exercise) => (
        <Card key={exercise.id} className="shadow-md border-2">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-3">
              <Input
                placeholder="Nome do exercício (ex: Supino Reto)"
                value={exercise.name}
                onChange={(e) => updateExerciseName(exercise.id, e.target.value)}
                className="h-11 font-medium"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeExercise(exercise.id)}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {exercise.sets.map((set) => (
              <div key={set.setNumber} className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
                <span className="text-sm font-semibold text-primary min-w-[70px]">
                  Série {set.setNumber}
                </span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder="Reps"
                    value={set.reps || ''}
                    onChange={(e) => updateSet(exercise.id, set.setNumber, 'reps', parseInt(e.target.value) || 0)}
                    className="w-20 h-10"
                    min="0"
                  />
                  <span className="text-xs text-muted-foreground">reps</span>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="0.5"
                    placeholder="Kg"
                    value={set.weight || ''}
                    onChange={(e) => updateSet(exercise.id, set.setNumber, 'weight', parseFloat(e.target.value) || 0)}
                    className="w-24 h-10"
                    min="0"
                  />
                  <span className="text-xs text-muted-foreground">kg</span>
                </div>
                {exercise.sets.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSet(exercise.id, set.setNumber)}
                    className="ml-auto hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => addSet(exercise.id)}
              className="w-full mt-2 h-10 border-dashed border-2 hover:border-primary hover:text-primary"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Série
            </Button>
          </CardContent>
        </Card>
      ))}

      <Button
        variant="outline"
        onClick={addExercise}
        className="w-full h-12 text-base border-dashed border-2 hover:border-primary hover:text-primary hover:bg-primary/5"
      >
        <Plus className="h-5 w-5 mr-2" />
        Adicionar Exercício
      </Button>

      <Button
        onClick={handleSaveSession}
        disabled={loading}
        className="w-full h-14 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow"
      >
        <Save className="h-5 w-5 mr-2" />
        {loading ? 'Salvando...' : 'Salvar Treino'}
      </Button>
    </div>
  );
};

export default NewWorkoutSession;