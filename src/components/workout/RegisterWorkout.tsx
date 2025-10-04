import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus } from 'lucide-react';

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

    const { error } = await supabase.from('workouts').insert({
      user_id: user.id,
      exercise,
      weight: parseFloat(weight),
      sets: parseInt(sets),
      reps: parseInt(reps),
      notes,
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
