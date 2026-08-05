# Configuração do Web Push no BiciTaxi

Esta etapa adicionou notificações push completas usando o sistema nativo da Web (Push API) e Supabase Edge Functions, dispensando Firebase/OneSignal.

## Passo 1: Gerar as Chaves VAPID

O Web Push precisa de um par de chaves VAPID (Voluntary Application Server Identification) para criptografar o payload da notificação.
Você pode gerar chaves executando este comando temporário no seu terminal (requer NodeJS):
```bash
npx web-push generate-vapid-keys
```

Você obterá duas chaves:
- `Public Key` (Pode ir pro frontend e pro Edge)
- `Private Key` (**NUNCA coloque no Frontend**, apenas no Edge)

## Passo 2: Configurar o Frontend

Adicione a chave pública no seu `.env.production` (ou nas configurações de ambiente da Vercel):
```env
VITE_VAPID_PUBLIC_KEY="<SUA_PUBLIC_KEY>"
```

## Passo 3: Criar a Tabela no Supabase

Rode o script SQL incluído no projeto na interface SQL do Supabase.
1. Vá até o painel do Supabase.
2. Acesse **SQL Editor**.
3. Copie o conteúdo de `supabase-push-subscriptions.sql` e execute.

## Passo 4: Fazer o Deploy da Edge Function

Certifique-se de que a Supabase CLI está instalada. Caso contrário, instale via `npm i -g supabase`.

1. Faça o login:
```bash
supabase login
```
2. Vincule seu projeto (pegue o Reference ID no painel de configurações do Supabase):
```bash
supabase link --project-ref <SEU_PROJECT_REF>
```
3. Faça o deploy da Edge Function:
```bash
supabase functions deploy send-ride-push --no-verify-jwt
```
*(Nota: `--no-verify-jwt` garante que o Webhook do Supabase Database consiga acioná-la via Headers secretos, pois ele não manda o Bearer JWT do usuário final)*

## Passo 5: Configurar os Segredos da Edge Function

No terminal, insira os segredos necessários na sua infraestrutura do Supabase. Substitua os `<VALORES>` pelos reais.

```bash
supabase secrets set VAPID_PUBLIC_KEY="<SUA_PUBLIC_KEY>"
supabase secrets set VAPID_PRIVATE_KEY="<SUA_PRIVATE_KEY>"
supabase secrets set VAPID_SUBJECT="mailto:seu-email@example.com"
supabase secrets set WEBHOOK_SECRET="uma_senha_forte_aqui_como_a1b2c3d4"
```
*(O `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` normalmente são auto-injetados na Edge Function, não é necessário setá-los manualmente).*

## Passo 6: Configurar o Database Webhook no Supabase

1. Vá em **Database** -> **Webhooks** no painel do Supabase.
2. Clique em **Create Webhook**.
3. **Name**: `Send Ride Push`
4. **Table**: Selecione a tabela `rides`.
5. **Events**: Marque `Insert` e `Update`.
6. **Type**: HTTP Request.
7. **HTTP Request URL**: Cole a URL da sua Edge Function, ex: `https://<SEU_PROJECT_REF>.supabase.co/functions/v1/send-ride-push`
8. **Method**: `POST`
9. **HTTP Headers**: 
   - Clique em **Add Header**.
   - **Key**: `Authorization`
   - **Value**: `Bearer uma_senha_forte_aqui_como_a1b2c3d4` *(Exatamente o mesmo valor que você configurou no WEBHOOK_SECRET)*.
10. Clique em **Save Webhook**.

## Passo 7: Testando

1. **Android / Desktop:** O motorista clica em "Ativar Notificações", depois o passageiro cria uma corrida. O motorista recebe com o app fechado e, ao clicar, a janela da corrida abrirá.
2. **iPhone / iOS:** O Safari não suporta Push livremente. O usuário DEVE instalar o app na Tela de Início primeiro. Uma checagem de sistema já avisa isso sutilmente.

## Limitações do Navegador

- **iOS / Safari:** Somente a partir do iOS 16.4 o Web Push é suportado e **apenas se a PWA for instalada na Tela de Início (Add to Home Screen)**.
- Assinaturas que pararem de funcionar (como revogação do usuário no sistema operacional) retornarão código HTTP `410 Gone`. A nossa Edge Function já captura isso e dá um update em `is_active = false` no Supabase para economizar tempo nas próximas chamadas.
