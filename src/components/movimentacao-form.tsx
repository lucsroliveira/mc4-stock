"use client";

import { useMemo, useState } from "react";
import { createMovimentacao } from "@/lib/supabase/actions";

type ItemOption = {
  id: string;
  nome: string | null;
};

type EstoqueOption = {
  id: string;
  nome: string | null;
};

type BalanceOption = {
  item_id: string;
  estoque_id: string;
  quantidade: number;
  estoque_nome: string | null;
};

type MovimentacaoFormProps = {
  itemRows: ItemOption[];
  estoqueRows: EstoqueOption[];
  balances: BalanceOption[];
};

export function MovimentacaoForm({ itemRows, estoqueRows, balances }: MovimentacaoFormProps) {
  const [tipo, setTipo] = useState("transferencia");
  const [itemId, setItemId] = useState("");
  const [origemId, setOrigemId] = useState("");
  const [destinoId, setDestinoId] = useState("");

  const selectedItemBalances = useMemo(() => balances.filter((entry) => entry.item_id === itemId), [balances, itemId]);
  const currentOriginBalance = selectedItemBalances.find((entry) => entry.estoque_id === origemId)?.quantidade ?? 0;
  const origemNome = estoqueRows.find((estoque) => estoque.id === origemId)?.nome ?? "o local selecionado";
  const destinoNome = estoqueRows.find((estoque) => estoque.id === destinoId)?.nome ?? "o destino selecionado";

  const isEntrada = tipo === "entrada";
  const isSaida = tipo === "saida";
  const isTransferencia = tipo === "transferencia";

  return (
    <form action={createMovimentacao} className="mt-6 grid gap-4 md:grid-cols-2">
      <select
        name="item_id"
        value={itemId}
        onChange={(event) => {
          setItemId(event.target.value);
          setOrigemId("");
          setDestinoId("");
        }}
        className="mc4-form-select rounded-2xl px-4 py-3 text-sm md:col-span-2"
        required
      >
        <option value="" disabled>
          Selecione o item
        </option>
        {itemRows.map((item) => (
          <option key={item.id} value={item.id}>
            {item.nome}
          </option>
        ))}
      </select>

      <select
        name="tipo"
        value={tipo}
        onChange={(event) => {
          const nextType = event.target.value;
          setTipo(nextType);

          if (nextType === "entrada") {
            setOrigemId("");
          }

          if (nextType === "saida") {
            setDestinoId("");
          }
        }}
        className="mc4-form-select rounded-2xl px-4 py-3 text-sm"
        required
      >
        <option value="transferencia">Transferência</option>
        <option value="entrada">Entrada</option>
        <option value="saida">Saída</option>
      </select>

      <input
        name="quantidade"
        type="number"
        min="1"
        max={isSaida && origemId ? currentOriginBalance : undefined}
        placeholder="Quantidade"
        className="mc4-form-input rounded-2xl px-4 py-3 text-sm"
        required
      />

      <select
        name="origem_id"
        value={origemId}
        onChange={(event) => setOrigemId(event.target.value)}
        className="mc4-form-select rounded-2xl px-4 py-3 text-sm"
        disabled={isEntrada}
      >
        <option value="">{isEntrada ? "Origem não usada em entrada" : "Origem opcional"}</option>
        {estoqueRows.map((estoque) => (
          <option key={estoque.id} value={estoque.id}>
            {estoque.nome}
          </option>
        ))}
      </select>

      <select
        name="destino_id"
        value={destinoId}
        onChange={(event) => setDestinoId(event.target.value)}
        className="mc4-form-select rounded-2xl px-4 py-3 text-sm"
        disabled={isSaida}
      >
        <option value="">{isSaida ? "Destino não usado em saída" : "Destino opcional"}</option>
        {estoqueRows.map((estoque) => (
          <option key={estoque.id} value={estoque.id}>
            {estoque.nome}
          </option>
        ))}
      </select>

      {itemId ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300 md:col-span-2">
          {isEntrada ? (
            <p>Entrada registrada no destino escolhido e o saldo será somado ao local informado.</p>
          ) : (
            <p>
              Saldo atual em {origemNome}: <span className="font-semibold text-white">{currentOriginBalance}</span> unidade(s).
            </p>
          )}
          {isTransferencia && destinoId ? (
            <p className="mt-2">
              Saldo atual em {destinoNome}: <span className="font-semibold text-white">{currentOriginBalance}</span> unidade(s).
            </p>
          ) : null}
          {isSaida && !origemId ? <p className="mt-2">Escolha a origem para validar o saldo disponível antes de salvar.</p> : null}
        </div>
      ) : null}

      <textarea name="observacao" rows={3} placeholder="Motivo / observação" className="mc4-form-textarea rounded-2xl px-4 py-3 text-sm md:col-span-2" required />

      <div className="md:col-span-2">
        <button type="submit" className="mc4-btn-primary rounded-2xl px-5 py-3 text-sm font-semibold transition">
          Confirmar movimentação
        </button>
      </div>
    </form>
  );
}
