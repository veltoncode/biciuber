# BiciUber

App para chamar bicitáxi em Afuá, feito com React + Vite + Supabase. PWA instalável (sem loja de app).

## 1. Crie o projeto no Supabase

1. Acesse https://supabase.com, crie uma conta (dá pra usar login do GitHub) e clique em "New project"
2. Escolha um nome (ex: biciuber) e uma senha de banco (guarde ela)
3. Espere uns 2 minutos até o projeto ficar pronto

## 2. Rode o schema do banco

1. No painel do Supabase, vá em **SQL Editor** (menu lateral) > **New query**
2. Abra o arquivo `supabase-schema.sql` deste projeto, copie todo o conteúdo, cole no editor e clique em **Run**
3. Isso cria a tabela `drivers` (bicitaxistas) já com realtime habilitado

## 3. Crie seu usuário de administrador

1. No painel do Supabase, vá em **Authentication** > **Users** > **Add user** > **Create new user**
2. Preencha um e-mail e senha só seus (isso vai ser o login da aba Admin do app)
3. Marque a opção de já confirmar o e-mail automaticamente (senão ele fica pendente de confirmação)

## 4. Pegue as chaves do projeto

1. No painel do Supabase, vá em **Project Settings** > **API**
2. Copie a **Project URL** e a chave **anon public**

## 5. Configure o projeto local

1. Extraia este zip e abra a pasta no VS Code
2. Renomeie `.env.example` para `.env`
3. Cole a URL e a chave que você copiou:
   ```
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```

## 6. Rode o projeto

No terminal, dentro da pasta do projeto:
```
npm install
npm run dev
```
Abra o endereço que aparecer (algo como http://localhost:5173).

## Como testar se está tudo ligado

1. Vá na aba **Admin** e cadastre um bicitaxista (nome + telefone)
2. Vá na aba **Bicitaxista**, digite o mesmo telefone e clique em Entrar — se cair na tela de corridas, está funcionando
3. Abra o mesmo endereço em outro aparelho (ou outro navegador) — o bicitaxista cadastrado deve aparecer lá também, porque agora os dados vêm do Supabase, não do seu navegador

## Estrutura

- `src/App.jsx` — todas as telas (passageiro, login do bicitaxista, corridas, admin)
- `src/lib/supabaseClient.js` — conexão com o Supabase
- `supabase-schema.sql` — script pra criar as tabelas no seu projeto Supabase
- `public/manifest.json` / `public/sw.js` — configuração do PWA
- `public/icons/icon.svg` — ícone do app (converta para PNG antes de publicar)

## Publicar

Suba pro [Vercel](https://vercel.com), conecte o repositório do GitHub, e nas configurações do projeto no Vercel adicione as mesmas variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` em **Settings > Environment Variables**.

## Sobre segurança

Agora só quem estiver logado como admin (o usuário que você criou no passo 3) consegue cadastrar, editar ou remover bicitaxistas. A leitura da lista continua aberta, porque o bicitaxista precisa consultar pelo telefone pra entrar sem precisar de senha.
