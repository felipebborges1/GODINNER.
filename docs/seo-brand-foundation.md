# GODINNER — SEO da marca

Data: 2026-09-18. Base: fc5d659 (Production confirmado na Vercel).

Objetivo inicial: descoberta da marca GODINNER no domínio oficial. Sem promessa de posição ou prazo de indexação.

## Implementação

- Home com título, descrição, canonical e WebSite JSON-LD.
- Conteúdo visível renderizado no servidor na Home e página /sobre.
- Ícone e imagem de compartilhamento, sem dependência de fotos externas.
- Sitemap com Home, Sobre, Privacidade e Termos; não inclui dados pessoais nem pendentes.
- Noindex para rotas de conta, administração, fluxos de review e resultados internos; não substitui autenticação ou RLS.
- URLs Vercel recebem noindex. Preview também recebe robots restritivo.
- Componente Discover apenas extraído para permitir metadata no servidor; comportamento existente preservado.

## Operação

Propriedade sc-domain:godinner.com.br verificada na conta do titular via TXT no Registro.br. Não remover esse TXT. Registros do site e e-mail preservados.

Após publicação: enviar https://www.godinner.com.br/sitemap.xml no Search Console, inspecionar Home e /sobre e solicitar indexação. Medir impressões, cliques, CTR e posição para GODINNER e variantes quando houver dados; números iniciais ainda indisponíveis.

Validação HTTP: node scripts/verify-seo.mjs https://www.godinner.com.br

## Próxima etapa de conteúdo

SEO por restaurante/cidade exige auditoria própria do HTML público e publicação de conteúdo real. Não gerar páginas por cidade sem cobertura, nem inventar avaliações, notas ou vínculos sociais. Restaurantes não entram neste primeiro sitemap, pois suas páginas ainda dependem de carregamento no cliente.

Rollback: reverter apenas o commit de SEO e reimplantar. Nenhuma migration, alteração de dados ou credencial envolvida.
