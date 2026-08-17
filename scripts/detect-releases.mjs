import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PACKAGE_PATH = /^packages\/([a-z0-9][a-z0-9._-]*)\/package\.json$/;
const VERSION = /^\d+\.\d+\.\d+(?:-rc\.\d+)?$/;

function git(cwd, args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (!allowFailure && result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
  }
  return result;
}

function commitExists(cwd, revision) {
  if (!revision) return false;
  return (
    git(cwd, ['cat-file', '-e', `${revision}^{commit}`], {
      allowFailure: true,
    }).status === 0
  );
}

function readManifest(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readManifestAt(cwd, revision, path) {
  const result = git(cwd, ['show', `${revision}:${path}`], {
    allowFailure: true,
  });
  return result.status === 0 ? JSON.parse(result.stdout) : null;
}

function candidatePaths({ cwd, eventName, inputPackage, before, ref, sha }) {
  if (eventName === 'workflow_dispatch') {
    if (ref !== 'refs/heads/main') {
      throw new Error('workflow_dispatch releases must run from main');
    }
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(inputPackage ?? '')) {
      throw new Error(
        'workflow_dispatch package must be a package directory name'
      );
    }
    const path = `packages/${inputPackage}/package.json`;
    if (!existsSync(`${cwd}/${path}`)) {
      throw new Error(`no package found at ${path}`);
    }
    return { paths: [path], base: null, manual: true };
  }

  let base = before;
  if (!commitExists(cwd, base)) {
    const parent = git(cwd, ['rev-parse', `${sha}^`], {
      allowFailure: true,
    });
    base = parent.status === 0 ? parent.stdout.trim() : '';
  }
  if (!commitExists(cwd, base) || !commitExists(cwd, sha)) {
    throw new Error(
      'cannot determine a valid release diff; refusing to publish'
    );
  }

  const diff = git(cwd, [
    'diff',
    '--name-only',
    '--diff-filter=AM',
    base,
    sha,
    '--',
    'packages/*/package.json',
  ]).stdout;
  return {
    paths: diff.split('\n').filter(Boolean),
    base,
    manual: false,
  };
}

export function detectReleases({
  cwd = process.cwd(),
  eventName,
  inputPackage,
  before,
  ref,
  sha,
  log = () => {},
}) {
  const candidates = candidatePaths({
    cwd,
    eventName,
    inputPackage,
    before,
    ref,
    sha,
  });
  const include = [];

  for (const path of candidates.paths) {
    const match = PACKAGE_PATH.exec(path);
    if (!match || !existsSync(`${cwd}/${path}`)) continue;

    const directory = match[1];
    const manifest = readManifest(`${cwd}/${path}`);
    if (manifest.private === true) {
      log(`skip ${directory}: private package`);
      continue;
    }
    if (manifest.name !== `@parallel-web/${directory}`) {
      throw new Error(
        `${path} must be named @parallel-web/${directory}, got ${manifest.name}`
      );
    }
    if (!VERSION.test(manifest.version)) {
      throw new Error(`${path} has unsupported version ${manifest.version}`);
    }

    if (!candidates.manual) {
      const previous = readManifestAt(cwd, candidates.base, path);
      if (!previous) {
        log(`skip ${directory}: newly added package`);
        continue;
      }
      if (previous.version === manifest.version) {
        log(`skip ${directory}: version unchanged`);
        continue;
      }
    }

    const tag = `${directory}-v${manifest.version}`;
    if (
      git(cwd, ['show-ref', '--quiet', '--verify', `refs/tags/${tag}`], {
        allowFailure: true,
      }).status === 0
    ) {
      log(`skip ${directory}: tag ${tag} already exists`);
      continue;
    }

    const prerelease = manifest.version.includes('-rc.');
    include.push({
      name: directory,
      dir: `packages/${directory}`,
      version: manifest.version,
      tag,
      npm_tag: prerelease ? 'rc' : 'latest',
      prerelease,
    });
  }

  return {
    any: include.length > 0,
    matrix: { include },
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = detectReleases({
    eventName: process.env.EVENT_NAME,
    inputPackage: process.env.INPUT_PACKAGE,
    before: process.env.BEFORE,
    ref: process.env.REF,
    sha: process.env.SHA,
    log: (message) => process.stderr.write(`${message}\n`),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}
