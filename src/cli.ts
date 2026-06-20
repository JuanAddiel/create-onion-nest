#!/usr/bin/env node
import { constants } from 'node:fs';
import { access, cp, mkdir, readdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface ParsedArgs {
  command: 'create' | 'module' | 'help' | 'version';
  name?: string;
  cwd?: string;
}

interface ModuleNames {
  raw: string;
  kebab: string;
  pascal: string;
  camel: string;
}

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const templateRoot = path.join(packageRoot, 'templates', 'default');
const textExtensions = new Set([
  '.json',
  '.md',
  '.ts',
  '.js',
  '.yml',
  '.yaml',
  '.gitignore',
  '.env',
  '.prettierrc',
  '.eslintrc'
]);

main(process.argv.slice(2)).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`create-onion-nest: ${message}`);
  process.exitCode = 1;
});

async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv);

  if (args.command === 'help') {
    printHelp();
    return;
  }

  if (args.command === 'version') {
    await printVersion();
    return;
  }

  if (!args.name) {
    throw new Error('missing project or module name. Run `create-onion-nest --help`.');
  }

  if (args.command === 'module') {
    await generateModule(args.name, path.resolve(args.cwd ?? process.cwd()));
    return;
  }

  await createProject(args.name, path.resolve(args.cwd ?? process.cwd()));
}

function parseArgs(argv: string[]): ParsedArgs {
  const [first, second, ...rest] = argv;

  if (!first || first === '--help' || first === '-h') {
    return { command: 'help' };
  }

  if (first === '--version' || first === '-v') {
    return { command: 'version' };
  }

  if (first === 'module') {
    const options = parseOptions(rest);
    return { command: 'module', name: second, cwd: options.cwd };
  }

  const options = parseOptions([second, ...rest].filter(Boolean));
  return { command: 'create', name: first, cwd: options.cwd };
}

function parseOptions(args: string[]): { cwd?: string } {
  let cwd: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--cwd') {
      const value = args[index + 1];
      if (!value) {
        throw new Error('missing value for --cwd.');
      }
      cwd = value;
      index += 1;
      continue;
    }

    if (arg.startsWith('--cwd=')) {
      cwd = arg.slice('--cwd='.length);
      continue;
    }

    throw new Error(`unknown option: ${arg}`);
  }

  return { cwd };
}

async function printVersion(): Promise<void> {
  const packageJson = JSON.parse(await readFile(path.join(packageRoot, 'package.json'), 'utf8')) as { version?: string };
  console.log(packageJson.version ?? '0.0.0');
}

function printHelp(): void {
  console.log(`create-onion-nest

Usage:
  create-onion-nest <project-name> [--cwd <parent-dir>]
  create-onion-nest module <name> [--cwd <project-dir>]

Examples:
  npx create-onion-nest my-api
  create-onion-nest module billing --cwd ./my-api
`);
}

async function createProject(projectName: string, cwd: string): Promise<void> {
  validateProjectName(projectName);

  const targetDir = path.resolve(cwd, projectName);
  await ensureCreatableDirectory(targetDir);
  await cp(templateRoot, targetDir, { recursive: true, errorOnExist: false, force: false });
  await renameTemplateGitignore(targetDir);
  await replaceTemplateTokens(targetDir, {
    __PROJECT_NAME__: projectName,
    __PROJECT_TITLE__: toTitle(projectName)
  });

  console.log(`Created ${projectName} at ${targetDir}`);
  console.log('Next steps:');
  console.log(`  cd ${projectName}`);
  console.log('  npm install');
  console.log('  npm run start:dev');
}

async function ensureCreatableDirectory(targetDir: string): Promise<void> {
  try {
    const targetStat = await stat(targetDir);
    if (!targetStat.isDirectory()) {
      throw new Error(`target path exists and is not a directory: ${targetDir}`);
    }

    const entries = await readdir(targetDir);
    if (entries.length > 0) {
      throw new Error(`target directory is not empty: ${targetDir}`);
    }
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      await mkdir(targetDir, { recursive: true });
      return;
    }
    throw error;
  }
}

