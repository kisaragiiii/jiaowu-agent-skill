import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, readFileSync, mkdirSync, writeFileSync, chmodSync, cpSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
export const configDirectory = () => process.env.JIAOWU_CONFIG_DIR || join(homedir(), '.config', 'jiaowu-agent');
export function validBase(value) {
  const url = new URL(value);
  if (url.username || url.password || url.search || url.hash || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)))) throw Error('个人接口需要 HTTPS；仅本机可使用 HTTP');
  if (!url.pathname.endsWith('/v1')) throw Error('个人接口地址必须以 /v1 结尾');
  return url;
}
export function saveConnection(config) {
  validBase(config.apiBase);
  if (config.authentication?.type !== 'bearer' || !/^[\w-]{20,200}$/.test(config.authentication.token || '')) throw Error('个人连接文件无效');
  const directory = configDirectory();
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  chmodSync(directory, 0o700);
  const target = join(directory, 'connection.json');
  writeFileSync(target, JSON.stringify(config, null, 2), { mode: 0o600 });
  chmodSync(target, 0o600);
}
export async function setup(args = process.argv.slice(2), execute = run) {
  if (args[0] === '--connection') {
    if (!args[1]) throw Error('缺少个人连接文件路径');
    saveConnection(JSON.parse(readFileSync(resolve(args[1]), 'utf8')));
  }
  const state = configDirectory();
  if (!args.includes('--check')) {
    const ownFolder = resolve(dirname(fileURLToPath(import.meta.url)), '..');
    const personal = join(ownFolder, 'connection.json');
    if (existsSync(personal)) saveConnection(JSON.parse(readFileSync(personal, 'utf8')));
    // Persist only the public client. Credentials are stored outside the Skill tree.
    const installed = join(homedir(), '.agents', 'skills', 'jiaowu-agent');
    if (installed !== ownFolder) {
      mkdirSync(join(installed, 'scripts'), { recursive: true });
      for (const file of ['SKILL.md', 'scripts/setup.mjs', 'scripts/agent.mjs']) cpSync(join(ownFolder, file), join(installed, file));
      writeFileSync(join(installed, 'SKILL.md'), readFileSync(join(installed, 'SKILL.md'), 'utf8').replace(/^name: jiaowu-[\w-]+$/m, 'name: jiaowu-agent'));
    }
  }
  let binary;
  const toolDirectory = join(state, 'tools');
  const invoke = (file, argv, options) => file.endsWith('.js') ? execute(process.execPath, [file, ...argv], options) : execute(file, argv, options);
  const candidates = ['dws', join(homedir(), '.local', 'bin', 'dws'), join(toolDirectory, 'node_modules', 'dingtalk-workspace-cli', 'bin', 'dws.js')];
  for (const candidate of candidates) {
    try { await invoke(candidate, ['version'], { timeout: 20000 }); binary = candidate; break; } catch {}
  }
  if (!binary && args.includes('--check')) return { cli: false, connected: existsSync(join(state, 'connection.json')), installationRequired: true };
  if (!binary) {
    mkdirSync(toolDirectory, { recursive: true, mode: 0o700 });
    // Official npm distribution; fixed arguments, no shell interpolation.
    const npmCandidates = [join(dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'), resolve(dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js')];
    if (process.platform === 'win32' && !npmCandidates.some(existsSync)) {
      try {
        const found = await execute('where.exe', ['npm'], { timeout: 10000 });
        for (const item of found.stdout.trim().split(/\r?\n/)) npmCandidates.push(join(dirname(item), 'node_modules/npm/bin/npm-cli.js'));
      } catch {}
    }
    const npmCli = npmCandidates.find(existsSync);
    if (process.platform === 'win32' && !npmCli) throw Error('未找到 npm，请先安装带 npm 的 Node.js');
    await execute(npmCli ? process.execPath : 'npm', [...(npmCli ? [npmCli] : []), 'install', '--prefix', toolDirectory, 'dingtalk-workspace-cli'], { timeout: 240000, maxBuffer: 4 * 1024 * 1024, windowsHide: true, env: { ...process.env, DWS_NO_SKILLS: '1' } });
    binary = candidates[2];
    await invoke(binary, ['version'], { timeout: 20000 });
  }
  if (!args.includes('--check')) {
    const marker = join(state, 'cli-setup.json');
    const version = (await invoke(binary, ['version'], { timeout: 20000 })).stdout.trim();
    let prior;
    try { prior = JSON.parse(readFileSync(marker, 'utf8')); } catch {}
    if (prior?.version !== version) {
      await invoke(binary, ['skill', 'setup', '--mode', 'multi', '--skill', 'aitable', '--yes'], { timeout: 60000, maxBuffer: 1024 * 1024 });
      mkdirSync(state, { recursive: true, mode: 0o700 });
      writeFileSync(marker, JSON.stringify({ version }), { mode: 0o600 });
    }
  }
  let identity;
  try { identity = JSON.parse((await invoke(binary, ['auth', 'status', '--format', 'json'], { timeout: 20000 })).stdout); } catch {}
  if (!identity?.authenticated && !args.includes('--check')) {
    // Inherit stdio so DingTalk's actual authorization page/code reaches the owner of the account.
    const { spawn } = await import('node:child_process');
    const exitCode = await new Promise((accept, reject) => {
      const child = spawn(binary.endsWith('.js') ? process.execPath : binary, [...(binary.endsWith('.js') ? [binary] : []), 'auth', 'login', '--device'], { stdio: 'inherit', windowsHide: true });
      child.once('error', reject); child.once('exit', accept);
    });
    if (exitCode !== 0) throw Error('钉钉本人授权尚未完成');
    identity = JSON.parse((await invoke(binary, ['auth', 'status', '--format', 'json'], { timeout: 20000 })).stdout);
  }
  return { cli: true, authenticated: identity?.authenticated === true, user: identity?.user_name, organization: identity?.corp_name, connected: existsSync(join(state, 'connection.json')) || existsSync(resolve(dirname(fileURLToPath(import.meta.url)), '../connection.json')), businessExecution: '由个人接口返回的 capabilities 决定' };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  setup().then(value => console.log(JSON.stringify(value))).catch(() => { console.error('启用未完成：请检查 Node/npm、网络和钉钉本人授权。连接凭据未输出。'); process.exitCode = 1; });
}
