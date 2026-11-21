# Modelos de e-mail do Supabase

Cole cada arquivo em **Supabase → Authentication → Emails → Templates** (aba *Source*),
com o assunto abaixo:

| Modelo no Supabase | Arquivo | Assunto |
|---|---|---|
| Confirm signup | `confirmar-cadastro.html` | Confirme seu e-mail para ativar sua loja na Sacolinha |
| Reset password | `redefinir-senha.html` | Crie uma senha nova na Sacolinha |
| Change email address | `trocar-email.html` | Confirme seu novo e-mail na Sacolinha |

Os links usam `{{ .SiteURL }}/auth/confirm?token_hash=...`, que funcionam em qualquer aparelho
(não dependem do navegador onde a pessoa se cadastrou). Para isso, o **Site URL** em
Authentication → URL Configuration precisa ser `https://sacolinha-lojinha.vercel.app`.
