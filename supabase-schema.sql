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
alter publication supabase_realtime add table drivers;

alter table drivers enable row level security;

-- Leitura fica aberta: o bicitaxista precisa consultar pelo telefone pra
-- entrar, sem estar autenticado.
create policy "leitura publica"
on drivers for select
using (true);

-- Cadastrar, editar e remover só pra quem estiver autenticado (ou seja,
-- só você, logado como admin no Supabase Auth).
create policy "escrita so admin autenticado"
on drivers for insert
to authenticated
with check (true);

create policy "atualizacao so admin autenticado"
on drivers for update
to authenticated
using (true);

create policy "remocao so admin autenticado"
on drivers for delete
to authenticated
using (true);
