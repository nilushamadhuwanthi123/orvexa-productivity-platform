/**
 * DNS bootstrap.
 *
 * MongoDB Atlas `mongodb+srv://` URIs require an SRV lookup
 * (`_mongodb._tcp.<cluster>.mongodb.net`) before the driver can discover the
 * replica-set hosts. Node.js resolves SRV records through c-ares using the
 * resolvers it inherits from the OS, and on some networks — corporate DNS,
 * captive portals, VPN split-tunnels, ISP routers that only proxy A/AAAA
 * records — those resolvers refuse or drop SRV queries. The symptom is:
 *
 *   querySrv ECONNREFUSED _mongodb._tcp.<cluster>.mongodb.net
 *
 * …even though `nslookup -type=SRV … 8.8.8.8` succeeds from the same machine,
 * because nslookup was pointed at a resolver that answers SRV and Node was not.
 *
 * Fix: point Node's resolver at public DNS servers that reliably serve SRV
 * records, keeping the OS-provided servers appended as a last resort so
 * split-horizon / internal names still resolve.
 *
 * This must run before the first MongoDB connection attempt, so both entry
 * points (`server.js` and `seed/seed.js`) call `configureDns()` first.
 */
import dns from 'node:dns';

/** Public resolvers that answer SRV queries: Google, then Cloudflare. */
export const DEFAULT_DNS_SERVERS = ['8.8.8.8', '1.1.1.1'];

let applied = false;

/**
 * Reads the optional `DNS_SERVERS` override (comma-separated) so a network that
 * blocks 8.8.8.8/1.1.1.1 can still be pointed at a working resolver without a
 * code change. Falls back to the defaults above.
 */
function desiredServers() {
  const override = (process.env.DNS_SERVERS || '').trim();
  if (!override) return DEFAULT_DNS_SERVERS;

  const parsed = override
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return parsed.length ? parsed : DEFAULT_DNS_SERVERS;
}

/**
 * Puts reliable resolvers in front of the system ones for this process only.
 * Idempotent, and never throws: if `dns.setServers` rejects the list we log a
 * warning and leave the OS resolvers untouched rather than taking the app down.
 *
 * @returns {string[]} the resolver list now in effect
 */
export function configureDns() {
  if (applied) return dns.getServers();

  const system = dns.getServers();
  const preferred = desiredServers();

  // Preferred first (c-ares tries them in order), system servers appended so
  // internal/split-horizon hostnames keep resolving.
  const merged = [...new Set([...preferred, ...system])];

  try {
    dns.setServers(merged);
    applied = true;
    console.log(`[orvexa] DNS resolvers → ${dns.getServers().join(', ')}`);
  } catch (err) {
    console.warn(
      `[orvexa] Could not override DNS resolvers (${err.message}); ` +
        `continuing with system DNS: ${system.join(', ') || 'none'}`
    );
  }

  return dns.getServers();
}

export default configureDns;
