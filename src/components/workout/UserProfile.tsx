import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { User, Scale, TrendingUp, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface UserProfileData {
  full_name: string;
  age: string;
  height: string;
  goal: string;
}

interface WeightData {
  date: string;
  weight: number;
  displayDate: string;
}

const UserProfile = () => {
  const [profile, setProfile] = useState<UserProfileData>({
    full_name: '',
    age: '',
    height: '',
    goal: '',
  });
  const [currentWeight, setCurrentWeight] = useState('');
  const [weightHistory, setWeightHistory] = useState<WeightData[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProfile();
    fetchWeightHistory();
  }, []);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      toast({
        title: 'Erro ao carregar perfil',
        description: error.message,
        variant: 'destructive',
      });
    }

    if (data) {
      setProfile({
        full_name: data.full_name || '',
        age: data.age?.toString() || '',
        height: data.height?.toString() || '',
        goal: data.goal || '',
      });
    }

    setLoading(false);
  };

  const fetchWeightHistory = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('body_weight_tracking')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true });

    if (error) {
      toast({
        title: 'Erro ao carregar histórico de peso',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    const processedData = data?.map(item => ({
      date: item.date,
      weight: Number(item.weight),
      displayDate: format(new Date(item.date), 'dd/MM', { locale: ptBR })
    })) || [];

    setWeightHistory(processedData);
  };

  const saveProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: user.id,
        full_name: profile.full_name || null,
        age: profile.age ? parseInt(profile.age) : null,
        height: profile.height ? parseFloat(profile.height) : null,
        goal: profile.goal || null,
      });

    if (error) {
      toast({
        title: 'Erro ao salvar perfil',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Perfil atualizado!',
      description: 'Suas informações foram salvas com sucesso.',
    });
  };

  const addWeightEntry = async () => {
    if (!currentWeight) {
      toast({
        title: 'Peso não informado',
        description: 'Digite seu peso atual.',
        variant: 'destructive',
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('body_weight_tracking')
      .insert({
        user_id: user.id,
        weight: parseFloat(currentWeight),
        date: format(new Date(), 'yyyy-MM-dd'),
      });

    if (error) {
      toast({
        title: 'Erro ao registrar peso',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Peso registrado!',
      description: 'Seu peso foi adicionado ao histórico.',
    });

    setCurrentWeight('');
    fetchWeightHistory();
  };

  const resetAllStatistics = async () => {
    setResetting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setResetting(false);
      return;
    }

    try {
      // Get all workout sessions for this user
      const { data: sessions } = await supabase
        .from('workout_sessions')
        .select('id')
        .eq('user_id', user.id);

      if (sessions && sessions.length > 0) {
        const sessionIds = sessions.map(s => s.id);
        
        // Get all session exercises
        const { data: exercises } = await supabase
          .from('session_exercises')
          .select('id')
          .in('session_id', sessionIds);

        if (exercises && exercises.length > 0) {
          const exerciseIds = exercises.map(e => e.id);
          
          // Delete exercise sets
          await supabase
            .from('exercise_sets')
            .delete()
            .in('exercise_id', exerciseIds);
        }

        // Delete session exercises
        await supabase
          .from('session_exercises')
          .delete()
          .in('session_id', sessionIds);
      }

      // Delete all user data
      await supabase.from('workout_sessions').delete().eq('user_id', user.id);
      await supabase.from('workouts').delete().eq('user_id', user.id);
      await supabase.from('workout_checkins').delete().eq('user_id', user.id);
      await supabase.from('body_weight_tracking').delete().eq('user_id', user.id);
      await supabase.from('user_profiles').delete().eq('user_id', user.id);

      toast({
        title: 'Todos os dados foram apagados com sucesso.',
        description: 'Seu aplicativo foi resetado ao estado inicial.',
      });

      // Reset local state
      setProfile({
        full_name: '',
        age: '',
        height: '',
        goal: '',
      });
      setCurrentWeight('');
      setWeightHistory([]);
    } catch (error: any) {
      toast({
        title: 'Erro ao resetar estatísticas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <User className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-primary">Perfil</h2>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Seu nome"
              />
            </div>
            <div>
              <Label htmlFor="age">Idade</Label>
              <Input
                id="age"
                type="number"
                value={profile.age}
                onChange={(e) => setProfile({ ...profile, age: e.target.value })}
                placeholder="Sua idade"
              />
            </div>
            <div>
              <Label htmlFor="height">Altura (cm)</Label>
              <Input
                id="height"
                type="number"
                value={profile.height}
                onChange={(e) => setProfile({ ...profile, height: e.target.value })}
                placeholder="Sua altura"
              />
            </div>
            <div>
              <Label htmlFor="goal">Objetivo</Label>
              <Input
                id="goal"
                value={profile.goal}
                onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
                placeholder="Ex: Ganhar massa muscular"
              />
            </div>
          </div>
          <Button onClick={saveProfile} className="w-full">
            Salvar Perfil
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Evolução do Peso Corporal
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              type="number"
              step="0.1"
              value={currentWeight}
              onChange={(e) => setCurrentWeight(e.target.value)}
              placeholder="Peso atual (kg)"
            />
            <Button onClick={addWeightEntry}>
              Adicionar
            </Button>
          </div>

          {weightHistory.length >= 2 ? (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis 
                    dataKey="displayDate" 
                    stroke="hsl(var(--muted-foreground))"
                    style={{ fontSize: '13px', fontWeight: '500' }}
                  />
                  <YAxis 
                    stroke="hsl(var(--primary))"
                    style={{ fontSize: '13px', fontWeight: '500' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '2px solid hsl(var(--primary))',
                      borderRadius: '12px',
                      padding: '12px',
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', r: 5 }}
                    name="Peso (kg)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12 bg-muted/20 rounded-lg">
              <Scale className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">Registre pelo menos 2 medições de peso para ver o gráfico de evolução.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-lg border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Zona de Perigo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Resetar todas as estatísticas irá apagar permanentemente todo o histórico de treinos, 
            séries registradas, pesos, médias e informações do perfil. Esta ação não pode ser desfeita.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                className="w-full"
                disabled={resetting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Resetar Estatísticas
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza de que deseja apagar todos os dados?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Todos os seus treinos, séries, 
                  pesos registrados e informações pessoais serão permanentemente excluídos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction 
                  onClick={resetAllStatistics}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Sim, apagar tudo
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;
