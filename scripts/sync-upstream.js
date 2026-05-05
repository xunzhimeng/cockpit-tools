import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const options = parseArgs(process.argv.slice(2));
const originUrl = options.originUrl ?? 'https://github.com/xunzhimeng/cockpit-tools.git';
const upstreamUrl = options.upstreamUrl ?? 'https://github.com/jlcodes99/cockpit-tools.git';
const upstreamBranch = options.upstreamBranch ?? 'main';
const targetBranch = options.branch ?? currentBranch();
const depth = options.depth ?? '5';

let tempDir;

try {
  ensureGitRepo();
  ensureRemote('origin', originUrl);
  ensureRemote('upstream', upstreamUrl);
  ensureCleanWorktree();
  ensureUpstreamRef(upstreamBranch, depth);

  const oldUpstream = git(['rev-parse', `upstream/${upstreamBranch}`]);
  const head = git(['rev-parse', 'HEAD']);
  const backupBranch = createBackupBranch();
  const patchPath = createCustomPatch(oldUpstream, head);
  const hasCustomPatch = patchPath !== null;

  log(`Backup branch: ${backupBranch}`);
  log(`Old upstream: ${oldUpstream.slice(0, 12)}`);
  log(`Current HEAD: ${head.slice(0, 12)}`);
  log(`Custom patch: ${hasCustomPatch ? 'yes' : 'no'}`);

  gitInherit(['fetch', 'upstream', '--depth', depth, upstreamBranch]);
  gitInherit(['checkout', targetBranch]);
  gitInherit(['reset', '--hard', `upstream/${upstreamBranch}`]);

  if (hasCustomPatch) {
    gitInherit(['apply', '--3way', '--index', patchPath]);
    if (hasChanges()) {
      gitInherit(['add', '-A']);
      gitInherit(['commit', '-m', 'Merge upstream and re-apply custom modifications']);
    }
  }

  gitInherit(['push', 'origin', targetBranch, '--force-with-lease']);
  log('Sync complete.');
} catch (error) {
  console.error(`Sync failed: ${error.message}`);
  process.exit(1);
} finally {
  if (tempDir) {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function parseArgs(args) {
  const parsed = {};

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--depth') {
      parsed.depth = args[++index];
    } else if (arg === '--branch') {
      parsed.branch = args[++index];
    } else if (arg === '--upstream-branch') {
      parsed.upstreamBranch = args[++index];
    } else if (arg === '--origin-url') {
      parsed.originUrl = args[++index];
    } else if (arg === '--upstream-url') {
      parsed.upstreamUrl = args[++index];
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function printHelp() {
  console.log([
    'Usage: npm run sync-upstream -- [options]',
    '',
    'Options:',
    '  --depth <n>              Fetch depth, default: 5',
    '  --branch <name>          Local branch, default: current branch',
    '  --upstream-branch <name> Upstream branch, default: main',
    '  --origin-url <url>       Origin remote URL',
    '  --upstream-url <url>     Upstream remote URL',
  ].join('\n'));
}

function ensureGitRepo() {
  git(['rev-parse', '--is-inside-work-tree']);
}

function ensureCleanWorktree() {
  const status = git(['status', '--porcelain']);

  if (status.length > 0) {
    throw new Error('Working tree is not clean. Commit or stash your changes before syncing.');
  }
}

function ensureRemote(name, url) {
  const currentUrl = tryGit(['remote', 'get-url', name]);

  if (currentUrl === null) {
    gitInherit(['remote', 'add', name, url]);
    return;
  }

  if (currentUrl !== url) {
    log(`${name} remote already exists: ${currentUrl}`);
  }
}

function ensureUpstreamRef(branch, fetchDepth) {
  if (tryGit(['rev-parse', '--verify', `refs/remotes/upstream/${branch}`]) === null) {
    gitInherit(['fetch', 'upstream', '--depth', fetchDepth, branch]);
  }
}

function createBackupBranch() {
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  const branch = `backup-before-upstream-sync-${timestamp}`;
  gitInherit(['branch', branch]);
  return branch;
}

function createCustomPatch(base, head) {
  if (base === head) {
    return null;
  }

  const patch = gitBuffer(['diff', '--binary', `${base}..${head}`]);

  if (patch.length === 0) {
    return null;
  }

  tempDir = mkdtempSync(join(tmpdir(), 'cockpit-sync-'));
  const patchPath = join(tempDir, 'custom.patch');
  writeFileSync(patchPath, patch);
  return patchPath;
}

function hasChanges() {
  return tryGit(['diff', '--quiet']) === null || tryGit(['diff', '--cached', '--quiet']) === null;
}

function currentBranch() {
  const branch = git(['branch', '--show-current']);

  if (branch.length === 0) {
    throw new Error('Cannot determine current branch.');
  }

  return branch;
}

function log(message) {
  console.log(`[sync-upstream] ${message}`);
}

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });

  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    throw new Error(stderr || `git ${args.join(' ')} failed`);
  }

  return result.stdout.trim();
}

function tryGit(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });

  if (result.status !== 0) {
    return null;
  }

  return result.stdout.trim();
}

function gitBuffer(args) {
  const result = spawnSync('git', args);

  if (result.status !== 0) {
    throw new Error(result.stderr?.toString().trim() || `git ${args.join(' ')} failed`);
  }

  return result.stdout;
}

function gitInherit(args) {
  const result = spawnSync('git', args, { stdio: 'inherit' });

  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed`);
  }
}
