-- Rode isto no SQL Editor do seu projeto Supabase (Supabase.com > seu projeto > SQL Editor > New query)

create table if not exists drivers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null unique,
  plate text,
  is_available boolean default true,
  created_at timestamptz default now()
);

-- Habilita realtime, pra lista do admin e o login atualizarem sozinhos
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'drivers') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE drivers;
  END IF;
END $$;

alter table drivers enable row level security;

drop policy if exists "leitura publica" on drivers;
create policy "leitura publica" on drivers for select using (true);

drop policy if exists "escrita so admin autenticado" on drivers;
create policy "escrita so admin autenticado" on drivers for insert to authenticated with check (true);

drop policy if exists "atualizacao so admin autenticado" on drivers;
create policy "atualizacao so admin autenticado" on drivers for update to authenticated using (true);

drop policy if exists "remocao so admin autenticado" on drivers;
create policy "remocao so admin autenticado" on drivers for delete to authenticated using (true);
