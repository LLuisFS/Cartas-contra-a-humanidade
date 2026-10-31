const os = require('os');

/**
 * Discovers and prioritizes IPv4 LAN/Hotspot addresses on the host machine.
 * @returns {{ primaryIp: string, interfaces: Array<{name: string, address: string, isVirtual: boolean}> }}
 */
function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const net of addrs) {
      // Must be IPv4 and non-internal (skip 127.0.0.1)
      const isIPv4 = net.family === 'IPv4' || net.family === 4;
      if (isIPv4 && !net.internal) {
        const lowerName = name.toLowerCase();
        const isVirtual = lowerName.includes('vethernet') ||
                          lowerName.includes('virtual') ||
                          lowerName.includes('vmware') ||
                          lowerName.includes('box') ||
                          lowerName.includes('docker') ||
                          lowerName.includes('tailscale') ||
                          lowerName.includes('zerotier') ||
                          lowerName.includes('wsl');

        candidates.push({
          name,
          address: net.address,
          netmask: net.netmask,
          isVirtual,
          isWiFi: lowerName.includes('wi-fi') || lowerName.includes('wlan') || lowerName.includes('wireless'),
          isEthernet: lowerName.includes('ethernet') || lowerName.includes('eth') || lowerName.includes('en')
        });
      }
    }
  }

  // Sort candidates to find the best primary IP:
  // 1. Non-virtual Wi-Fi (ideal for hotspot/mobile play)
  // 2. Non-virtual Ethernet
  // 3. Any non-virtual adapter
  // 4. Virtual adapters (WSL, Hyper-V)
  // 5. Fallback to 127.0.0.1
  candidates.sort((a, b) => {
    if (a.isVirtual !== b.isVirtual) return a.isVirtual ? 1 : -1;
    if (a.isWiFi !== b.isWiFi) return a.isWiFi ? -1 : 1;
    if (a.isEthernet !== b.isEthernet) return a.isEthernet ? -1 : 1;
    // Prefer typical private subnets: 192.168.x.x > 10.x.x.x > 172.x.x.x
    if (a.address.startsWith('192.168.') && !b.address.startsWith('192.168.')) return -1;
    if (!a.address.startsWith('192.168.') && b.address.startsWith('192.168.')) return 1;
    return 0;
  });

  const primaryIp = candidates.length > 0 ? candidates[0].address : '127.0.0.1';

  return {
    primaryIp,
    interfaces: candidates.map(c => ({
      name: c.name,
      address: c.address,
      isVirtual: c.isVirtual,
      isWiFi: c.isWiFi
    }))
  };
}

module.exports = {
  getNetworkInfo
};
