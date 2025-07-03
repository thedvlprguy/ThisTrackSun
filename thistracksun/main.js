const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs-extra');
const { exec, spawn } = require('child_process');
const os = require('os');

// Keep a global reference of the window object
let mainWindow;
let backgroundService;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Add your icon later
    titleBarStyle: 'default',
    resizable: true,
    minWidth: 800,
    minHeight: 600
  });

  // Load the index.html file
  mainWindow.loadFile('src/index.html');

  // Open DevTools in development
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Start background monitoring service
  startBackgroundService();
}

// Start the background monitoring service
function startBackgroundService() {
  backgroundService = spawn('node', [path.join(__dirname, 'src/services/networkMonitor.js')], {
    stdio: 'pipe'
  });

  backgroundService.stdout.on('data', (data) => {
    console.log(`Background service: ${data}`);
    // Send data to renderer process
    if (mainWindow) {
      mainWindow.webContents.send('network-activity', data.toString());
    }
  });

  backgroundService.stderr.on('data', (data) => {
    console.error(`Background service error: ${data}`);
  });

  backgroundService.on('close', (code) => {
    console.log(`Background service exited with code ${code}`);
  });
}

// App event listeners
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // Kill background service
  if (backgroundService) {
    backgroundService.kill();
  }
  
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for communication with renderer process
ipcMain.handle('get-blocked-sites', async () => {
  try {
    const hostsPath = getHostsPath();
    const hostsContent = await fs.readFile(hostsPath, 'utf8');
    const blockedSites = hostsContent
      .split('\n')
      .filter(line => line.includes('127.0.0.1') && !line.startsWith('#'))
      .map(line => line.split(' ')[1])
      .filter(site => site && site !== 'localhost');
    return blockedSites;
  } catch (error) {
    console.error('Error reading hosts file:', error);
    return [];
  }
});

ipcMain.handle('block-site', async (event, domain) => {
  try {
    const hostsPath = getHostsPath();
    const entry = `127.0.0.1 ${domain}`;
    
    // Check if already blocked
    const hostsContent = await fs.readFile(hostsPath, 'utf8');
    if (hostsContent.includes(entry)) {
      return { success: false, message: 'Site already blocked' };
    }
    
    // Add entry to hosts file
    await fs.appendFile(hostsPath, `\n${entry}`);
    await flushDNS();
    
    return { success: true, message: 'Site blocked successfully' };
  } catch (error) {
    console.error('Error blocking site:', error);
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('unblock-site', async (event, domain) => {
  try {
    const hostsPath = getHostsPath();
    const hostsContent = await fs.readFile(hostsPath, 'utf8');
    const newContent = hostsContent
      .split('\n')
      .filter(line => !line.includes(`127.0.0.1 ${domain}`))
      .join('\n');
    
    await fs.writeFile(hostsPath, newContent);
    await flushDNS();
    
    return { success: true, message: 'Site unblocked successfully' };
  } catch (error) {
    console.error('Error unblocking site:', error);
    return { success: false, message: `Error: ${error.message}` };
  }
});

ipcMain.handle('get-active-connections', async () => {
  return new Promise((resolve) => {
    exec('lsof -i -n', (error, stdout) => {
      if (error) {
        console.error('Error getting connections:', error);
        resolve([]);
        return;
      }
      
      const connections = stdout
        .split('\n')
        .slice(1) // Skip header
        .filter(line => line.trim())
        .map(line => {
          const parts = line.split(/\s+/);
          return {
            process: parts[0],
            pid: parts[1],
            connection: parts[8] || 'N/A'
          };
        });
      
      resolve(connections);
    });
  });
});

ipcMain.handle('request-admin-permission', async () => {
  return new Promise((resolve) => {
    const command = process.platform === 'darwin' 
      ? 'osascript -e "do shell script \\"echo test\\" with administrator privileges"'
      : 'pkexec echo test';
    
    exec(command, (error) => {
      resolve(!error);
    });
  });
});

// Helper functions
function getHostsPath() {
  switch (process.platform) {
    case 'win32':
      return 'C:\\Windows\\System32\\drivers\\etc\\hosts';
    case 'darwin':
    case 'linux':
      return '/etc/hosts';
    default:
      throw new Error('Unsupported platform');
  }
}

function flushDNS() {
  return new Promise((resolve) => {
    let command;
    
    switch (process.platform) {
      case 'win32':
        command = 'ipconfig /flushdns';
        break;
      case 'darwin':
        command = 'sudo killall -HUP mDNSResponder';
        break;
      case 'linux':
        command = 'sudo systemctl restart NetworkManager';
        break;
      default:
        resolve();
        return;
    }
    
    exec(command, (error) => {
      if (error) {
        console.error('Error flushing DNS:', error);
      }
      resolve();
    });
  });
}

// Handle app protocol for deep linking (optional)
app.setAsDefaultProtocolClient('thistracksun');

// Security: prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });
});
