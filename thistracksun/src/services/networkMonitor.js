const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class NetworkMonitor {
  constructor() {
    this.monitoringInterval = null;
    this.blockedDomains = new Set();
    this.nsfwKeywords = [
      'porn', 'xxx', 'sex', 'adult', 'cam', 'nude', 'erotic', 
      'game', 'gaming', 'play', 'casino', 'bet', 'gambling',
      'social', 'facebook', 'twitter', 'instagram', 'tiktok',
      'youtube', 'reddit', 'discord', 'twitch'
    ];
    
    this.loadBlockedDomains();
    this.startMonitoring();
  }

  loadBlockedDomains() {
    try {
      const hostsPath = '/etc/hosts';
      const hostsContent = fs.readFileSync(hostsPath, 'utf8');
      const blockedSites = hostsContent
        .split('\n')
        .filter(line => line.includes('127.0.0.1') && !line.startsWith('#'))
        .map(line => line.split(' ')[1])
        .filter(site => site && site !== 'localhost');
      
      blockedSites.forEach(site => this.blockedDomains.add(site));
    } catch (error) {
      console.error('Error loading blocked domains:', error);
    }
  }

  startMonitoring() {
    console.log('Starting network monitoring...');
    
    // Monitor every 5 seconds
    this.monitoringInterval = setInterval(() => {
      this.checkActiveConnections();
    }, 5000);
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  checkActiveConnections() {
    exec('lsof -i -n', (error, stdout) => {
      if (error) {
        console.error('Error checking connections:', error);
        return;
      }

      const connections = this.parseConnections(stdout);
      this.analyzeConnections(connections);
    });
  }

  parseConnections(output) {
    return output
      .split('\n')
      .slice(1) // Skip header
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(/\s+/);
        const connection = parts[8] || '';
        const domain = this.extractDomain(connection);
        
        return {
          process: parts[0],
          pid: parts[1],
          connection: connection,
          domain: domain
        };
      })
      .filter(conn => conn.domain);
  }

  extractDomain(connection) {
    if (!connection || connection === 'N/A') return null;
    
    // Extract domain from connection string like "192.168.1.1:443" or "example.com:80"
    const match = connection.match(/([^:]+):/);
    if (match) {
      const host = match[1];
      
      // Skip IPv4 addresses
      if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        return null;
      }
      
      // Skip IPv6 addresses and malformed entries
      if (host.includes('[') || host.includes(']') || host.length < 3) {
        return null;
      }
      
      // Only return valid domain names
      if (/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(host)) {
        return host;
      }
    }
    return null;
  }

  analyzeConnections(connections) {
    const newDomains = new Set();
    
    connections.forEach(conn => {
      if (conn.domain && !this.blockedDomains.has(conn.domain)) {
        newDomains.add(conn.domain);
        
        // Check if domain should be blocked
        if (this.shouldBlockDomain(conn.domain)) {
          console.log(`Potentially blocking domain: ${conn.domain}`);
          this.suggestBlock(conn.domain);
        }
      }
    });

    if (newDomains.size > 0) {
      console.log('New domains detected:', Array.from(newDomains));
    }
  }

  shouldBlockDomain(domain) {
    const lowerDomain = domain.toLowerCase();
    return this.nsfwKeywords.some(keyword => lowerDomain.includes(keyword));
  }

  suggestBlock(domain) {
    // Send suggestion to main process
    console.log(`SUGGEST_BLOCK: ${domain}`);
  }
}

// Start monitoring
const monitor = new NetworkMonitor();

// Handle process termination
process.on('SIGINT', () => {
  console.log('Stopping network monitor...');
  monitor.stopMonitoring();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Stopping network monitor...');
  monitor.stopMonitoring();
  process.exit(0);
});
