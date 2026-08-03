function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function encodeStoragePath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function normalizeStorageValue(value: string | null | undefined) {
  return (value ?? "").trim().replace(/^\/+/, "");
}

function sanitizeFileName(fileName: string) {
  const normalized = fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "arquivo";
}

export function getSupabaseStorageBucket() {
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim();

  if (!bucket || bucket.includes("your-") || bucket.includes("example")) {
    return null;
  }

  return bucket;
}

export function isSupabaseStoragePath(value: string | null | undefined) {
  const normalized = normalizeStorageValue(value);
  return Boolean(normalized) && !isAbsoluteUrl(normalized);
}

export function resolveSupabaseStoragePublicUrl(value: string | null | undefined) {
  const normalized = normalizeStorageValue(value);

  if (!normalized) {
    return null;
  }

  if (isAbsoluteUrl(normalized)) {
    return normalized;
  }

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const bucket = getSupabaseStorageBucket();

  if (!baseUrl || !bucket) {
    return null;
  }

  return `${baseUrl}/storage/v1/object/public/${bucket}/${encodeStoragePath(normalized)}`;
}

type StorageClientLike = {
  storage: {
    from: (bucket: string) => {
      upload: (path: string, body: ArrayBuffer, options?: { contentType?: string; upsert?: boolean }) => Promise<{ error: { message: string } | null }>;
      createSignedUrl: (path: string, expiresIn: number) => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>;
      list: (path?: string, options?: { limit?: number }) => Promise<{ data: unknown[] | null; error: { message: string } | null }>;
    };
  };
};

export async function uploadFileToSupabaseStorage(supabase: StorageClientLike, file: File, folder = "itens") {
  const bucket = getSupabaseStorageBucket();

  if (!bucket) {
    throw new Error("Defina NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET para enviar arquivos ao Supabase Storage.");
  }

  const sanitizedName = sanitizeFileName(file.name);
  const filePath = `${folder}/${Date.now()}-${sanitizedName}`;
  const fileBuffer = await file.arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(filePath, fileBuffer, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) {
    throw new Error(`Falha no upload do arquivo: ${error.message}`);
  }

  return filePath;
}

export async function resolveSupabaseAssetUrl(supabase: StorageClientLike, value: string | null | undefined, expiresIn = 3600) {
  const normalized = normalizeStorageValue(value);

  if (!normalized) {
    return null;
  }

  if (isAbsoluteUrl(normalized)) {
    return normalized;
  }

  const bucket = getSupabaseStorageBucket();

  if (!bucket) {
    return null;
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(normalized, expiresIn);

  if (error) {
    return resolveSupabaseStoragePublicUrl(normalized);
  }

  return data?.signedUrl ?? resolveSupabaseStoragePublicUrl(normalized);
}