import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { History } from 'lucide-react';

interface LastPerformanceProps {
  exerciseName: string;
  currentSessionId: string;
}

interface LastSetData {
  weight: number;
  reps: number;
}

const LastPerformance = ({ exerciseName, currentSessionId }: LastPerformanceProps) => {
  const [lastSet, setLastSet] = useState<LastSetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetchLastPerformance();
  }, [exerciseName]);

  const fetchLastPerformance = async () => {
    setLoading(true);
    setNotFound(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    // Find previous sessions (excluding current) that have this exercise
    const { data: sessions } = await supabase
      .from('workout_sessions')
      .select('id')
      .eq('user_id', user.id)
      .neq('id', currentSessionId)
      .order('date', { ascending: false })
      .limit(10);

    if (!sessions || sessions.length === 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // Find the exercise in those sessions
    const { data: exercises } = await supabase
      .from('session_exercises')
      .select('id, session_id')
      .eq('exercise_name', exerciseName)
      .in('session_id', sessions.map(s => s.id))
      .limit(1);

    if (!exercises || exercises.length === 0) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // Get the last set from that exercise
    const { data: sets } = await supabase
      .from('exercise_sets')
      .select('weight, reps')
      .eq('exercise_id', exercises[0].id)
      .order('set_number', { ascending: false })
      .limit(1);

    if (sets && sets.length > 0) {
      setLastSet({ weight: Number(sets[0].weight), reps: sets[0].reps });
    } else {
      setNotFound(true);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1 py-1">
        <History className="h-3 w-3 animate-pulse" />
        <span>Buscando histórico...</span>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground px-1 py-1">
        <History className="h-3 w-3" />
        <span>Nenhum histórico encontrado para este exercício.</span>
      </div>
    );
  }

  if (!lastSet) return null;

  return (
    <div className="flex items-center gap-1.5 text-xs bg-primary/10 text-primary rounded-md px-2 py-1.5 mt-1">
      <History className="h-3 w-3 flex-shrink-0" />
      <span>
        Última série registrada: <strong>{lastSet.weight} kg</strong> × <strong>{lastSet.reps} reps</strong>
      </span>
    </div>
  );
};

export default LastPerformance;
