-- SQL to set up the 'songs' table
create table public.songs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  artist text not null,
  album text,
  cover_url text,
  audio_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Note: Ensure Row Level Security (RLS) is either disabled for this simple project, 
-- or set up appropriate policies so anonymous users can read/insert/update/delete.
-- For a quick beginner setup without auth:
alter table public.songs disable row level security;
