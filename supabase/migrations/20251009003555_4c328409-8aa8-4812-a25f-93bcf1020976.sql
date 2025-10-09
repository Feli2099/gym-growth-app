-- Create function to update timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add muscle_group column to workout_sessions
ALTER TABLE workout_sessions ADD COLUMN muscle_group TEXT;

-- Create user profiles table
CREATE TABLE public.user_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT,
  age INTEGER,
  height NUMERIC,
  goal TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create body_weight_tracking table
CREATE TABLE public.body_weight_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  weight NUMERIC NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.body_weight_tracking ENABLE ROW LEVEL SECURITY;

-- Create policies for body_weight_tracking
CREATE POLICY "Users can view their own weight records" 
ON public.body_weight_tracking 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weight records" 
ON public.body_weight_tracking 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own weight records" 
ON public.body_weight_tracking 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weight records" 
ON public.body_weight_tracking 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at on user_profiles
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();