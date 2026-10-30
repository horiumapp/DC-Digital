/**
 * Compila o crate `dc_rules` para WASM (bundler target) em `src/wasm/dc_rules`.
 * Requer: rustup + wasm32-unknown-unknown + wasm-pack.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const crateDir = path.join(root, 'crates', 'dc_rules');
const outDir = path.join(root, 'src', 'wasm', 'dc_rules');

const cargoBin = path.join(process.env.USERPROFILE || process.env.HOME || '', '.cargo', 'bin');
const pathEnv = `${cargoBin}${path.delimiter}${process.env.PATH || ''}`;

function resolveWasmPack() {
  const exe = process.platform === 'win32' ? 'wasm-pack.exe' : 'wasm-pack';
  const candidate = path.join(cargoBin, exe);
  if (fs.existsSync(candidate)) return candidate;
  return 'wasm-pack';
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, PATH: pathEnv },
    ...opts,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const wasmPack = resolveWasmPack();
const which = spawnSync(wasmPack, ['--version'], {
  env: { ...process.env, PATH: pathEnv },
  encoding: 'utf8',
});

if (which.status !== 0) {
  console.error(
    '[dc_rules] wasm-pack não encontrado. Instale Rust (rustup) e rode: cargo install wasm-pack'
  );
  console.error(which.stderr || which.error || which.stdout || '');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

run(wasmPack, [
  'build',
  crateDir,
  '--target',
  'web',
  '--release',
  '--out-dir',
  outDir,
  '--out-name',
  'dc_rules',
]);

// Evita publicar o pacote gerado no npm registry por engano.
const pkgJsonPath = path.join(outDir, 'package.json');
if (fs.existsSync(pkgJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
  pkg.private = true;
  fs.writeFileSync(pkgJsonPath, `${JSON.stringify(pkg, null, 2)}\n`);
}

// wasm-pack cria um .gitignore local; removemos para versionar o artefato WASM.
for (const name of ['.gitignore', 'README.md']) {
  const p = path.join(outDir, name);
  if (fs.existsSync(p)) fs.unlinkSync(p);
}

// Tipagem mínima para o loader TS (wasm-pack gera .d.ts, reforçamos o módulo).
fs.writeFileSync(
  path.join(outDir, 'dc_rules.js.d.ts'),
  `declare const init: (module_or_path?: unknown) => Promise<unknown>;
export default init;
export function classificarEtapaFrequencia(partesJson: string): string;
export function momentoDoAnoLetivo(hojeIso: string, dataFimIso: string): string;
export function arredondarPercentualParaExibicao(valor: number): string;
export function calcularFrequenciaLdb(entradaJson: string): string;
export function definirSituacaoPeriodo(entradaJson: string): string;
export function historicoAposAlteracao(anteriorJson: string, novoJson: string, em: string): string;
`
);

console.log(`[dc_rules] WASM gerado em ${path.relative(root, outDir)}`);
