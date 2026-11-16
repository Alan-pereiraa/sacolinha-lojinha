# Sacolinha

Vitrine e sistema de vendas para revendedoras de lingerie que trabalham com sacola consignada.
Cada revendedora cria a própria loja (white label: nome, logo, cor, fonte e formato das fotos),
cadastra as peças da sacola, vende bipando o código de barras da etiqueta e, no fim do ciclo,
recebe pronta a lista do que devolver e o valor a pagar à revendedora. As novidades podem ser
enviadas para o grupo de clientes no WhatsApp.

## Stack

| Parte | Tecnologia |
| --- | --- |
| Frontend | Next.js 16 (App Router, Server Actions), React 19, Tailwind CSS 4 |
| Banco, login e fotos | Supabase (Postgres + RLS, Auth, Storage) |
| Leitor de código de barras | [`barcode-detector`](https://github.com/Sec-ant/barcode-detector): usa o leitor nativo do navegador quando existe (Chrome/Android) e, no iPhone e no Firefox, o ZXing-C++ compilado em WebAssembly |
| WhatsApp | [Evolution API v2](https://github.com/EvolutionAPI/evolution-api), open source e auto-hospedada |

## Estrutura

```
src/
  app/
    page.tsx                    página inicial da Sacolinha
    (acesso)/                   login, cadastro em 3 passos, esqueci a senha
    auth/confirm/route.ts       destino dos links de e-mail
    [slug]/                     vitrine pública da loja  →  /boutique-rose
    [slug]/p/[id]/              página da peça (botão "Quero essa!" abre o WhatsApp)
    painel/                     área da vendedora (protegida pelo proxy)
      page.tsx                  início: sacola, vendas, a receber, mais vendidas
      sacola/                   peças da sacola, fechar sacola, acerto
      produtos/                 cadastrar e editar peça (fotos + tamanhos + código)
      vender/                   caixa: bipar etiqueta → pagamento → finalizar
      divulgar/                 conectar WhatsApp, escolher grupo, enviar novidades
      loja/                     personalização white label com prévia ao vivo
  components/leitor-codigo.tsx  leitor de código de barras pela câmera
  lib/supabase/                 clientes do Supabase (servidor, navegador, proxy)
  lib/evolution.ts              cliente da Evolution API
  proxy.ts                      renova a sessão e protege /painel
supabase/migrations/            esquema do banco, regras de acesso (RLS) e Storage
docker/evolution/               docker-compose da Evolution API
```

## Modo demonstração

Se `NEXT_PUBLIC_SUPABASE_URL` não estiver configurada (ou com `NEXT_PUBLIC_DEMO=1`), o sistema
roda com uma loja de exemplo (Boutique Rosé), 8 peças, vendas e fiados, sem precisar do Supabase.
O login aceita qualquer e-mail e senha. Os dados ficam na memória do servidor e voltam ao
original quando ele reinicia. O envio de fotos fica desligado nesse modo.

Para publicar a demonstração na Vercel pelo terminal:

```bash
npm install
npx vercel --prod          # na primeira vez abre o navegador para entrar na sua conta
```

A Vercel devolve um link `https://sacolinha-xxxx.vercel.app`. Quando o Supabase estiver pronto,
adicione as variáveis em *Project → Settings → Environment Variables* e faça o deploy de novo.

## Como rodar

### 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com) (o plano grátis serve para começar).
2. Rode a migração `supabase/migrations/20261115000000_init.sql`, por um destes caminhos:
   - **SQL Editor** do painel: cole o arquivo inteiro e clique em *Run*; ou
   - **CLI**: `npx supabase link --project-ref SEU_REF` e depois `npx supabase db push`.
3. Em **Authentication → URL Configuration**:
   - *Site URL*: `http://localhost:3000` (em produção, o domínio do site)
   - *Redirect URLs*: adicione `http://localhost:3000/auth/confirm` e `https://SEU-DOMINIO/auth/confirm`
4. Em **Authentication → Providers → Email**, deixe *Confirm email* ligado. Para testar sem
   e-mail, dá para desligar: o cadastro então entra direto no painel.

A migração cria:

- **Tabelas:** `lojas`, `sacolas`, `produtos`, `variantes` (tamanho + código de barras + estoque), `vendas` e `venda_itens`.
- **Gatilho de cadastro:** cria a loja e a primeira sacola assim que a conta é criada.
- **Função `finalizar_venda`:** baixa o estoque e registra a venda numa única transação, sem risco de vender a mesma peça duas vezes.
- **Regras de acesso (RLS):** a vitrine pública lê só peças visíveis; cada vendedora só enxerga e altera os próprios dados.
- **Fotos:** bucket público `fotos`, em que cada loja só grava na própria pasta.

### 2. Variáveis de ambiente

```bash
cp .env.example .env.local
```

Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (em *Project Settings → API*).

Depois de publicar, abra **/status**: a página mostra se cada variável está certa e se a conexão
com o banco funciona (sem nunca exibir o valor das chaves).

### 3. Rodar

```bash
npm install
npm run dev
```

Abra http://localhost:3000, crie a conta em **Criar minha loja** e cadastre as primeiras peças.

> **Câmera:** o navegador só libera a câmera em `localhost` ou em HTTPS. Para testar o leitor
> no celular durante o desenvolvimento, use `npx next dev --experimental-https` e acesse pelo
> IP do computador, ou publique na Vercel.

## WhatsApp (Evolution API)

A Evolution API é um servidor que conecta um número de WhatsApp como se fosse o WhatsApp Web
(lendo um QR code). Ela precisa ficar ligada o tempo todo, então **não roda na Vercel**: use uma
VPS pequena (1 GB de RAM basta), Railway, Render ou um computador que fique ligado.

```bash
cd docker/evolution
cp .env.example .env        # troque AUTHENTICATION_API_KEY e as senhas
docker compose up -d
```

Depois coloque no `.env.local` do Next.js:

```
EVOLUTION_API_URL=http://SEU-SERVIDOR:8080
EVOLUTION_API_KEY=a mesma AUTHENTICATION_API_KEY
NEXT_PUBLIC_SITE_URL=https://seu-dominio   # vai nos links das mensagens
```

No painel, em **Divulgar**:

1. Gere o QR code e leia pelo WhatsApp do celular, em *Aparelhos conectados*.
2. Escolha o grupo.
3. Marque as peças que quer divulgar.

Cada peça vai como uma mensagem com foto, tamanhos disponíveis, preço e o link da peça na vitrine.

**Riscos:**

- **Conexão não oficial:** a conexão `WHATSAPP-BAILEYS` usa o protocolo do WhatsApp Web e não é oficial. O código da Evolution API é legal e open source, mas automatizar envios vai contra os termos do WhatsApp, e o número pode ser bloqueado se mandar demais.
- **O que o sistema já faz para reduzir o risco:** limita a 15 peças por envio e espera de 3 a 7 segundos entre as mensagens.
- **O que vale fazer:** usar o número da loja (não o pessoal) e mandar para grupos em que as clientes entraram por vontade própria, poucas vezes por semana.
- **Caminho oficial:** se um dia precisar dele, a própria Evolution API também aceita a WhatsApp Cloud API da Meta (paga por conversa).

## Deploy

- **Next.js:** Vercel. Importe o repositório e configure as mesmas variáveis do `.env.local`.
- **Supabase:** já fica na nuvem.
- **Evolution API:** na VPS. Se a Vercel precisar acessá-la pela internet, coloque HTTPS na frente (Caddy ou Nginx).

## Como funciona o ciclo da sacola

1. **Cadastro:** a vendedora informa quando recebeu a sacola, o prazo para devolver e o % de lucro.
2. **Peças:** cada peça cadastrada entra na sacola aberta. Cada tamanho tem o código de barras da etiqueta e a quantidade.
3. **Venda:** bipar a etiqueta adiciona a peça. Na hora de finalizar, a função `finalizar_venda` confere e baixa o estoque.
4. **Fiado:** fica em "A receber" até ela marcar *Recebi*.
5. **Fechar a sacola:**
   - as peças restantes saem da vitrine;
   - a tela de **acerto** mostra o que devolver e quanto pagar à revendedora (total vendido − lucro), e pode ser impressa.

## Próximos passos sugeridos

- Histórico completo de vendas com filtro por período.
- Avisar a vendedora (e-mail ou WhatsApp) quando faltarem 7 dias para devolver a sacola.
- Gerar etiquetas com código de barras para peças que vierem sem etiqueta.
- Planos e cobrança para revender o sistema a outras vendedoras.
