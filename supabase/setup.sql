-- Run this in the Supabase SQL Editor to create secure per-user attendance storage and avatar uploads.
create table if not exists public.attendance_records (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  work_date date not null,
  marks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, work_date),
  constraint attendance_marks_are_array check (jsonb_typeof(marks) = 'array' and jsonb_array_length(marks) <= 4)
);

alter table public.attendance_records enable row level security;
grant select, insert, update, delete on public.attendance_records to authenticated;

drop policy if exists "Users read their own attendance" on public.attendance_records;
create policy "Users read their own attendance"
on public.attendance_records for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users create their own attendance" on public.attendance_records;
create policy "Users create their own attendance"
on public.attendance_records for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users update their own attendance" on public.attendance_records;
create policy "Users update their own attendance"
on public.attendance_records for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users delete their own attendance" on public.attendance_records;
create policy "Users delete their own attendance"
on public.attendance_records for delete to authenticated
using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users manage their own avatar files" on storage.objects;
create policy "Users manage their own avatar files"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
