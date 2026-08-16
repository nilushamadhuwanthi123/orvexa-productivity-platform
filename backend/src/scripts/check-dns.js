/**
 * DNS / SRV diagnostic for the configured MongoDB Atlas cluster.
 *
 *   npm run check:dns          (from the repo root or backend/)
 *
 * Resolves the same records the MongoDB driver needs before it can connect,
 * first with the OS resolvers and then with the resolvers this project
 * installs, so it is obvious which one is failing.
 */
import dns from 'node:dns';
import env from '../config/env.js';
import configureDns, { DEFAULT_DNS_SERVERS } from '../config/dns.js';

const hostname = (() => {
  const match = env.mongoUri.match(/^mongodb\+srv:\/\/(?:[^@]+@)?([^/?]+)/i);
  return match ? match[1] : null;
})();

if (!hostname) {
  console.log(
    '\n[check-dns] MONGODB_URI is not a mongodb+srv:// URI — no SRV lookup is ' +
      'needed for this connection string. Nothing to check.\n'
  );
  process.exit(0);
}

const srvName = `_mongodb._tcp.${hostname}`;

async function attempt(label, servers) {
  const resolver = new dns.promises.Resolver();
  if (servers) resolver.setServers(servers);

  const using = resolver.getServers().join(', ') || 'none';
  console.log(`\n── ${label}`);
  console.log(`   resolvers: ${using}`);

  try {
    const records = await resolver.resolveSrv(srvName);
    console.log(`   ✔ SRV ${srvName} → ${records.length} record(s)`);
    for (const r of records) console.log(`     • ${r.name}:${r.port}`);
    return true;
  } catch (err) {
    console.log(`   ✖ SRV ${srvName} failed: ${err.code || err.message}`);
    return false;
  }
}

console.log(`\n[check-dns] cluster host: ${hostname}`);

const systemOk = await attempt('System DNS (what Node uses by default)', null);

configureDns();
const configuredOk = await attempt('Configured DNS (this project)', dns.getServers());

console.log('');
if (configuredOk) {
  console.log('[check-dns] ✔ SRV resolution works — MongoDB Atlas should connect.');
  if (!systemOk) {
    console.log(
      '[check-dns]   Your system resolvers do not answer SRV queries; the ' +
        `project falls back to ${DEFAULT_DNS_SERVERS.join(', ')}, which do.`
    );
  }
  process.exit(0);
}

console.log('[check-dns] ✖ SRV resolution failed on every resolver tried.');
console.log('[check-dns]   Likely a firewall/VPN blocking outbound DNS (UDP 53).');
console.log('[check-dns]   Options:');
console.log('[check-dns]     • set DNS_SERVERS=<a working resolver> in backend/.env');
console.log('[check-dns]     • or use the non-SRV connection string from Atlas');
console.log('[check-dns]       (Connect → Drivers → "Node.js 2.2.12 or later")');
process.exit(1);
