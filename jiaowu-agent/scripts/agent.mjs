import { readFileSync, existsSync, mkdirSync, writeFileSync, renameSync, chmodSync } from 'node:fs';
import { sign, randomBytes, createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const VERSION = '2.0.0', PROTOCOL = 1;
const [action, value, requestKey] = process.argv.slice(2);
const emit = (data, code = 0) => { console.log(JSON.stringify(data)); process.exitCode = code; };
const writeActions = new Set(['submit', 'table', 'configure', 'id-column', 'ask']);
try {
  const local = resolve(dirname(fileURLToPath(import.meta.url)), '../connection.json');
  const shared = resolve(process.env.JIAOWU_CONFIG_DIR || resolve(homedir(), '.config/jiaowu-agent'), 'connection.json');
  const config = JSON.parse(readFileSync(existsSync(local) ? local : shared, 'utf8'));
  const base = new URL(config.apiBase);
  if (base.username || base.password || base.search || base.hash || !base.pathname.endsWith('/v1') || (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)))) throw Error('远程连接需要 HTTPS 和 /v1 入口');
  const configDirectory = dirname(shared);
  const scope = createHash('sha256').update(JSON.stringify([base.href, config.memberId, config.authentication.token, config.deviceId])).digest('hex');
  const cacheFile = resolve(configDirectory, 'runtime-' + scope + '.json');
  let cache;
  try { cache = JSON.parse(readFileSync(cacheFile, 'utf8')); } catch { /* A missing cache never grants offline business access. */ }
  let deviceKey;
  if (config.deviceId) {
    if (!/^device-[\w-]+\.pem$/.test(config.deviceKey || '')) throw Error('设备私钥路径无效');
    deviceKey = readFileSync(resolve(configDirectory, config.deviceKey), 'utf8');
  }
  async function call(path, { method = 'GET', body, revision, key, timeout = 30000 } = {}) {
    const target = new URL(base.href.replace(/\/$/, '') + path);
    const headers = { Authorization: 'Bearer ' + config.authentication.token, 'X-Agent-Client-Version': VERSION, 'X-Agent-Protocol': String(PROTOCOL) };
    if (revision) headers['X-Agent-Config-Revision'] = revision;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (key) headers['Idempotency-Key'] = key;
    if (deviceKey) {
      const time = String(Date.now()), nonce = randomBytes(24).toString('base64url');
      const payload = [method, target.pathname + target.search, time, nonce, createHash('sha256').update(config.authentication.token).digest('hex')].join('\n');
      Object.assign(headers, { 'X-Agent-Time': time, 'X-Agent-Nonce': nonce, 'X-Agent-Signature': sign(null, Buffer.from(payload), deviceKey).toString('base64url') });
    }
    const response = await fetch(target.href, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(timeout), redirect: 'error' });
    return { ok: response.ok, data: await response.json() };
  }
  function remember(latest) {
    mkdirSync(configDirectory, { recursive: true, mode: 0o700 });
    const temporary = cacheFile + '.' + randomBytes(8).toString('hex') + '.tmp';
    // Cache only a revision and a time; never business data, rules or secrets.
    writeFileSync(temporary, JSON.stringify({ revision: latest.clientSync.revision, clientVersion: VERSION, checkedAt: new Date().toISOString() }), { mode: 0o600, flag: 'wx' });
    renameSync(temporary, cacheFile); chmodSync(cacheFile, 0o600);
  }
  async function run() {
    let path, method = 'GET', input;
    if (['me', 'configuration'].includes(action)) path = '/' + action;
    else if (['table', 'configure', 'query', 'reminders', 'reconcile', 'id-column', 'ask', 'feedback'].includes(action) && value) {
      path = '/' + ({ table: 'table-applications', configure: 'configuration', ask: 'assistant', feedback: 'assistant/feedback' }[action] || action); method = 'POST';
    } else if (['receipt', 'request'].includes(action) && value) path = (action === 'receipt' ? '/receipts/' : '/requests/') + encodeURIComponent(value);
    else if (action === 'submit' && value && /^[\w-]{8,100}$/.test(requestKey || '')) { path = '/transfer'; method = 'POST'; }
    else throw Error('调用参数不合法');
    if (method === 'POST') { input = JSON.parse(readFileSync(value, 'utf8')); if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('需要JSON对象'); }
    // Unknown writes stay inspectable during upgrades. These actions only read.
    if (['receipt', 'request', 'reconcile'].includes(action)) { const result = await call(path, { method, body: input }); emit(result.data, result.ok ? 0 : 1); return; }
    let checked;
    try { checked = await call('/me'); }
    catch { emit({ status: 'preflight_unavailable', written: false, error: '未能读取后台最新配置，本次未发起业务操作。请恢复连接后再试；未知旧任务只查原回执。' }, 1); return; }
    if (!checked.ok) { emit({ ...checked.data, written: false, stage: 'preflight' }, 1); return; }
    const latest = checked.data, sync = latest.clientSync;
    if (!sync || sync.protocol !== PROTOCOL || !/^[a-f0-9]{64}$/.test(sync.revision || '')) { emit({ status: 'server_update_required', written: false, error: '后台尚未提供兼容的自动同步接口，本次未发起业务操作。' }, 1); return; }
    const minimum = /^(\d+)\.(\d+)\.(\d+)$/.exec(sync.minimumClientVersion || '');
    if (!minimum || Number(minimum[1]) > 2 || (Number(minimum[1]) === 2 && (Number(minimum[2]) > 0 || Number(minimum[3]) > 0))) { emit({ status: 'client_update_required', written: false, error: '请更新教务Agent Skill，保留本人连接及设备私钥。', latest }, 1); return; }
    const changed = cache?.revision !== sync.revision;
    remember(latest);
    if (action === 'me') { emit({ ...latest, runtimeSync: { clientVersion: VERSION, revision: sync.revision, changed } }); return; }
    const preparedRevision = input?._agentConfigRevision;
    if (input) delete input._agentConfigRevision;
    // Pin the revision the author saw. Another conversation may refresh cache.
    if (writeActions.has(action) && preparedRevision !== sync.revision) {
      emit({ status: 'configuration_changed', code: 'CONFIGURATION_CHANGED', written: false, requiresPreparation: true, message: '已自动读取最新配置，请按latest重新准备请求并填写_agentConfigRevision。无需教务手动刷新、重新配置或再次确认；未执行的请求保留原编号。已有未知任务先核查原回执，不能改内容重投。', latest }, 2); return;
    }
    const result = await call(path, { method, body: input, revision: sync.revision, key: action === 'submit' ? requestKey : undefined, timeout: action === 'ask' ? 180000 : 30000 });
    emit({ ...result.data, runtimeSync: { clientVersion: VERSION, revision: sync.revision, changed, ...(changed ? { latest } : {}) } }, result.ok ? 0 : 1);
  }
  await run();
} catch (error) {
  console.error(error.code === 'ENOENT' ? '未找到本机连接、设备私钥或请求文件；请保留本人配置，不复制他人凭据。' : '调用未完成，请保留原请求编号并核查回执。请检查服务连接和本地请求文件。');
  process.exitCode = 1;
}
