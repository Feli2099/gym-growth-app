-- Add missing UPDATE policy for workout_checkins table
CREATE POLICY "Users can update their own checkins"
  ON public.workout_checkins
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);