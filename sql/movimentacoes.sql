-- Execute este script no SQL Editor do Supabase para habilitar
-- entradas, saídas e transferências de estoque.

create or replace function public.atualizar_estoque(
  p_item_id uuid,
  p_origem_id uuid,
  p_destino_id uuid,
  p_quantidade integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  origem_saldo integer;
begin
  if auth.uid() is null then
    raise exception 'Usuário não autenticado.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('operador', 'admin')
  ) then
    raise exception 'Usuário sem permissão para movimentar estoque.';
  end if;

  if p_quantidade is null or p_quantidade <= 0 then
    raise exception 'A quantidade deve ser maior que zero.';
  end if;

  if p_origem_id is not null and p_origem_id = p_destino_id then
    raise exception 'A origem e o destino devem ser diferentes.';
  end if;

  if p_origem_id is not null then
    select quantidade
      into origem_saldo
      from public.estoque_itens
     where item_id = p_item_id
       and estoque_id = p_origem_id
     for update;

    if coalesce(origem_saldo, 0) < p_quantidade then
      raise exception 'Saldo insuficiente no local de origem.';
    end if;

    update public.estoque_itens
       set quantidade = quantidade - p_quantidade
     where item_id = p_item_id
       and estoque_id = p_origem_id;
  end if;

  if p_destino_id is not null then
    insert into public.estoque_itens (item_id, estoque_id, quantidade)
    values (p_item_id, p_destino_id, p_quantidade)
    on conflict (item_id, estoque_id)
    do update set quantidade = public.estoque_itens.quantidade + excluded.quantidade;
  end if;
end;
$$;

revoke all on function public.atualizar_estoque(uuid, uuid, uuid, integer) from public;
grant execute on function public.atualizar_estoque(uuid, uuid, uuid, integer) to authenticated;