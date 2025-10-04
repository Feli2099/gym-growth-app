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
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold">Calendário</h2>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Marque os dias que treinou</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Calendar
            mode="multiple"
            selected={selectedDates}
            onDayClick={handleDateSelect}
            className="rounded-md border pointer-events-auto"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkoutCalendar;
