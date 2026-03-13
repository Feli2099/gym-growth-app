import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Dumbbell } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Ombro', 'Bíceps', 'Tríceps',
  'Perna', 'Glúteo', 'Abdômen', 'Antebraço', 'Outros',
];

interface ExerciseSuggestionsProps {
  sessionId: string;
  onExerciseSelected: (exerciseId: string, exerciseName: string) => void;
  existingExerciseNames: string[];
}

interface UserExercise {
  id: string;
  exercise_name: string;
  muscle_group: string;
}

const ExerciseSuggestions = ({
  sessionId,
  onExerciseSelected,
  existingExerciseNames,
}: ExerciseSuggestionsProps) => {
  const [exercises, setExercises] = useState<UserExercise[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [newMuscleGroup, setNewMuscleGroup] = useState('Outros');
  const [showNewForm, setShowNewForm] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_exercises')
      .select('*')
      .eq('user_id', user.id)
      .order('muscle_group')
      .order('exercise_name');

    if (data) setExercises(data as UserExercise[]);
  };

  const addExerciseToSession = async (exerciseName: string) => {
    if (existingExerciseNames.includes(exerciseName)) return;

    const { data: newExercise, error } = await supabase
      .from('session_exercises')
      .insert({ session_id: sessionId, exercise_name: exerciseName })
      .select()
      .single();

    if (!error && newExercise) {
      onExerciseSelected(newExercise.id, newExercise.exercise_name);
    }
  };

  const createNewExercise = async () => {
    if (!newExerciseName.trim()) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Save to catalog
    await supabase
      .from('user_exercises')
      .upsert(
        { user_id: user.id, exercise_name: newExerciseName.trim(), muscle_group: newMuscleGroup },
        { onConflict: 'user_id,exercise_name' }
      );

    // Add to session
    await addExerciseToSession(newExerciseName.trim());

    setNewExerciseName('');
    setShowNewForm(false);
    setLoading(false);
    await loadExercises();
  };

  const filtered = exercises.filter(e =>
    e.exercise_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grouped = filtered.reduce<Record<string, UserExercise[]>>((acc, ex) => {
    const group = ex.muscle_group || 'Outros';
    if (!acc[group]) acc[group] = [];
    acc[group].push(ex);
    return acc;
  }, {});

  // Sort groups by MUSCLE_GROUPS order
  const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
    const ia = MUSCLE_GROUPS.indexOf(a);
    const ib = MUSCLE_GROUPS.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Dumbbell className="h-4 w-4 text-primary" />
          Sugestões de Exercícios
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar exercício..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* Grouped exercises */}
        {sortedGroups.length > 0 ? (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {sortedGroups.map(([group, exs]) => (
              <div key={group}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  {group}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {exs.map((ex) => {
                    const alreadyAdded = existingExerciseNames.includes(ex.exercise_name);
                    return (
                      <Badge
                        key={ex.id}
                        variant={alreadyAdded ? 'secondary' : 'outline'}
                        className={`cursor-pointer text-xs py-1.5 px-3 transition-colors ${
                          alreadyAdded
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-primary hover:text-primary-foreground'
                        }`}
                        onClick={() => !alreadyAdded && addExerciseToSession(ex.exercise_name)}
                      >
                        {ex.exercise_name}
                        {alreadyAdded && ' ✓'}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-2">
            {searchTerm ? 'Nenhum exercício encontrado' : 'Nenhum exercício no histórico ainda'}
          </p>
        )}

        {/* New exercise form */}
        {showNewForm ? (
          <div className="space-y-2 border-t pt-3">
            <Input
              placeholder="Nome do novo exercício"
              value={newExerciseName}
              onChange={(e) => setNewExerciseName(e.target.value)}
              className="h-10"
            />
            <Select value={newMuscleGroup} onValueChange={setNewMuscleGroup}>
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MUSCLE_GROUPS.map((g) => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={createNewExercise} disabled={loading || !newExerciseName.trim()} size="sm" className="flex-1">
                <Plus className="h-4 w-4 mr-1" />
                {loading ? 'Salvando...' : 'Adicionar'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowNewForm(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowNewForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Novo exercício
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ExerciseSuggestions;
