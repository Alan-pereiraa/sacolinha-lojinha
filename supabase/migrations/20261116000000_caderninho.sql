-- Sacolinha — Caderninho (venda a prazo) com cobrança automática pelo WhatsApp
--
-- • nas telas, "fiado" passa a se chamar "Caderninho" (no banco o valor continua 'fiado')
-- • a venda no caderninho guarda nome e WhatsApp de quem vai pagar (só da venda, não é cadastro de cliente)
-- • cada venda no caderninho vira 1..12 parcelas com data de vencimento:
--     - a partir de uma data escolhida (uma parcela por mês), ou
--     - distribuídas até o prazo de devolução da sacola
-- • a loja configura os lembretes: X dias antes, no dia, e repetir após vencido
-- • um agendamento diário (Vercel Cron) busca as cobranças do dia por funções protegidas por segredo

-- ─────────────────────────────────────────── vendas: dados do caderninho
-- (só acréscimos: no banco a forma de pagamento continua 'fiado'; as telas mostram "Caderninho".
--  A coluna antiga "pagador" fica sem uso.)

alter table public.vendas add column cliente_nome text;
alter table public.vendas add column cliente_whatsapp text;
alter table public.vendas add column cobranca_automatica boolean not null default false;

-- ─────────────────────────────────────────── lojas: configuração da cobrança

alter table public.lojas
  add column cobranca_ativa         boolean not null default true,
  add column cobranca_dias_antes    integer not null default 1 check (cobranca_dias_antes between 0 and 15),
  add column cobranca_repetir_dias  integer not null default 3 check (cobranca_repetir_dias between 1 and 30),
  add column cobranca_max_atraso    integer not null default 3 check (cobranca_max_atraso between 0 and 10),
  add column cobranca_mensagem      text check (char_length(cobranca_mensagem) <= 700),
  add column chave_pix              text check (char_length(chave_pix) <= 120);
-- (o visitante anônimo só lê as colunas liberadas na migração inicial; estas ficam privadas)

-- ─────────────────────────────────────────── parcelas

create table public.parcelas (
  id                  uuid primary key default gen_random_uuid(),
  loja_id             uuid not null references public.lojas (id) on delete cascade,
  venda_id            uuid not null references public.vendas (id) on delete cascade,
  numero              integer not null check (numero >= 1),
  total_parcelas      integer not null check (total_parcelas >= 1),
  valor               numeric(10,2) not null check (valor >= 0),
  vence_em            date not null,
  pago_em             timestamptz,
  lembretes           integer not null default 0,
  lembretes_atraso    integer not null default 0,
  ultimo_lembrete_em  date,
  criado_em           timestamptz not null default now()
);
create index parcelas_loja_aberto_idx on public.parcelas (loja_id, vence_em) where pago_em is null;
create index parcelas_venda_idx on public.parcelas (venda_id);

alter table public.parcelas enable row level security;
create policy "parcelas: dona" on public.parcelas for all
  using (loja_id = public.minha_loja_id()) with check (loja_id = public.minha_loja_id());

-- venda.pago acompanha as parcelas (paga quando não sobra nenhuma em aberto)
create or replace function public.sincronizar_venda_paga()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.vendas v
     set pago = not exists (select 1 from public.parcelas p where p.venda_id = v.id and p.pago_em is null)
   where v.id = coalesce(new.venda_id, old.venda_id);
  return null;
end;
$$;
revoke execute on function public.sincronizar_venda_paga() from public, anon, authenticated;

create trigger parcelas_sincroniza_venda
  after insert or update of pago_em or delete on public.parcelas
  for each row execute function public.sincronizar_venda_paga();

-- data de hoje no fuso de Brasília
create or replace function public.hoje_brasil()
returns date
language sql stable
set search_path = ''
as $$ select (now() at time zone 'America/Sao_Paulo')::date $$;

-- ─────────────────────────────────────────── venda (nova versão, com parcelas)
-- A versão antiga (4 parâmetros) continua existindo, mas o app passa a usar esta.

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
  v_loja    uuid := public.minha_loja_id();
  v_hoje    date := public.hoje_brasil();
  v_sacola  public.sacolas%rowtype;
  v_venda   uuid;
  v_total   numeric(10,2) := 0;
  v_n       int := greatest(1, least(coalesce(p_parcelas, 1), 12));
  v_whats   text := nullif(regexp_replace(coalesce(p_cliente_whatsapp, ''), '\D', '', 'g'), '');
  v_nome    text := nullif(trim(coalesce(p_cliente_nome, '')), '');
  v_forma   text;
  v_base    numeric(10,2);
  v_venc    date;
  v_dias    int;
  it        jsonb;
  v_var     record;
  v_qtd     int;
  i         int;
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
  -- no banco o caderninho é gravado como 'fiado'
  v_forma := case when p_forma = 'caderninho' then 'fiado' else p_forma end;
  if p_forma = 'caderninho' and v_nome is null then
    raise exception 'Caderninho: informe o nome de quem vai pagar';
  end if;
  -- WhatsApp brasileiro sem DDI: acrescenta 55
  if v_whats is not null and char_length(v_whats) between 10 and 11 then
    v_whats := '55' || v_whats;
  end if;
  if v_whats is not null and char_length(v_whats) not between 12 and 13 then
    raise exception 'WhatsApp da cliente inválido: use DDD + número';
  end if;

  select * into v_sacola from public.sacolas
   where loja_id = v_loja and status = 'aberta' limit 1;

  insert into public.vendas (loja_id, sacola_id, total, lucro, forma_pagamento, parcelas,
                             cliente_nome, cliente_whatsapp, cobranca_automatica, pago)
  values (v_loja, v_sacola.id, 0, 0, v_forma,
          case when p_forma = 'caderninho' then v_n else 1 end,
          v_nome,
          case when p_forma = 'caderninho' then v_whats end,
          p_forma = 'caderninho' and v_whats is not null and coalesce(p_cobrar_auto, true),
          p_forma <> 'caderninho')
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

  -- Parcelas do caderninho
  if p_forma = 'caderninho' then
    v_base := trunc(v_total / v_n, 2);
    for i in 1..v_n loop
      if coalesce(p_venc_pela_sacola, false) and v_sacola.id is not null then
        -- distribuídas até o fim da sacola (a última vence no prazo de devolução)
        v_dias := greatest(0, v_sacola.devolver_ate - v_hoje);
        v_venc := v_hoje + ceil(v_dias::numeric * i / v_n)::int;
      else
        -- uma por mês a partir da primeira data (padrão: daqui a 30 dias)
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
-- a versão antiga (sem parcelas) deixa de ser chamável
revoke execute on function public.finalizar_venda(jsonb, text, int, text) from public, anon, authenticated;
grant execute on function public.finalizar_venda(jsonb, text, int, text, text, date, boolean, boolean) to authenticated;

