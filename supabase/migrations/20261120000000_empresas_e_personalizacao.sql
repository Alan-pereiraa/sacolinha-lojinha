-- Sacolinha — várias empresas por revendedora + personalização da vitrine
--
-- Empresas (fornecedoras): a revendedora pode pegar sacolas de mais de uma empresa ao mesmo tempo.
--   • cada sacola pertence a uma empresa; pode haver uma sacola aberta POR EMPRESA
--   • cada peça continua ligada a uma sacola, e o lucro de cada item vendido usa o % da sacola dele
--   • uma venda pode misturar peças de empresas diferentes
--
-- Personalização: cor livre, textos da vitrine, seções (liga/desliga e ordem) e redes sociais.

-- ─────────────────────────────────────────── empresas

create table public.fornecedoras (
  id                uuid primary key default gen_random_uuid(),
  loja_id           uuid not null references public.lojas (id) on delete cascade,
  nome              text not null check (char_length(trim(nome)) between 2 and 60),
  percentual_lucro  numeric(5,2) not null default 30 check (percentual_lucro between 0 and 100),
  prazo_dias        integer not null default 60 check (prazo_dias between 7 and 180),
  criado_em         timestamptz not null default now(),
  unique (loja_id, nome)
);
create index fornecedoras_loja_idx on public.fornecedoras (loja_id);

alter table public.fornecedoras enable row level security;
create policy "fornecedoras: dona" on public.fornecedoras for all
  using (loja_id = public.minha_loja_id()) with check (loja_id = public.minha_loja_id());

alter table public.sacolas add column fornecedora_id uuid references public.fornecedoras (id) on delete restrict;

-- sacolas que já existem: ficam com a empresa "Minha revendedora" da própria loja
insert into public.fornecedoras (loja_id, nome, percentual_lucro)
select s.loja_id, 'Minha revendedora', max(s.percentual_lucro)
  from public.sacolas s
 group by s.loja_id
on conflict (loja_id, nome) do nothing;

update public.sacolas s
   set fornecedora_id = f.id
  from public.fornecedoras f
 where f.loja_id = s.loja_id and f.nome = 'Minha revendedora' and s.fornecedora_id is null;

-- antes: uma sacola aberta por loja; agora: uma sacola aberta por empresa
drop index public.sacolas_uma_aberta;
create unique index sacolas_uma_aberta_por_empresa on public.sacolas (fornecedora_id) where status = 'aberta';

-- garante que sacola, empresa e peça sejam todas da mesma loja
create or replace function public.validar_sacola_da_loja()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.fornecedora_id is not null
     and not exists (select 1 from public.fornecedoras f where f.id = new.fornecedora_id and f.loja_id = new.loja_id) then
    raise exception 'Empresa de outra loja' using errcode = '42501';
  end if;
  return new;
end;
$$;

create or replace function public.validar_produto_da_loja()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.sacola_id is not null
     and not exists (select 1 from public.sacolas s where s.id = new.sacola_id and s.loja_id = new.loja_id) then
    raise exception 'Sacola de outra loja' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger sacolas_mesma_loja before insert or update of fornecedora_id, loja_id on public.sacolas
  for each row execute function public.validar_sacola_da_loja();
create trigger produtos_mesma_loja before insert or update of sacola_id, loja_id on public.produtos
  for each row execute function public.validar_produto_da_loja();

-- lucro guardado por item (cada item pode vir de uma sacola/empresa diferente)
alter table public.venda_itens
  add column sacola_id uuid references public.sacolas (id) on delete set null,
  add column lucro     numeric(10,2) not null default 0;
create index venda_itens_sacola_idx on public.venda_itens (sacola_id);

-- ─────────────────────────────────────────── personalização da vitrine

