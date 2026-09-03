-- 1. Create the table (if it doesn't exist)
create table if not exists public.songs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  artist text not null,
  album text,
  cover_url text,
  audio_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.songs enable row level security;

-- 3. Drop existing policy if it exists (so we don't get an error running this twice)
drop policy if exists "Allow public all operations" on public.songs;

-- 4. Create Policy to allow anonymous users (like our website) to insert, update, read, and delete songs
create policy "Allow public all operations"
on public.songs
for all
to anon
using (true)
with check (true);
