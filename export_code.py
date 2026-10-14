import os
import sys

# Diretório que não devem ser processados
EXCLUDED_DIRS = {
    'node_modules', '.next', '.git', '.vercel', 'out', 'dist', 'build', 'coverage', '__pycache__', '.idea', '.vscode'
}

# Arquivos e segredos que não devem ser exportados
EXCLUDED_FILES = {
    'package-lock.json',   'yarn.lock', 'pnpm-lock.yaml', 'frontend.txt', 'backend.txt', 'export_code.py', 'export-code.ps1'
}

# Arquivos binários ou mídias
EXCLUDED_EXTENSIONS = {
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg', '.webp', '.pdf', '.zip', '.tar', '.gz', '.exe', '.dll', '.so', '.dylib', '.woff', '.woff2', '.ttf', '.eot' 
}

# Separação por extensão de arquivo
FRONTEND_EXTENSIONS = {
    '.tsx', '.jsx', '.css', '.scss', '.sass', '.html'
}
BACKEND_EXTENSIONS = {
    '.ts', '.js', '.mjs', '.cjs', '.sql'
}

def is_excluded(file_name: str) -> bool:
    """Verifica se o arquivo ou extensão deve ser ignordado"""
    if file_name in EXCLUDED_FILES or file_name.startswith('.env'): 
        return True 
    _, ext = os.path.splitext(file_name) 
    if ext.lower() in EXCLUDED_EXTENSIONS: 
        return True 
    return False

def collect_files(root_dir: str):
    """Varre o diretório e separa os arquivos entre frontend e backend."""
    frontend_files = []
    backend_files = []

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Ignora pastas de dependências e builds
        dirnames[:] = [d for d in dirnames if d not in EXCLUDED_DIRS]

        for filename in filenames:
            if is_excluded(filename):
                continue

            full_path = os.path.join(dirpath, filename)
            rel_path = os.path.relpath(full_path, root_dir)
            _, ext = os.path.splitext(filename)
            ext = ext.lower()

            if ext in FRONTEND_EXTENSIONS:
                frontend_files.append((rel_path, full_path))
            elif ext in BACKEND_EXTENSIONS:
                backend_files.append((rel_path, full_path))

    return frontend_files, backend_files

def write_code_dump(file_list, output_path: str):
    """Grava o conteúdo dos arquivos nos dumps .txt correspondentes."""
    with open(output_path, 'w', encoding='utf-8', errors='ignore') as out_file:
        for rel_path, full_path in sorted(file_list, key=lambda x: x):
            out_file.write(f"===== {rel_path} =====\n")
            try:
                with open(full_path, 'r', encoding='utf-8', errors='ignore') as in_file:
                    out_file.write(in_file.read())
            except Exception as e:
                out_file.write(f"/* Erro ao ler arquivo: {e} */")
            out_file.write("\n\n")

def main():
    root_dir = os.getcwd() if len(sys.argv) < 2 else sys.argv
    
    print(f"🔍 Escaneando o projeto em: {root_dir}")
    frontend_files, backend_files = collect_files(root_dir)

    frontend_out = os.path.join(root_dir, 'frontend.txt')
    backend_out = os.path.join(root_dir, 'backend.txt')

    write_code_dump(frontend_files, frontend_out)
    write_code_dump(backend_files, backend_out)

    print("\n✅ Concluído com sucesso!")
    print(f"🎨 Frontend: {len(frontend_files)} arquivo(s) -> {frontend_out}")
    print(f"⚙️  Backend:  {len(backend_files)} arquivo(s) -> {backend_out}")

if __name__ == '__main__':
    main()
