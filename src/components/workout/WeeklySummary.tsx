import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Dumbbell, TrendingUp, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface WeeklySummaryStats {
  totalWorkouts: number;
  daysWithWorkouts: number;
  maxWeight: number;
  mostFrequentMuscleGroup: string;
  totalSets: number;
}

const WeeklySummary = () => {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const [stats, setStats] = useState<WeeklySummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, [period]);

  const fetchStats = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setLoading(false);
      return;
    }

    const now = new Date();
    let startDate, endDate;

    if (period === 'week') {
      startDate = format(startOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
      endDate = format(endOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd');
    } else {
      startDate = format(startOfMonth(now), 'yyyy-MM-dd');
      endDate = format(endOfMonth(now), 'yyyy-MM-dd');
    }

    const { data: sessions, error: sessionsError } = await supabase
      .from('workout_sessions')
      .select('id, date, muscle_group')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (sessionsError) {
      toast({
        title: 'Erro ao carregar estatísticas',
        description: sessionsError.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    if (!sessions || sessions.length === 0) {
      setStats({
        totalWorkouts: 0,
        daysWithWorkouts: 0,
        maxWeight: 0,
        mostFrequentMuscleGroup: '-',
        totalSets: 0,
      });
      setLoading(false);
      return;
    }

    const sessionIds = sessions.map(s => s.id);
    const uniqueDates = new Set(sessions.map(s => s.date)).size;

    // Get all exercises for these sessions
    const { data: exercises } = await supabase
      .from('session_exercises')
      .select('id')
      .in('session_id', sessionIds);

    const exerciseIds = exercises?.map(e => e.id) || [];

    // Get all sets
    const { data: sets } = await supabase
      .from('exercise_sets')
      .select('weight')
      .in('exercise_id', exerciseIds);

    const weights = sets?.map(s => Number(s.weight)) || [];
    const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;

    // Calculate most frequent muscle group
    const muscleGroups = sessions
      .filter(s => s.muscle_group)
      .map(s => s.muscle_group);
    
    const muscleGroupCount: Record<string, number> = {};
    muscleGroups.forEach(mg => {
      if (mg) muscleGroupCount[mg] = (muscleGroupCount[mg] || 0) + 1;
    });

    const mostFrequentMuscleGroup = Object.keys(muscleGroupCount).length > 0
      ? Object.entries(muscleGroupCount).sort((a, b) => b[1] - a[1])[0][0]
      : '-';

    setStats({
      totalWorkouts: sessions.length,
      daysWithWorkouts: uniqueDates,
      maxWeight,
      mostFrequentMuscleGroup,
      totalSets: sets?.length || 0,
    });

    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-primary">Resumo</h2>
        </div>
        <Select value={period} onValueChange={(value: 'week' | 'month') => setPeriod(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Semanal</SelectItem>
            <SelectItem value="month">Mensal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              Carregando estatísticas...
            </div>
          </CardContent>
        </Card>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="shadow-lg border-2 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dias treinados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.daysWithWorkouts}</div>
              <div className="text-xs text-muted-foreground mt-1">dias</div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Dumbbell className="h-4 w-4" />
                Total treinos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.totalWorkouts}</div>
              <div className="text-xs text-muted-foreground mt-1">sessões</div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Award className="h-4 w-4" />
                Peso máximo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{stats.maxWeight}</div>
              <div className="text-xs text-muted-foreground mt-1">kg</div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Grupo muscular
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-primary truncate">{stats.mostFrequentMuscleGroup}</div>
              <div className="text-xs text-muted-foreground mt-1">mais frequente</div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
};

export default WeeklySummary;
