# App Ponto online

## Supabase

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from the project's API settings. The legacy anon key is also accepted as `VITE_SUPABASE_ANON_KEY`.
3. Run `supabase/setup.sql` in the Supabase SQL Editor to create the attendance table, its per-user security policies, the profile photo bucket, and master-admin access for `gaasbrel@gmail.com`.
4. In Supabase Authentication URL Configuration, set the production Vercel domain as the Site URL. Add `http://localhost:5173/**`, the exact production URL, and your Vercel preview pattern (for example, `https://*-your-team.vercel.app/**`) to Redirect URLs.
5. In Vercel Project Settings → Environment Variables, add the same URL and publishable key for Preview and Production, then redeploy.

The app uses Supabase Auth for email/password accounts. Attendance records sync to Supabase and are isolated by the signed-in user's ID; existing local records are copied to the account on first load. The account `gaasbrel@gmail.com` also has an admin panel to view, edit, and delete users' attendance records. This access is enforced by database policies and the `admin_list_users()` function. Re-run `supabase/setup.sql` to apply or update these policies and the function.

## Testar uma branch na Vercel

When the Git repository is connected to Vercel, pushes to branches other than the Production Branch (currently `main`) create Preview Deployments. Configure the Supabase URL and publishable key for the Preview environment in Vercel. A preview connected to the production Supabase project will use production accounts and data; use a separate Supabase project for isolated testing. Add the preview URL pattern to Supabase Auth → URL Configuration → Redirect URLs so email confirmation and login redirects work on preview deployments.

## Planilhas de ponto

Na seção do calendário, use **Baixar modelo** para obter `Modelo_importacao_pontos.xlsx`. Preencha a aba `Registros` com uma linha por dia e mantenha os cabeçalhos: `Data`, `Entrada`, `Saída para almoço`, `Volta do almoço` e `Fim do expediente`. As datas devem ser anteriores a hoje e os horários devem estar em sequência (`HH:MM`). A importação atualiza os registros do usuário na tabela `attendance_records`; se uma data já tiver batidas, o app pede confirmação antes de substituí-las.

Para exportar, o botão **Exportar mês** baixa o mês exibido. Os campos **De** e **Até** permitem escolher qualquer período. O arquivo contém as abas `Resumo` e `Registros`; o resumo informa horas trabalhadas, dias completos, saldo e total de batidas no período.

Run locally with `npm install` and `npm run dev`. The signup flow follows the email confirmation setting in Supabase; users return to the login screen after registration.
