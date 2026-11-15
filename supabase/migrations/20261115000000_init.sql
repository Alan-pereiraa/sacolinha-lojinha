-- Sacolinha — esquema inicial
-- Cada vendedora (usuária do Supabase Auth) tem UMA loja.
-- A loja tem sacolas (ciclos de consignação), produtos com variantes (tamanho + código de barras)
-- e vendas. A vitrine pública lê lojas, produtos visíveis e variantes.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────── tabelas

create table public.lojas (
  id              uuid primary key default gen_random_uuid(),
  dono_id         uuid not null unique references auth.users (id) on delete cascade,
  nome            text not null check (char_length(nome) between 2 and 60),
  slug            text not null unique
                  check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'
                         and slug not in ('painel','login','cadastro','auth','api','sair','p','admin','www','esqueci')),
  cidade          text,
  whatsapp        text,           -- só dígitos, com DDI: 5542999990000
  tema            text not null default 'rosa'     check (tema in ('rosa','lilas','pessego','salvia')),
  fonte           text not null default 'elegante' check (fonte in ('elegante','romantica','moderna')),
  formato         text not null default 'arco'     check (formato in ('arco','suave','reto')),
  logo_url        text,
  capa_url        text,
  wa_instancia    text unique,    -- nome da instância na Evolution API
  wa_grupo_id     text,           -- JID do grupo: 1203...@g.us
  wa_grupo_nome   text,
  criado_em       timestamptz not null default now()
);

create table public.sacolas (
  id                uuid primary key default gen_random_uuid(),
  loja_id           uuid not null references public.lojas (id) on delete cascade,
  nome              text not null,
  recebida_em       date not null default current_date,
  devolver_ate      date not null,
  percentual_lucro  numeric(5,2) not null default 30 check (percentual_lucro between 0 and 100),
  status            text not null default 'aberta' check (status in ('aberta','fechada')),
  fechada_em        timestamptz,
  criado_em         timestamptz not null default now()
);
-- no máximo uma sacola aberta por loja
create unique index sacolas_uma_aberta on public.sacolas (loja_id) where status = 'aberta';

create table public.produtos (
  id                    uuid primary key default gen_random_uuid(),
  loja_id               uuid not null references public.lojas (id) on delete cascade,
  sacola_id             uuid references public.sacolas (id) on delete set null,
  nome                  text not null check (char_length(nome) between 2 and 80),
  categoria             text not null default 'outros'
                        check (categoria in ('conjuntos','sutias','calcinhas','bodies','camisolas','outros')),
  descricao             text,
  cor                   text,
  preco                 numeric(10,2) not null check (preco >= 0),
  fotos                 text[] not null default '{}',
  visivel               boolean not null default true,
  novidade_enviada_em   timestamptz,
  criado_em             timestamptz not null default now()
);
create index produtos_loja_idx on public.produtos (loja_id, criado_em desc);

create table public.variantes (
  id              uuid primary key default gen_random_uuid(),
  produto_id      uuid not null references public.produtos (id) on delete cascade,
  loja_id         uuid not null references public.lojas (id) on delete cascade,
  tamanho         text not null,
  codigo_barras   text,
  estoque         integer not null default 1 check (estoque >= 0),
  vendidos        integer not null default 0 check (vendidos >= 0),
  unique (loja_id, codigo_barras)
);
create index variantes_produto_idx on public.variantes (produto_id);

create table public.vendas (
  id                uuid primary key default gen_random_uuid(),
  loja_id           uuid not null references public.lojas (id) on delete cascade,
  sacola_id         uuid references public.sacolas (id) on delete set null,
  total             numeric(10,2) not null,
  lucro             numeric(10,2) not null,
  forma_pagamento   text not null check (forma_pagamento in ('pix','cartao','dinheiro','fiado')),
  parcelas          integer not null default 1 check (parcelas between 1 and 12),
  pagador           text,
  pago              boolean not null default true,
  criado_em         timestamptz not null default now()
);
create index vendas_loja_idx on public.vendas (loja_id, criado_em desc);

create table public.venda_itens (
  id            uuid primary key default gen_random_uuid(),
  venda_id      uuid not null references public.vendas (id) on delete cascade,
  variante_id   uuid references public.variantes (id) on delete set null,
  produto_nome  text not null,
  tamanho       text not null,
  preco         numeric(10,2) not null,
  quantidade    integer not null default 1 check (quantidade > 0)
);
create index venda_itens_venda_idx on public.venda_itens (venda_id);

-- ─────────────────────────────────────────── helpers

create or replace function public.minha_loja_id()
returns uuid
language sql stable security definer
set search_path = ''
as $$
  select id from public.lojas where dono_id = auth.uid()
$$;

