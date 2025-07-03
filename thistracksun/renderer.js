const { ipcRenderer } = require('electron');

// --- Website Blocker ---
const domainInput = document.getElementById('domain-input');
const blockButton = document.getElementById('block-btn');
const unblockButton = document.getElementById('unblock-btn');

blockButton.onclick = async () => {
  const domain = domainInput.value.trim();
  if (!domain) return;
  const result = await ipcRenderer.invoke('block-site', domain);
  alert(result.message);
  domainInput.value = '';
  updateBlockedSites();
};

unblockButton.onclick = async () => {
  const domain = domainInput.value.trim();
  if (!domain) return;
  const result = await ipcRenderer.invoke('unblock-site', domain);
  alert(result.message);
  domainInput.value = '';
  updateBlockedSites();
};

async function updateBlockedSites() {
  // Optionally, display blocked sites somewhere
  // const blockedSites = await ipcRenderer.invoke('get-blocked-sites');
}

// --- Current Connections ---
async function updateConnections() {
  const connections = await ipcRenderer.invoke('get-active-connections');
  const list = document.getElementById('connection-list');
  list.innerHTML = connections.map(
    c => `<li>${c.process} (${c.pid}): ${c.connection}</li>`
  ).join('');
}

// --- Pomodoro Timer ---
let timerInterval;
let timerSeconds = 1500; // 25 min default
let timerMode = 'work'; // work, break, long-break
let isRunning = false;

const timerDisplay = document.getElementById('timer-display');
const startBtn = document.getElementById('start-timer');
const pauseBtn = document.getElementById('pause-timer');
const resetBtn = document.getElementById('reset-timer');
const workModeBtn = document.getElementById('work-mode');
const breakModeBtn = document.getElementById('break-mode');
const longBreakModeBtn = document.getElementById('long-break-mode');

function updateTimerDisplay() {
  const min = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const sec = String(timerSeconds % 60).padStart(2, '0');
  timerDisplay.textContent = `${min}:${sec}`;
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  timerInterval = setInterval(() => {
    if (timerSeconds > 0) {
      timerSeconds--;
      updateTimerDisplay();
    } else {
      clearInterval(timerInterval);
      isRunning = false;
      // Optionally: play sound or show notification
    }
  }, 1000);
}

function pauseTimer() {
  isRunning = false;
  clearInterval(timerInterval);
}

function resetTimer() {
  isRunning = false;
  clearInterval(timerInterval);
  if (timerMode === 'work') timerSeconds = 1500;
  if (timerMode === 'break') timerSeconds = 300;
  if (timerMode === 'long-break') timerSeconds = 900;
  updateTimerDisplay();
}

function setMode(mode) {
  timerMode = mode;
  if (mode === 'work') timerSeconds = 1500;
  if (mode === 'break') timerSeconds = 300;
  if (mode === 'long-break') timerSeconds = 900;
  resetTimer();
  workModeBtn.classList.toggle('active', mode === 'work');
  breakModeBtn.classList.toggle('active', mode === 'break');
  longBreakModeBtn.classList.toggle('active', mode === 'long-break');
}

startBtn.onclick = startTimer;
pauseBtn.onclick = pauseTimer;
resetBtn.onclick = resetTimer;
workModeBtn.onclick = () => setMode('work');
breakModeBtn.onclick = () => setMode('break');
longBreakModeBtn.onclick = () => setMode('long-break');

updateTimerDisplay();
setMode('work');

// --- Group Study Sessions (UI Only) ---
function generateRoomId() {
  // Simple random room ID (6 chars)
  return Math.random().toString(36).substring(2, 8);
}

document.getElementById('create-session').onclick = () => {
  const roomId = generateRoomId();
  document.getElementById('session-status').innerHTML = `<p>Session created! Share this Room ID: <b>${roomId}</b></p>`;
  startWebRTC(roomId);
};

document.getElementById('join-session').onclick = () => {
  const roomId = document.getElementById('join-room-id').value.trim();
  if (!roomId) return alert('Enter a Room ID');
  document.getElementById('session-status').innerHTML = `<p>Joined session: <b>${roomId}</b></p>`;
  startWebRTC(roomId);
};

window.onload = () => {
  updateBlockedSites();
  updateConnections();
};

// Handle incoming data from main process
ipcRenderer.on('network-activity', (event, data) => {
  // Handle/display incoming network data
  console.log('Network activity:', data);
});
