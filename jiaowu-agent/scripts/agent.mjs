import { readFileSync, existsSync } from 'node:fs';
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
  const response = await fetch(base.href.replace(/\/$/, '') + path, options);
  console.log(JSON.stringify(await response.json()));
  if (!response.ok) process.exitCode = 1;
} catch (error) {
  console.error(error.code === 'ENOENT' ? '未找到个人连接，请导入负责人提供的个人连接文件。' : '调用未完成，请保留原请求编号并核查回执。请检查服务连接和本地请求文件。');
  process.exitCode = 1;
}
