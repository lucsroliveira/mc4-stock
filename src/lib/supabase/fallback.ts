type SupabaseError = {
  message: string;
};

type CookieStore = {
  get?: (name: string) => { value?: string } | undefined;
  getAll?: () => Array<{ name: string; value: string }>;
  set?: (name: string, value: string, options?: Record<string, unknown>) => void;
  delete?: (name: string) => void;
};

type DemoUser = {
  id: string;
  email: string;
  name: string;
};

type MockRow = Record<string, unknown>;

const AUTH_COOKIE_NAME = "mc4-demo-auth";

function createError(message: string): SupabaseError {
  return { message };
}

function getCookieValue(cookieStore?: CookieStore): string | null {
  if (!cookieStore) {
    if (typeof window === "undefined") {
      return null;
    }

    return window.localStorage.getItem(AUTH_COOKIE_NAME);
  }

  if (cookieStore.get) {
    const cookie = cookieStore.get(AUTH_COOKIE_NAME);
    return cookie?.value ?? null;
  }

  const cookies = cookieStore.getAll?.() ?? [];
  const entry = cookies.find((item) => item.name === AUTH_COOKIE_NAME);
  return entry?.value ?? null;
}

function setCookieValue(cookieStore: CookieStore | undefined, value: string | null) {
  if (!cookieStore) {
    if (typeof window !== "undefined") {
      if (value) {
        window.localStorage.setItem(AUTH_COOKIE_NAME, value);
      } else {
        window.localStorage.removeItem(AUTH_COOKIE_NAME);
      }
    }

    return;
  }

  if (cookieStore.set) {
    if (value) {
      cookieStore.set(AUTH_COOKIE_NAME, value, { path: "/" });
    } else if (cookieStore.delete) {
      cookieStore.delete(AUTH_COOKIE_NAME);
    }

    return;
  }

  if (cookieStore.delete && !value) {
    cookieStore.delete(AUTH_COOKIE_NAME);
  }
}

function getStoredUser(cookieStore?: CookieStore): DemoUser | null {
  const rawValue = getCookieValue(cookieStore);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as DemoUser;
    return parsed?.email ? parsed : null;
  } catch {
    return null;
  }
}

function persistUser(cookieStore: CookieStore | undefined, user: DemoUser | null) {
  if (!user) {
    setCookieValue(cookieStore, null);
    return;
  }

  setCookieValue(cookieStore, JSON.stringify(user));
}

const mockData = {
  itens: [
    { id: "1", nome: "Cabo HDMI 3m", categoria: "Cabos", cliente: "MC4", descricao: "Kit de cabos para operação", foto_url: null },
    { id: "2", nome: "Bateria Portátil", categoria: "Energia", cliente: "MC4", descricao: "Backup de energia", foto_url: null },
    { id: "3", nome: "Roteador 5G", categoria: "Redes", cliente: "MC4", descricao: "Conectividade móvel", foto_url: null },
  ],
  estoques: [
    { id: "1", nome: "Depósito Central", tipo: "Armazém", responsavel: "Ana Paula", contato: "11999990001", endereco: "Rua A, 100" },
    { id: "2", nome: "Loja A", tipo: "Ponto de venda", responsavel: "Bruno Costa", contato: "11999990002", endereco: "Rua B, 220" },
    { id: "3", nome: "Veículo 01", tipo: "Transporte", responsavel: "Camila Souza", contato: "11999990003", endereco: "Placa ABC-1234" },
  ],
  movimentacoes: [
    {
      data_movimentacao: "2026-07-29T08:30:00.000Z",
      tipo: "entrada",
      quantidade: 8,
      itens: { nome: "Cabo HDMI 3m" },
      origem: { nome: "Depósito Central" },
      destino: { nome: "Loja A" },
    },
    {
      data_movimentacao: "2026-07-28T16:10:00.000Z",
      tipo: "saida",
      quantidade: 3,
      itens: { nome: "Bateria Portátil" },
      origem: { nome: "Loja A" },
      destino: { nome: "Veículo 01" },
    },
    {
      data_movimentacao: "2026-07-27T10:40:00.000Z",
      tipo: "transferencia",
      quantidade: 2,
      itens: { nome: "Roteador 5G" },
      origem: { nome: "Depósito Central" },
      destino: { nome: "Veículo 01" },
    },
  ],
  estoque_itens: [
    { quantidade: 12, itens: { nome: "Cabo HDMI 3m", cliente: "MC4" } },
    { quantidade: 6, itens: { nome: "Bateria Portátil", cliente: "MC4" } },
    { quantidade: 4, itens: { nome: "Roteador 5G", cliente: "MC4" } },
  ],
};

