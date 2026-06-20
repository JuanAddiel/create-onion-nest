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

This repository includes a manual GitHub Action for versioned uploads to npm. You decide the version when you run the workflow.

### Versioned Release Action

Architecture:

- GitHub Actions is the release entry point.
- `workflow_dispatch` asks for the exact `version` and npm tag.
- `npm version <version>` updates `package.json` and `package-lock.json`, then creates the release commit and Git tag.
- `npm run build` verifies the TypeScript package before publishing.
- `npm publish --access public --tag <tag>` uploads the package to npm.
- The workflow pushes the release commit and tag back to GitHub.

Required setup:

1. Create an npm access token with publish permissions.
2. Add it in GitHub as repository secret `NPM_TOKEN`.
3. Make sure GitHub Actions has write permission for repository contents.

How to use it:

1. Go to GitHub > Actions > Release > Run workflow.
2. Write the version you want to publish, for example `1.2.0`.
3. Pick the npm tag, usually `latest`.
4. Run the workflow.

If a published version needs a fix, publish a new patch version. For example, if `1.2.0` had a bug, fix the code and run the workflow with `1.2.1`. npm does not allow publishing the exact same version twice.

Use semantic versions like this:

- `1.2.0`: new minor feature or planned upload.
- `1.2.1`: fix for the same release line.
- `2.0.0`: breaking change.

Manual publish is still possible:

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
