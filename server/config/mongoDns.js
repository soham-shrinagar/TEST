const dns = require('dns');

const FALLBACK_DNS_SERVERS = ['8.8.8.8', '1.1.1.1'];

const getSrvHostname = (mongoUri) => {
  const match = mongoUri?.match(/^mongodb\+srv:\/\/(?:[^@/]+@)?([^/?]+)/);
  return match ? `_mongodb._tcp.${match[1]}` : null;
};

const configureMongoDns = async (mongoUri) => {
  const envServers = process.env.MONGO_DNS_SERVERS
    ?.split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  if (envServers?.length) {
    dns.setServers(envServers);
    return;
  }

  const srvHostname = getSrvHostname(mongoUri);
  if (!srvHostname) {
    return;
  }

  try {
    await dns.promises.resolveSrv(srvHostname);
  } catch (error) {
    if (/ECONNREFUSED|ENOTFOUND|ETIMEOUT|ESERVFAIL/.test(error?.code || '')) {
      console.warn('System DNS could not resolve MongoDB Atlas; using public DNS fallback.');
      dns.setServers(FALLBACK_DNS_SERVERS);
    }
  }
};

module.exports = { configureMongoDns };
