
-- Table to store user's exercise catalog with muscle groups
CREATE TABLE public.user_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exercise_name text NOT NULL,
  muscle_group text NOT NULL DEFAULT 'Outros',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_name)
);

ALTER TABLE public.user_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own exercises" ON public.user_exercises FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own exercises" ON public.user_exercises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exercises" ON public.user_exercises FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own exercises" ON public.user_exercises FOR DELETE USING (auth.uid() = user_id);

-- Backfill from existing session_exercises history
INSERT INTO public.user_exercises (user_id, exercise_name, muscle_group)
SELECT DISTINCT ws.user_id, se.exercise_name, 'Outros'
FROM session_exercises se
JOIN workout_sessions ws ON ws.id = se.session_id
ON CONFLICT (user_id, exercise_name) DO NOTHING;