async function renameTemplateGitignore(targetDir: string): Promise<void> {
  const templateGitignore = path.join(targetDir, '_gitignore');
  try {
    await rename(templateGitignore, path.join(targetDir, '.gitignore'));
  } catch (error: unknown) {
    if (!isNodeError(error) || error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function replaceTemplateTokens(dir: string, tokens: Record<string, string>): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });

  await Promise.all(entries.map(async (entry) => {
    const currentPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await replaceTemplateTokens(currentPath, tokens);
      return;
    }

    if (!entry.isFile() || !isTextTemplateFile(currentPath)) {
      return;
    }

    let content = await readFile(currentPath, 'utf8');
    for (const [token, value] of Object.entries(tokens)) {
      content = content.split(token).join(value);
    }
    await writeFile(currentPath, content, 'utf8');
  }));
}

function isTextTemplateFile(filePath: string): boolean {
  const basename = path.basename(filePath);
  return textExtensions.has(path.extname(filePath)) || textExtensions.has(basename);
}

async function generateModule(moduleName: string, projectDir: string): Promise<void> {
  const names = getModuleNames(moduleName);
  await ensureGeneratedProject(projectDir);

  const files = getModuleFiles(names);
  for (const file of files) {
    await ensureFileDoesNotExist(path.join(projectDir, file.path));
  }

  const updatedAppModule = await getUpdatedAppModule(projectDir, names);

  for (const file of files) {
    const fullPath = path.join(projectDir, file.path);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, { encoding: 'utf8', flag: 'wx' });
  }

  await writeFile(path.join(projectDir, 'src/app.module.ts'), updatedAppModule, 'utf8');
  console.log(`Added ${names.kebab} module to ${projectDir}`);
}

async function ensureGeneratedProject(projectDir: string): Promise<void> {
  const requiredPaths = [
    'src/domain',
    'src/application',
    'src/infrastructure',
    'src/presentation',
    'src/shared',
    'src/app.module.ts'
  ];

  for (const requiredPath of requiredPaths) {
    const fullPath = path.join(projectDir, requiredPath);
    try {
      await access(fullPath, constants.F_OK);
    } catch {
      throw new Error(`not a generated onion Nest project, missing ${requiredPath}`);
    }
  }
}

async function ensureFileDoesNotExist(filePath: string): Promise<void> {
  try {
    await access(filePath, constants.F_OK);
  } catch {
    return;
  }
  throw new Error(`refusing to overwrite existing file: ${filePath}`);
}

async function getUpdatedAppModule(projectDir: string, names: ModuleNames): Promise<string> {
  const appModulePath = path.join(projectDir, 'src/app.module.ts');
  let content = await readFile(appModulePath, 'utf8');
  const importLine = `import { ${names.pascal}Module } from './presentation/${names.kebab}.module';`;

  if (!content.includes(importLine)) {
    content = `${importLine}\n${content}`;
  }

  const importsEntry = `${names.pascal}Module`;
  if (content.includes(`imports: [${importsEntry}`) || content.includes(`, ${importsEntry}`)) {
    return content;
  }

  let updated = false;
  content = content.replace(/imports:\s*\[([^\]]*)\]/m, (_match, existing: string) => {
    updated = true;
    const trimmed = existing.trim();
    return `imports: [${trimmed ? `${trimmed}, ` : ''}${importsEntry}]`;
  });

  if (!updated) {
    throw new Error('could not update src/app.module.ts imports array. Add the module manually or restore the generated AppModule shape.');
  }

  return content;
}

