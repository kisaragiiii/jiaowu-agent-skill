import { readFileSync, existsSync } from 'node:fs';
import { sign, randomBytes, createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const [action, value, requestKey] = process.argv.slice(2);
try {
  const local = resolve(dirname(fileURLToPath(import.meta.url)), '../connection.json');
  const shared = resolve(process.env.JIAOWU_CONFIG_DIR || resolve(homedir(), '.config/jiaowu-agent'), 'connection.json');
  const config = JSON.parse(readFileSync(existsSync(local) ? local : shared, 'utf8'));
  const base = new URL(config.apiBase);
  if (base.username || base.password || base.search || base.hash || (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname)))) throw Error('远程连接需要 HTTPS');
  let path;
  const options = { headers: { Authorization: 'Bearer ' + config.authentication.token }, signal: AbortSignal.timeout(30000) };
  if (['me', 'configuration'].includes(action)) path = '/' + action;
  else if (['table', 'configure', 'query', 'reminders', 'reconcile', 'id-column', 'ask', 'feedback'].includes(action) && value) {
    path = '/' + ({ table: 'table-applications', configure: 'configuration', ask: 'assistant', feedback: 'assistant/feedback' }[action] || action);
    if (action === 'ask') options.signal = AbortSignal.timeout(180000);
    options.method = 'POST';
    options.headers['Content-Type'] = 'application/json';
    options.body = readFileSync(value, 'utf8');
  }
  else if (['receipt', 'request'].includes(action) && value) path = (action === 'receipt' ? '/receipts/' : '/requests/') + encodeURIComponent(value);
  else if (action === 'submit' && value && requestKey) {
    path = '/transfer';
    options.method = 'POST';
    options.headers['Content-Type'] = 'application/json';
    options.headers['Idempotency-Key'] = requestKey;
    options.body = readFileSync(value, 'utf8');
  } else throw Error('用法 me / submit 请求.json 稳定请求编号 / receipt 任务编号 / request 稳定请求编号');
  const target = new URL(base.href.replace(/\/$/, '') + path);
  if (config.deviceId) {
    if (!/^device-[\w-]+\.pem$/.test(config.deviceKey || '')) throw Error('设备私钥路径无效');
    const key = readFileSync(resolve(dirname(shared), config.deviceKey), 'utf8');
    const time=String(Date.now()), nonce=randomBytes(24).toString('base64url');
    const payload=[options.method || 'GET',target.pathname+target.search,time,nonce,createHash('sha256').update(config.authentication.token).digest('hex')].join('\n');
    Object.assign(options.headers, {'X-Agent-Time':time,'X-Agent-Nonce':nonce,'X-Agent-Signature':sign(null,Buffer.from(payload),key).toString('base64url')});
  }
  const response = await fetch(target.href, { ...options, redirect: 'error' });
  console.log(JSON.stringify(await response.json()));
  if (!response.ok) process.exitCode = 1;
} catch (error) {
  console.error(error.code === 'ENOENT' ? '未找到本机连接或设备私钥；请按 Skill 用本人身份连接，不复制他人配置。' : '调用未完成，请保留原请求编号并核查回执。请检查服务连接和本地请求文件。');
  process.exitCode = 1;
}
