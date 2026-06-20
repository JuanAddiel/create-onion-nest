# create-onion-nest

Create a NestJS API shaped around Onion/Clean Architecture in one command.

```bash
npm create onion-nest@latest my-api
# or
npx create-onion-nest my-api
```

The generated app separates business rules from framework details:

- `src/domain` for entities and repository contracts
- `src/application` for use cases and orchestration
- `src/infrastructure` for persistence and external adapters
- `src/presentation` for NestJS controllers/modules
- `src/shared` for cross-cutting primitives

## Usage

```bash
create-onion-nest <project-name> [--cwd <parent-dir>]
create-onion-nest module <name> [--cwd <project-dir>]
```

Examples:

```bash
npx create-onion-nest my-api
cd my-api
npm install
npm run start:dev

npx create-onion-nest module billing --cwd ./my-api
```

The project command is non-interactive. Use `--cwd` to choose the parent directory when running from another location. It validates that the target directory does not already contain files, copies the template, renames `_gitignore` to `.gitignore`, and replaces package-name tokens.

The module command adds a small vertical slice to an existing generated project:

- `src/domain/entities/<name>.entity.ts`
- `src/domain/repositories/<name>.repository.ts`
- `src/application/use-cases/get-<name>.use-case.ts`
- `src/infrastructure/persistence/in-memory-<name>.repository.ts`
- `src/presentation/controllers/<name>.controller.ts`
- `src/presentation/<name>.module.ts`

It also imports the new module in `src/app.module.ts` when the file matches the generated app shape.

## Generated Project Commands

```bash
npm run build
npm run start
npm run start:dev
npm test
npm run lint
```

## Publishing This Package

```bash
npm install
npm run build
npm pack --dry-run
npm publish --access public
```

`prepublishOnly` runs a clean TypeScript build. The npm package includes only `dist`, `templates`, `README.md`, and `LICENSE`.

## Requirements

- Node.js 20 or newer
- npm 9 or newer recommended

## License

MIT
# create-onion-nest