alter table public.lojas
  add column cor_personalizada  text check (cor_personalizada ~ '^#[0-9a-fA-F]{6}$'),
  add column aviso_topo         text check (char_length(aviso_topo) <= 140),
  add column destaque_etiqueta  text check (char_length(destaque_etiqueta) <= 40),
  add column destaque_titulo    text check (char_length(destaque_titulo) <= 90),
  add column destaque_texto     text check (char_length(destaque_texto) <= 240),
  add column destaque_botao     text check (char_length(destaque_botao) <= 30),
  add column novidades_titulo   text check (char_length(novidades_titulo) <= 60),
  add column sobre_titulo       text check (char_length(sobre_titulo) <= 60),
  add column sobre_texto        text check (char_length(sobre_texto) <= 1200),
  add column contato_texto      text check (char_length(contato_texto) <= 160),
  add column vantagens          jsonb check (vantagens is null or (jsonb_typeof(vantagens) = 'array' and jsonb_array_length(vantagens) <= 4)),
  add column secoes             jsonb not null default
    '[{"id":"destaque","visivel":true},{"id":"vantagens","visivel":true},{"id":"novidades","visivel":true},{"id":"sobre","visivel":false},{"id":"contato","visivel":true}]'::jsonb
    check (jsonb_typeof(secoes) = 'array' and jsonb_array_length(secoes) <= 10),
  add column instagram          text check (instagram ~ '^[A-Za-z0-9._]{1,30}$'),
  add column tiktok             text check (tiktok ~ '^[A-Za-z0-9._]{1,30}$');

-- a vitrine pública (visitante anônimo) pode ler estas colunas novas
grant select (cor_personalizada, aviso_topo, destaque_etiqueta, destaque_titulo, destaque_texto, destaque_botao,
              novidades_titulo, sobre_titulo, sobre_texto, contato_texto, vantagens, secoes, instagram, tiktok)
  on public.lojas to anon;

-- ─────────────────────────────────────────── cadastro: cria a empresa da primeira sacola

create or replace function public.criar_loja_no_cadastro()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_loja uuid;
  v_empresa uuid;
  v_recebida date := coalesce(nullif(m->>'sacola_recebida_em','')::date, current_date);
  v_dias int := coalesce(nullif(m->>'sacola_dias','')::int, 60);
  v_pct numeric := coalesce(nullif(m->>'percentual_lucro','')::numeric, 30);
begin
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

    insert into public.fornecedoras (loja_id, nome, percentual_lucro, prazo_dias)
    values (v_loja, coalesce(nullif(trim(m->>'empresa_nome'),''), 'Minha revendedora'), v_pct, greatest(7, least(v_dias, 180)))
    returning id into v_empresa;

    insert into public.sacolas (loja_id, fornecedora_id, nome, recebida_em, devolver_ate, percentual_lucro)
    values (
      v_loja, v_empresa,
      'Sacola de ' || (array['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho',
                             'Agosto','Setembro','Outubro','Novembro','Dezembro'])[extract(month from v_recebida)::int],
      v_recebida,
      v_recebida + v_dias,
      v_pct
    );
  end if;
  return new;
end;
$$;
revoke execute on function public.criar_loja_no_cadastro() from public, anon, authenticated;

-- ─────────────────────────────────────────── venda: lucro por item, várias sacolas

create or replace function public.finalizar_venda(
  p_itens              jsonb,
  p_forma              text,
  p_parcelas           int     default 1,
  p_cliente_nome       text    default null,
  p_cliente_whatsapp   text    default null,
  p_primeiro_venc      date    default null,
  p_venc_pela_sacola   boolean default false,
  p_cobrar_auto        boolean default true
)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_loja      uuid := public.minha_loja_id();
  v_hoje      date := public.hoje_brasil();
  v_venda     uuid;
  v_total     numeric(10,2) := 0;
  v_lucro     numeric(10,2) := 0;
  v_n         int := greatest(1, least(coalesce(p_parcelas, 1), 12));
  v_whats     text := nullif(regexp_replace(coalesce(p_cliente_whatsapp, ''), '\D', '', 'g'), '');
  v_nome      text := nullif(trim(coalesce(p_cliente_nome, '')), '');
  v_forma     text;
  v_base      numeric(10,2);
  v_venc      date;
  v_fim       date;
  v_dias      int;
  v_sacolas   uuid[] := '{}';
  v_item_luc  numeric(10,2);
  it          jsonb;
  v_var       record;
  v_qtd       int;
  i           int;