class MockQueryBuilder {
  private selectArgs: unknown[] = [];
  private limitValue?: number;
  private eqValue?: { column: string; value: unknown };
  private countOnly = false;
  private headOnly = false;

  constructor(private readonly table: string) {}

  select(...args: unknown[]) {
    this.selectArgs = args;
    const options = args[1] as { count?: string; head?: boolean } | undefined;
    this.countOnly = options?.count === "exact";
    this.headOnly = Boolean(options?.head);
    return this;
  }

  order(..._args: unknown[]) {
    return this;
  }

  limit(value: number) {
    this.limitValue = value;
    return this;
  }

  eq(column: string, value: unknown) {
    this.eqValue = { column, value };
    return this;
  }

  delete() {
    return this;
  }

  insert(_values: unknown) {
    return Promise.resolve({ data: null, error: null });
  }

  update(_values: unknown) {
    return Promise.resolve({ data: null, error: null });
  }

  then(resolve: (value: unknown) => unknown) {
    return Promise.resolve(this.build()).then(resolve);
  }

  catch(reject: (reason?: unknown) => unknown) {
    return Promise.resolve(this.build()).catch(reject);
  }

  finally(callback: () => void) {
    return Promise.resolve(this.build()).finally(callback);
  }

  private build() {
    const rows = this.getRows();

    if (this.countOnly || this.headOnly) {
      return { data: [], error: null, count: rows.length };
    }

    return { data: rows, error: null, count: rows.length };
  }

  private getRows(): MockRow[] {
    const tableData = this.table === "itens"
      ? mockData.itens
      : this.table === "estoques"
        ? mockData.estoques
        : this.table === "movimentacoes"
          ? mockData.movimentacoes
          : this.table === "estoque_itens"
            ? mockData.estoque_itens
            : [];

    let rows: MockRow[] = [...tableData];

    if (this.eqValue) {
      rows = rows.filter((row: MockRow) => {
        const column = this.eqValue!.column as keyof MockRow;
        return row[column] === this.eqValue!.value;
      });
    }

    if (this.limitValue) {
      rows = rows.slice(0, this.limitValue);
    }

    return rows;
  }
}

export function hasSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !key) {
    return false;
  }

  return !url.includes("your-project") && !key.includes("your-anon-key");
}

export function shouldUseFallbackSupabase() {
  return process.env.NODE_ENV !== "production" && !hasSupabaseConfig();
}

export function createFallbackSupabaseClient(cookieStore?: CookieStore) {
  return {
    auth: {
      getUser: async () => {
        const demoUser = getStoredUser(cookieStore);
        return { data: { user: demoUser ? { id: demoUser.id, email: demoUser.email } : null }, error: null };
      },
      signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
        if (!email || !password) {
          return {
            data: { user: null, session: null },
            error: createError("Informe e-mail e senha para continuar."),
          };
        }

        const demoUser: DemoUser = {
          id: "demo-user",
          email,
          name: email.split("@")[0],
        };

        persistUser(cookieStore, demoUser);

        return {
          data: { user: demoUser, session: { access_token: "demo-token" } },
          error: null,
        };
      },
      signOut: async () => {
        persistUser(cookieStore, null);
        return { error: null };
      },
    },
    from(table: string) {
      return new MockQueryBuilder(table);
    },
    rpc: async () => ({ data: null, error: createError("Supabase não configurado. O modo demonstração está ativo.") }),
  };
}
