import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import RegisterWorkout from '@/components/workout/RegisterWorkout';
import WorkoutHistory from '@/components/workout/WorkoutHistory';
import WorkoutCalendar from '@/components/workout/WorkoutCalendar';
import WorkoutProgress from '@/components/workout/WorkoutProgress';
import { Dumbbell, LogOut, Plus, History, CalendarDays, TrendingUp } from 'lucide-react';

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('register');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Dumbbell className="h-12 w-12 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">FitProgress</h1>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 pb-20">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="register" className="mt-0">
            <RegisterWorkout />
          </TabsContent>
          <TabsContent value="history" className="mt-0">
            <WorkoutHistory />
          </TabsContent>
          <TabsContent value="calendar" className="mt-0">
            <WorkoutCalendar />
          </TabsContent>
          <TabsContent value="progress" className="mt-0">
            <WorkoutProgress />
          </TabsContent>
        </Tabs>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 border-t bg-card">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-4 gap-2 py-2">
            <button
              onClick={() => setActiveTab('register')}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${
                activeTab === 'register'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <Plus className="h-5 w-5" />
              <span className="text-xs font-medium">Registrar</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${
                activeTab === 'history'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <History className="h-5 w-5" />
              <span className="text-xs font-medium">Histórico</span>
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${
                activeTab === 'calendar'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <CalendarDays className="h-5 w-5" />
              <span className="text-xs font-medium">Calendário</span>
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors ${
                activeTab === 'progress'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              <TrendingUp className="h-5 w-5" />
              <span className="text-xs font-medium">Progressão</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Index;
