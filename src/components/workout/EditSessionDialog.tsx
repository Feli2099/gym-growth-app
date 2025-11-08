import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2 } from 'lucide-react';

interface ExerciseSet {
  id?: string;
  set_number: number;
  reps: number;
  weight: number;
}

interface SessionExercise {
  id: string;
  exercise_name: string;
  sets: ExerciseSet[];
}

interface EditSessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  sessionName: string;
  sessionDate: string;
  exercises: SessionExercise[];
  onSave: () => void;
}

const EditSessionDialog = ({
  open,
  onOpenChange,
  sessionId,
  sessionName,
  sessionDate,
  exercises,
  onSave,
}: EditSessionDialogProps) => {
  const [name, setName] = useState(sessionName);
  const [date, setDate] = useState(sessionDate);
  const [editedExercises, setEditedExercises] = useState<SessionExercise[]>(exercises);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    setName(sessionName);
    setDate(sessionDate);
    setEditedExercises(exercises);
  }, [sessionName, sessionDate, exercises]);

  const handleSave = async () => {
    setSaving(true);

    // Update session
    const { error: sessionError } = await supabase
      .from('workout_sessions')
      .update({ name, date })
      .eq('id', sessionId);

    if (sessionError) {
      toast({
        title: 'Erro ao atualizar sessão',
        description: sessionError.message,
        variant: 'destructive',
      });
      setSaving(false);
      return;
    }

    // Update exercises and sets
    for (const exercise of editedExercises) {
      const { error: exerciseError } = await supabase
        .from('session_exercises')
        .update({ exercise_name: exercise.exercise_name })
        .eq('id', exercise.id);

      if (exerciseError) {
        console.error('Error updating exercise:', exerciseError);
        continue;
      }

      // Update sets
      for (const set of exercise.sets) {
        if (set.id) {
          const { error: setError } = await supabase
            .from('exercise_sets')
            .update({
              reps: set.reps,
              weight: set.weight,
            })
            .eq('id', set.id);

          if (setError) {
            console.error('Error updating set:', setError);
          }
        }
      }
    }

    setSaving(false);
    toast({
      title: 'Treino atualizado!',
      description: 'As alterações foram salvas com sucesso.',
    });
    onSave();
    onOpenChange(false);
  };

  const handleSetChange = (exerciseId: string, setNumber: number, field: 'reps' | 'weight', value: string) => {
    setEditedExercises(prev =>
      prev.map(ex =>
        ex.id === exerciseId
          ? {
              ...ex,
              sets: ex.sets.map(set =>
                set.set_number === setNumber
                  ? { ...set, [field]: parseFloat(value) || 0 }
                  : set
              ),
            }
          : ex
      )
    );
  };

  const handleDeleteSet = async (exerciseId: string, setId: string) => {
    const { error } = await supabase
      .from('exercise_sets')
      .delete()
      .eq('id', setId);

    if (error) {
      toast({
        title: 'Erro ao deletar série',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    setEditedExercises(prev =>
      prev.map(ex =>
        ex.id === exerciseId
          ? { ...ex, sets: ex.sets.filter(s => s.id !== setId) }
          : ex
      )
    );

    toast({
      title: 'Série removida',
      description: 'A série foi deletada com sucesso.',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Treino</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome do Treino</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-date">Data</Label>
            <Input
              id="edit-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <Label>Exercícios</Label>
            {editedExercises.map((exercise) => (
              <div key={exercise.id} className="border rounded-lg p-4 space-y-3">
                <Input
                  value={exercise.exercise_name}
                  onChange={(e) =>
                    setEditedExercises(prev =>
                      prev.map(ex =>
                        ex.id === exercise.id
                          ? { ...ex, exercise_name: e.target.value }
                          : ex
                      )
                    )
                  }
                  className="font-semibold"
                />

                <div className="space-y-2">
                  {exercise.sets.map((set) => (
                    <div key={set.id} className="flex items-center gap-2">
                      <span className="text-sm font-medium min-w-[60px]">
                        Série {set.set_number}
                      </span>
                      <Input
                        type="number"
                        value={set.reps}
                        onChange={(e) =>
                          handleSetChange(exercise.id, set.set_number, 'reps', e.target.value)
                        }
                        className="w-20"
                        placeholder="Reps"
                      />
                      <Input
                        type="number"
                        step="0.5"
                        value={set.weight}
                        onChange={(e) =>
                          handleSetChange(exercise.id, set.set_number, 'weight', e.target.value)
                        }
                        className="w-24"
                        placeholder="Kg"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteSet(exercise.id, set.id!)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditSessionDialog;
