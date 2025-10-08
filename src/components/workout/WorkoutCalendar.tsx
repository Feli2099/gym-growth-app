import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { supabase } from '@/integrations/supabase/client';
import { CalendarDays } from 'lucide-react';
import { format } from 'date-fns';

const WorkoutCalendar = () => {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCheckins();
  }, []);

  const fetchCheckins = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('workout_checkins')
      .select('date')
      .eq('user_id', user.id);

    if (data) {
      setSelectedDates(data.map((item) => new Date(item.date)));
    }
    setLoading(false);
  };

  const handleDateSelect = async (date: Date | undefined) => {
    if (!date) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const dateStr = format(date, 'yyyy-MM-dd');
    const isSelected = selectedDates.some(
      (d) => format(d, 'yyyy-MM-dd') === dateStr
    );

    if (isSelected) {
      await supabase
        .from('workout_checkins')
        .delete()
        .eq('user_id', user.id)
        .eq('date', dateStr);
      setSelectedDates(selectedDates.filter((d) => format(d, 'yyyy-MM-dd') !== dateStr));
    } else {
      await supabase
        .from('workout_checkins')
        .insert({ user_id: user.id, date: dateStr });
      setSelectedDates([...selectedDates, date]);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <CalendarDays className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold text-primary">Calendário</h2>
      </div>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-primary">Marque os dias que treinou</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-4">
          <Calendar
            mode="multiple"
            selected={selectedDates}
            onDayClick={handleDateSelect}
            className="rounded-md border-2 pointer-events-auto"
            modifiers={{
              workout: selectedDates,
            }}
            modifiersStyles={{
              workout: {
                backgroundColor: 'hsl(4 90% 58%)',
                color: 'white',
                borderRadius: '50%',
                fontWeight: 'bold',
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkoutCalendar;