create or replace function public.slug_disponivel(p_slug text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select not exists (select 1 from public.lojas where slug = lower(p_slug))
$$;
grant execute on function public.slug_disponivel(text) to anon, authenticated;

-- ─────────────────────────────────────────── cadastro: cria loja + primeira sacola

create or replace function public.criar_loja_no_cadastro()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_loja uuid;
  v_recebida date := coalesce(nullif(m->>'sacola_recebida_em','')::date, current_date);
  v_dias int := coalesce(nullif(m->>'sacola_dias','')::int, 60);
begin
  -- só cria loja quando o cadastro veio da tela da Sacolinha
  if m ? 'loja_slug' then
    insert into public.lojas (dono_id, nome, slug, cidade, whatsapp, tema)
    values (
      new.id,
      coalesce(nullif(m->>'loja_nome',''), 'Minha loja'),
      lower(m->>'loja_slug'),
      nullif(m->>'cidade',''),
      nullif(regexp_replace(coalesce(m->>'whatsapp',''), '\D', '', 'g'), ''),
      coalesce(nullif(m->>'tema',''), 'rosa')
    )
    returning id into v_loja;

    insert into public.sacolas (loja_id, nome, recebida_em, devolver_ate, percentual_lucro)
    values (
      v_loja,
      'Sacola de ' || (array['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho',
                             'Agosto','Setembro','Outubro','Novembro','Dezembro'])[extract(month from v_recebida)::int],
      v_recebida,
      v_recebida + v_dias,
      coalesce(nullif(m->>'percentual_lucro','')::numeric, 30)
    );
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.criar_loja_no_cadastro();

-- ─────────────────────────────────────────── venda (atômica)
-- p_itens: [{"variante_id": "...", "quantidade": 1}, ...]

create or replace function public.finalizar_venda(
  p_itens jsonb,
  p_forma text,
  p_parcelas int default 1,
  p_pagador text default null
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_loja    uuid := public.minha_loja_id();
  v_sacola  public.sacolas%rowtype;
  v_venda   uuid;
  v_total   numeric(10,2) := 0;
  it        jsonb;
  v_var     record;
  v_qtd     int;
begin
  if v_loja is null then
    raise exception 'Sem loja para este usuário' using errcode = '42501';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Nenhuma peça na venda';
  end if;
  if p_forma not in ('pix','cartao','dinheiro','fiado') then
    raise exception 'Forma de pagamento inválida';
  end if;

  select * into v_sacola from public.sacolas
   where loja_id = v_loja and status = 'aberta' limit 1;

  insert into public.vendas (loja_id, sacola_id, total, lucro, forma_pagamento, parcelas, pagador, pago)
  values (v_loja, v_sacola.id, 0, 0, p_forma,
          case when p_forma = 'fiado' then greatest(1, least(coalesce(p_parcelas,1), 12)) else 1 end,
          nullif(trim(coalesce(p_pagador,'')), ''),
          p_forma <> 'fiado')
  returning id into v_venda;

  for it in select * from jsonb_array_elements(p_itens) loop
    v_qtd := greatest(1, coalesce((it->>'quantidade')::int, 1));

    select v.id, v.tamanho, v.estoque, p.nome, p.preco
      into v_var
      from public.variantes v
      join public.produtos p on p.id = v.produto_id
     where v.id = (it->>'variante_id')::uuid
       and v.loja_id = v_loja
     for update of v;

    if not found then
      raise exception 'Peça não encontrada';
    end if;
    if v_var.estoque < v_qtd then
      raise exception 'Sem estoque: % (%)', v_var.nome, v_var.tamanho;
    end if;

    update public.variantes
       set estoque = estoque - v_qtd, vendidos = vendidos + v_qtd
     where id = v_var.id;

    insert into public.venda_itens (venda_id, variante_id, produto_nome, tamanho, preco, quantidade)
    values (v_venda, v_var.id, v_var.nome, v_var.tamanho, v_var.preco, v_qtd);

    v_total := v_total + v_var.preco * v_qtd;
  end loop;

  update public.vendas
     set total = v_total,
         lucro = round(v_total * coalesce(v_sacola.percentual_lucro, 0) / 100, 2)
   where id = v_venda;

  return v_venda;
end;
$$;
grant execute on function public.finalizar_venda(jsonb, text, int, text) to authenticated;

-- ─────────────────────────────────────────── RLS

alter table public.lojas       enable row level security;
alter table public.sacolas     enable row level security;
alter table public.produtos    enable row level security;
alter table public.variantes   enable row level security;
alter table public.vendas      enable row level security;
alter table public.venda_itens enable row level security;

-- lojas: vitrine pública lê; só a dona altera
create policy "lojas: leitura pública" on public.lojas for select using (true);
create policy "lojas: dona atualiza" on public.lojas for update
  using (dono_id = auth.uid()) with check (dono_id = auth.uid());

-- sacolas: só a dona
create policy "sacolas: dona" on public.sacolas for all
  using (loja_id = public.minha_loja_id()) with check (loja_id = public.minha_loja_id());

-- produtos: vitrine vê os visíveis; dona faz tudo
create policy "produtos: vitrine" on public.produtos for select using (visivel);
create policy "produtos: dona" on public.produtos for all
  using (loja_id = public.minha_loja_id()) with check (loja_id = public.minha_loja_id());

-- variantes: vitrine lê (para mostrar tamanhos); dona faz tudo
create policy "variantes: vitrine" on public.variantes for select using (true);
create policy "variantes: dona" on public.variantes for all
  using (loja_id = public.minha_loja_id()) with check (loja_id = public.minha_loja_id());

-- vendas: só a dona
create policy "vendas: dona" on public.vendas for all
  using (loja_id = public.minha_loja_id()) with check (loja_id = public.minha_loja_id());
create policy "venda_itens: dona" on public.venda_itens for all
  using (exists (select 1 from public.vendas v where v.id = venda_id and v.loja_id = public.minha_loja_id()))
  with check (exists (select 1 from public.vendas v where v.id = venda_id and v.loja_id = public.minha_loja_id()));

-- colunas da integração com WhatsApp não vão para a vitrine (visitante anônimo)
revoke select on public.lojas from anon;
grant select (id, dono_id, nome, slug, cidade, whatsapp, tema, fonte, formato, logo_url, capa_url, criado_em)
  on public.lojas to anon;

-- ─────────────────────────────────────────── storage: fotos
-- caminho: <loja_id>/produtos/<arquivo>  ou  <loja_id>/marca/<arquivo>

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fotos', 'fotos', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "fotos: dona envia" on storage.objects for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = public.minha_loja_id()::text);
create policy "fotos: dona altera" on storage.objects for update to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = public.minha_loja_id()::text);
create policy "fotos: dona apaga" on storage.objects for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = public.minha_loja_id()::text);