function getModuleFiles(names: ModuleNames): Array<{ path: string; content: string }> {
  return [
    {
      path: `src/domain/entities/${names.kebab}.entity.ts`,
      content: `export class ${names.pascal} {\n  constructor(\n    public readonly id: string,\n    public readonly name: string\n  ) {}\n}\n`
    },
    {
      path: `src/domain/repositories/${names.kebab}.repository.ts`,
      content: `import { ${names.pascal} } from '../entities/${names.kebab}.entity';\n\nexport const ${names.pascal}Repository = Symbol('${names.pascal}Repository');\n\nexport interface ${names.pascal}Repository {\n  findAll(): Promise<${names.pascal}[]>;\n}\n`
    },
    {
      path: `src/application/use-cases/get-${names.kebab}.use-case.ts`,
      content: `import { Inject, Injectable } from '@nestjs/common';\nimport { ${names.pascal} } from '../../domain/entities/${names.kebab}.entity';\nimport { ${names.pascal}Repository } from '../../domain/repositories/${names.kebab}.repository';\n\n@Injectable()\nexport class Get${names.pascal}UseCase {\n  constructor(\n    @Inject(${names.pascal}Repository)\n    private readonly repository: ${names.pascal}Repository\n  ) {}\n\n  execute(): Promise<${names.pascal}[]> {\n    return this.repository.findAll();\n  }\n}\n`
    },
    {
      path: `src/infrastructure/persistence/in-memory-${names.kebab}.repository.ts`,
      content: `import { Injectable } from '@nestjs/common';\nimport { ${names.pascal} } from '../../domain/entities/${names.kebab}.entity';\nimport { ${names.pascal}Repository } from '../../domain/repositories/${names.kebab}.repository';\n\n@Injectable()\nexport class InMemory${names.pascal}Repository implements ${names.pascal}Repository {\n  private readonly items = [new ${names.pascal}('1', 'Example ${names.pascal}')];\n\n  async findAll(): Promise<${names.pascal}[]> {\n    return this.items;\n  }\n}\n`
    },
    {
      path: `src/presentation/controllers/${names.kebab}.controller.ts`,
      content: `import { Controller, Get } from '@nestjs/common';\nimport { Get${names.pascal}UseCase } from '../../application/use-cases/get-${names.kebab}.use-case';\n\n@Controller('${names.kebab}')\nexport class ${names.pascal}Controller {\n  constructor(private readonly get${names.pascal}UseCase: Get${names.pascal}UseCase) {}\n\n  @Get()\n  findAll() {\n    return this.get${names.pascal}UseCase.execute();\n  }\n}\n`
    },
    {
      path: `src/presentation/${names.kebab}.module.ts`,
      content: `import { Module } from '@nestjs/common';\nimport { Get${names.pascal}UseCase } from '../application/use-cases/get-${names.kebab}.use-case';\nimport { ${names.pascal}Repository } from '../domain/repositories/${names.kebab}.repository';\nimport { InMemory${names.pascal}Repository } from '../infrastructure/persistence/in-memory-${names.kebab}.repository';\nimport { ${names.pascal}Controller } from './controllers/${names.kebab}.controller';\n\n@Module({\n  controllers: [${names.pascal}Controller],\n  providers: [\n    Get${names.pascal}UseCase,\n    {\n      provide: ${names.pascal}Repository,\n      useClass: InMemory${names.pascal}Repository\n    }\n  ]\n})\nexport class ${names.pascal}Module {}\n`
    }
  ];
}

function validateProjectName(name: string): void {
  if (!/^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)$/.test(name)) {
    throw new Error(`invalid npm project name: ${name}`);
  }
}

function getModuleNames(name: string): ModuleNames {
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    throw new Error(`invalid module name: ${name}`);
  }

  const words = name.match(/[A-Z]?[a-z0-9]+|[A-Z]+(?![a-z])/g)?.map((word) => word.toLowerCase()) ?? [name.toLowerCase()];
  const kebab = words.join('-');
  const pascal = words.map(capitalize).join('');
  const camel = `${words[0]}${words.slice(1).map(capitalize).join('')}`;

  return { raw: name, kebab, pascal, camel };
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function toTitle(value: string): string {
  return value
    .replace(/^@/, '')
    .split(/[\/_-]/)
    .filter(Boolean)
    .map(capitalize)
    .join(' ');
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
