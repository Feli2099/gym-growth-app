import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';
import { z } from 'zod';

const workoutSchema = z.object({
  exercise: z.string().trim().min(1, { message: 'Exercise name is required' }).max(200, { message: 'Exercise name must be less than 200 characters' }),
  weight: z.number().positive({ message: 'Weight must be a positive number' }).max(1000, { message: 'Weight seems unrealistic (max 1000kg)' }),
  sets: z.number().int().positive({ message: 'Sets must be a positive number' }).max(100, { message: 'Too many sets (max 100)' }),
  reps: z.number().int().positive({ message: 'Reps must be a positive number' }).max(1000, { message: 'Too many reps (max 1000)' }),
  notes: z.string().max(1000, { message: 'Notes must be less than 1000 characters' }).optional()
});

const RegisterWorkout = () => {
  const [exercise, setExercise] = useState('');
  const [weight, setWeight] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    // Validate input data
    const validationResult = workoutSchema.safeParse({
      exercise: exercise.trim(),
      weight: parseFloat(weight),
      sets: parseInt(sets),
      reps: parseInt(reps),
      notes: notes.trim() || undefined
    });

    if (!validationResult.success) {
      const firstError = validationResult.error.errors[0];
      toast({
        title: 'Erro de validação',
        description: firstError.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('workouts').insert({
      user_id: user.id,
      exercise: validationResult.data.exercise,
      weight: validationResult.data.weight,
      sets: validationResult.data.sets,
      reps: validationResult.data.reps,
      notes: validationResult.data.notes || null,
    });

    setLoading(false);

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Treino registrado!',
        description: 'Seu treino foi salvo com sucesso.',
      });
      setExercise('');
      setWeight('');
      setSets('');
      setReps('');
      setNotes('');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Registrar Treino
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exercise">Exercício</Label>
            <Input
              id="exercise"
              placeholder="Ex: Supino reto"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              maxLength={200}
              required
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Carga (kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.5"
                placeholder="0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sets">Séries</Label>
              <Input
                id="sets"
                type="number"
                placeholder="0"
                value={sets}
                onChange={(e) => setSets(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reps">Reps</Label>
              <Input
                id="reps"
                type="number"
                placeholder="0"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Anotações sobre o treino..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Treino'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default RegisterWorkout;