begin
  if v_loja is null then
    raise exception 'Sem loja para este usuário' using errcode = '42501';
  end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Nenhuma peça na venda';
  end if;
  if p_forma not in ('pix','cartao','dinheiro','caderninho') then
    raise exception 'Forma de pagamento inválida';
  end if;
  v_forma := case when p_forma = 'caderninho' then 'fiado' else p_forma end;
  if p_forma = 'caderninho' and v_nome is null then
    raise exception 'Caderninho: informe o nome de quem vai pagar';
  end if;
  if v_whats is not null and char_length(v_whats) between 10 and 11 then
    v_whats := '55' || v_whats;
  end if;
  if v_whats is not null and char_length(v_whats) not between 12 and 13 then
    raise exception 'WhatsApp da cliente inválido: use DDD + número';
  end if;

  insert into public.vendas (loja_id, sacola_id, total, lucro, forma_pagamento, parcelas,
                             cliente_nome, cliente_whatsapp, cobranca_automatica, pago)
  values (v_loja, null, 0, 0, v_forma,
          case when p_forma = 'caderninho' then v_n else 1 end,
          v_nome,
          case when p_forma = 'caderninho' then v_whats end,
          p_forma = 'caderninho' and v_whats is not null and coalesce(p_cobrar_auto, true),
          p_forma <> 'caderninho')
  returning id into v_venda;

  for it in select * from jsonb_array_elements(p_itens) loop
    v_qtd := greatest(1, coalesce((it->>'quantidade')::int, 1));

    select v.id, v.tamanho, v.estoque, p.nome, p.preco, p.sacola_id, coalesce(s.percentual_lucro, 0) as pct
      into v_var
      from public.variantes v
      join public.produtos p on p.id = v.produto_id
      left join public.sacolas s on s.id = p.sacola_id
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

    v_item_luc := round(v_var.preco * v_qtd * v_var.pct / 100, 2);
    insert into public.venda_itens (venda_id, variante_id, produto_nome, tamanho, preco, quantidade, sacola_id, lucro)
    values (v_venda, v_var.id, v_var.nome, v_var.tamanho, v_var.preco, v_qtd, v_var.sacola_id, v_item_luc);

    v_total := v_total + v_var.preco * v_qtd;
    v_lucro := v_lucro + v_item_luc;
    if v_var.sacola_id is not null and not (v_var.sacola_id = any (v_sacolas)) then
      v_sacolas := v_sacolas || v_var.sacola_id;
    end if;
  end loop;

  update public.vendas
     set total = v_total,
         lucro = v_lucro,
         sacola_id = case when cardinality(v_sacolas) = 1 then v_sacolas[1] end
   where id = v_venda;

  if p_forma = 'caderninho' then
    -- "até o fechamento da sacola": o prazo mais curto entre as sacolas das peças vendidas
    -- (sem sacola nas peças: o da sacola aberta que vence primeiro)
    select min(devolver_ate) into v_fim from public.sacolas
     where loja_id = v_loja and status = 'aberta'
       and (cardinality(v_sacolas) = 0 or id = any (v_sacolas));

    v_base := trunc(v_total / v_n, 2);
    for i in 1..v_n loop
      if coalesce(p_venc_pela_sacola, false) and v_fim is not null then
        v_dias := greatest(0, v_fim - v_hoje);
        v_venc := v_hoje + ceil(v_dias::numeric * i / v_n)::int;
      else
        v_venc := (coalesce(p_primeiro_venc, v_hoje + 30) + make_interval(months => i - 1))::date;
      end if;
      insert into public.parcelas (loja_id, venda_id, numero, total_parcelas, valor, vence_em)
      values (v_loja, v_venda, i, v_n,
              case when i = v_n then v_total - v_base * (v_n - 1) else v_base end,
              v_venc);
    end loop;
  end if;

  return v_venda;
end;
$$;
revoke execute on function public.finalizar_venda(jsonb, text, int, text, text, date, boolean, boolean) from public, anon;
grant execute on function public.finalizar_venda(jsonb, text, int, text, text, date, boolean, boolean) to authenticated;
