/**
 * Lanceur de tests minimaliste : esbuild bundle chaque suite, Node l'exécute.
 * Pas de framework — les suites s'auto-vérifient et sortent en code 1 en cas
 * d'échec. Objectif : garder la chaîne de dépendances courte pour un projet
 * dont le principal atout est de n'avoir aucune dépendance à l'exécution.
 *
 *   npm test
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TESTS = join(ROOT, 'tests')
const ESBUILD = join(ROOT, 'node_modules', '.bin', 'esbuild')

const out = mkdtempSync(join(tmpdir(), 'card-holder-tests-'))
let failed = 0

try {
  const files = readdirSync(TESTS)
    .filter((f) => f.endsWith('.test.ts'))
    .sort()

  for (const file of files) {
    const bundle = join(out, `${basename(file, '.ts')}.mjs`)
    execFileSync(ESBUILD, [join(TESTS, file), '--bundle', '--platform=node', '--format=esm', `--outfile=${bundle}`, '--log-level=error'], {
      stdio: 'inherit',
    })
    process.stdout.write(`${basename(file, '.test.ts').padEnd(12)} `)
    try {
      execFileSync(process.execPath, [bundle], { stdio: 'inherit' })
    } catch {
      failed++
    }
  }

  console.log(failed === 0 ? `\n${files.length} suites : toutes vertes.` : `\n${failed} suite(s) en échec.`)
} finally {
  rmSync(out, { recursive: true, force: true })
}

process.exit(failed === 0 ? 0 : 1)
