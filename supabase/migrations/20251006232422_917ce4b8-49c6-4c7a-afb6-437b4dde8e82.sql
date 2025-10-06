-- Create workout_sessions table
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for workout_sessions
CREATE POLICY "Users can view their own sessions" 
ON public.workout_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" 
ON public.workout_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON public.workout_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" 
ON public.workout_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create session_exercises table
CREATE TABLE public.session_exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;

-- Create policies for session_exercises
CREATE POLICY "Users can view exercises from their sessions" 
ON public.session_exercises 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.workout_sessions 
  WHERE workout_sessions.id = session_exercises.session_id 
  AND workout_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can insert exercises to their sessions" 
ON public.session_exercises 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.workout_sessions 
  WHERE workout_sessions.id = session_exercises.session_id 
  AND workout_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can update exercises from their sessions" 
ON public.session_exercises 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.workout_sessions 
  WHERE workout_sessions.id = session_exercises.session_id 
  AND workout_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can delete exercises from their sessions" 
ON public.session_exercises 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.workout_sessions 
  WHERE workout_sessions.id = session_exercises.session_id 
  AND workout_sessions.user_id = auth.uid()
));

-- Create exercise_sets table
CREATE TABLE public.exercise_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_id UUID NOT NULL REFERENCES public.session_exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;

-- Create policies for exercise_sets
CREATE POLICY "Users can view sets from their exercises" 
ON public.exercise_sets 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.session_exercises 
  JOIN public.workout_sessions ON workout_sessions.id = session_exercises.session_id
  WHERE session_exercises.id = exercise_sets.exercise_id 
  AND workout_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can insert sets to their exercises" 
ON public.exercise_sets 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.session_exercises 
  JOIN public.workout_sessions ON workout_sessions.id = session_exercises.session_id
  WHERE session_exercises.id = exercise_sets.exercise_id 
  AND workout_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can update sets from their exercises" 
ON public.exercise_sets 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.session_exercises 
  JOIN public.workout_sessions ON workout_sessions.id = session_exercises.session_id
  WHERE session_exercises.id = exercise_sets.exercise_id 
  AND workout_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can delete sets from their exercises" 
ON public.exercise_sets 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.session_exercises 
  JOIN public.workout_sessions ON workout_sessions.id = session_exercises.session_id
  WHERE session_exercises.id = exercise_sets.exercise_id 
  AND workout_sessions.user_id = auth.uid()
));