-- Adicionar campos para controle de tempo de descanso nas séries
ALTER TABLE exercise_sets 
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN rest_time INTEGER DEFAULT 60;

COMMENT ON COLUMN exercise_sets.completed_at IS 'Timestamp when the set was completed';
COMMENT ON COLUMN exercise_sets.rest_time IS 'Rest time in seconds after this set';