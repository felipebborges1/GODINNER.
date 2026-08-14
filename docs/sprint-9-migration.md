# Sprint 9 — backend migration

## Estado da inspeção

O checkpoint `mvp-sprints-0-8` tinha o `AppContext` como fonte única em memória. As telas administrativas, perfil e restaurante ainda liam `data/mocks` diretamente; as fotos selecionadas usavam Object URLs apenas para preview; não havia projeto Supabase, CLI, migrations ou variáveis configuradas.

Esta branch adiciona a fundação reversível da migração:

- clientes Supabase separados para browser, Server Components e middleware;
- `NEXT_PUBLIC_DATA_MODE=mock|supabase` explícito;
- schema PostgreSQL versionado, seed local e RLS;
- buckets e políticas de Storage restritas;
- RPCs transacionais para publicação de review e merge;
- repositories tipados e erros estruturados;
- leitura inicial persistente no `AppContext` quando `supabase` está configurado;
- telas básicas de e-mail/senha em `/login` e `/register`;
- callback `/auth/callback` e proteção condicional de rotas;
- `.env.example` sem qualquer segredo.

## Configuração local

1. Instale Docker e a Supabase CLI.
2. Execute `supabase start`.
3. Execute `supabase db reset` para aplicar migrations e `supabase/seed.sql`.
4. Copie `.env.example` para `.env.local` e preencha a URL/chave anon exibidas por `supabase status`.
5. Use `NEXT_PUBLIC_DATA_MODE=supabase` somente depois de o ambiente estar configurado.

O modo padrão continua sendo `mock` quando a flag não existe. Se a flag for `supabase`, o contexto não carrega mocks silenciosamente: sem variáveis públicas, ele permanece sem dados e a autenticação informa que o ambiente não está configurado.

A migração de leituras foi iniciada no contexto, mas alguns componentes legados ainda importam `data/mocks` diretamente (principalmente superfícies de apresentação de Profile/Admin). Eles devem ser migrados em etapas posteriores desta mesma branch antes da aprovação final.

## Limitação desta validação

Não existe projeto Supabase local/remote acessível nesta máquina e a CLI não está instalada. Portanto migrations, seed, Auth, Storage e RLS ainda não foram executados; a validação externa da Sprint 9 está bloqueada até um ambiente Supabase ser disponibilizado. Nenhuma credencial foi inventada e nenhum deploy foi realizado.

## Segurança

`SUPABASE_SERVICE_ROLE_KEY` é somente servidor e não é usado pelas operações comuns. A função de merge valida admin no banco, a publicação é uma RPC única, RLS está habilitada em todas as tabelas da aplicação e redirects `next` aceitam apenas caminhos internos.