-- ─────────────────────────────────────────── agendador (Vercel Cron)
-- O agendador não tem login. Ele chama estas funções com um segredo (CRON_SECRET);
-- o banco guarda só o hash SHA-256 desse segredo, num schema que a API não expõe.

create schema if not exists privado;
revoke all on schema privado from public, anon, authenticated;
create table if not exists privado.config (chave text primary key, valor text not null);
revoke all on privado.config from public, anon, authenticated;

create or replace function privado.segredo_ok(p_segredo text)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(p_segredo, '') <> ''
     and exists (
       select 1 from privado.config
        where chave = 'cron_hash'
          and valor = encode(extensions.digest(p_segredo, 'sha256'), 'hex')
     )
$$;
revoke execute on function privado.segredo_ok(text) from public, anon, authenticated;

-- Lembretes que devem sair hoje (no máximo um por parcela por dia)
create or replace function public.cobrancas_do_dia(p_segredo text)
returns table (
  parcela_id uuid, tipo text, loja_nome text, loja_slug text, wa_instancia text,
  mensagem_modelo text, chave_pix text, cliente_nome text, cliente_whatsapp text,
  numero int, total_parcelas int, valor numeric, vence_em date
)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_hoje date := public.hoje_brasil();
begin
  if not privado.segredo_ok(p_segredo) then
    raise exception 'não autorizado' using errcode = '42501';
  end if;
  return query
  select p.id,
         case when p.vence_em > v_hoje then 'antes'
              when p.vence_em = v_hoje then 'hoje'
              else 'atrasada' end,
         l.nome, l.slug, l.wa_instancia, l.cobranca_mensagem, l.chave_pix,
         v.cliente_nome, v.cliente_whatsapp, p.numero, p.total_parcelas, p.valor, p.vence_em
    from public.parcelas p
    join public.vendas v on v.id = p.venda_id
    join public.lojas  l on l.id = p.loja_id
   where p.pago_em is null
     and v.cobranca_automatica
     and v.cliente_whatsapp is not null
     and l.cobranca_ativa
     and l.wa_instancia is not null
     and (p.ultimo_lembrete_em is null or p.ultimo_lembrete_em < v_hoje)
     and (
           -- X dias antes do vencimento
           (l.cobranca_dias_antes > 0 and p.vence_em - l.cobranca_dias_antes = v_hoje)
           -- no dia do vencimento
        or p.vence_em = v_hoje
           -- depois de vencida: repete a cada N dias, até o limite
        or (p.vence_em < v_hoje
            and p.lembretes_atraso < l.cobranca_max_atraso
            and v_hoje - greatest(p.vence_em, coalesce(p.ultimo_lembrete_em, p.vence_em)) >= l.cobranca_repetir_dias)
         )
   order by l.id, p.vence_em
   limit 200;
end;
$$;
revoke execute on function public.cobrancas_do_dia(text) from public, authenticated;
grant execute on function public.cobrancas_do_dia(text) to anon;

create or replace function public.registrar_cobranca(p_segredo text, p_parcela uuid, p_tipo text)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not privado.segredo_ok(p_segredo) then
    raise exception 'não autorizado' using errcode = '42501';
  end if;
  update public.parcelas
     set ultimo_lembrete_em = public.hoje_brasil(),
         lembretes = lembretes + 1,
         lembretes_atraso = lembretes_atraso + case when p_tipo = 'atrasada' then 1 else 0 end
   where id = p_parcela and pago_em is null;
end;
$$;
revoke execute on function public.registrar_cobranca(text, uuid, text) from public, authenticated;
grant execute on function public.registrar_cobranca(text, uuid, text) to anon;

-- Para ligar o agendador, rode uma vez (fora do repositório), trocando pelo seu CRON_SECRET:
--   insert into privado.config (chave, valor)
--   values ('cron_hash', encode(extensions.digest('SEU_CRON_SECRET', 'sha256'), 'hex'))
--   on conflict (chave) do update set valor = excluded.valor;
