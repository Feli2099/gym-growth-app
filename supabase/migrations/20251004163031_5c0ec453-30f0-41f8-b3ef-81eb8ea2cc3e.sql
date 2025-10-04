-- Create workouts table
create table public.workouts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  exercise text not null,
  weight decimal(6,2) not null,
  sets integer not null,
  reps integer not null,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.workouts enable row level security;

-- Create policies
create policy "Users can view their own workouts"
  on public.workouts for select
  using (auth.uid() = user_id);

create policy "Users can insert their own workouts"
  on public.workouts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own workouts"
  on public.workouts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own workouts"
  on public.workouts for delete
  using (auth.uid() = user_id);

-- Create index for better query performance
create index workouts_user_id_idx on public.workouts(user_id);
create index workouts_created_at_idx on public.workouts(created_at desc);

-- Create workout_checkins table
create table public.workout_checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, date)
);

-- Enable Row Level Security
alter table public.workout_checkins enable row level security;

-- Create policies
create policy "Users can view their own checkins"
  on public.workout_checkins for select
  using (auth.uid() = user_id);

create policy "Users can insert their own checkins"
  on public.workout_checkins for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own checkins"
  on public.workout_checkins for delete
  using (auth.uid() = user_id);

-- Create index for better query performance
create index workout_checkins_user_id_idx on public.workout_checkins(user_id);
create index workout_checkins_date_idx on public.workout_checkins(date);