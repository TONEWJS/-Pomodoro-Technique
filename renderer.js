const { ipcRenderer } = require('electron');

const CIRCLE = 565.48; // 2 * PI * 90

// State
let durations = { focus: 25, break: 5, long: 15 };
let mode = 'focus';
let timerSec = durations.focus * 60;
let totalSec = timerSec;
let interval = null;
let running = false;
let today = new Date().toDateString();
let count = 0;

// DOM
const $ = (s) => document.querySelector(s);
const $time = $('#time');
const $label = $('#label');
const $ring = $('#ring-fg');
const $start = $('#btn-start');
const $count = $('#count');
const $settings = $('#settings');

// --- Load data ---
(async () => {
  const data = await ipcRenderer.invoke('load-data');
  if (data.history[today]) count = data.history[today];
  $count.textContent = count;
})();

// --- Display ---
function fmt(s) {
  const m = String(Math.floor(s / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

function updateDisplay() {
  $time.textContent = fmt(timerSec);
  const offset = CIRCLE - (timerSec / totalSec) * CIRCLE;
  $ring.style.strokeDashoffset = offset;

  // Color by mode
  const colors = { focus: '#cba6f7', break: '#a6e3a1', long: '#74c7ec' };
  $ring.style.stroke = colors[mode];
  $start.style.background = colors[mode];
}

function setMode(m) {
  mode = m;
  timerSec = durations[mode] * 60;
  totalSec = timerSec;
  const labels = { focus: '专注', break: '休息', long: '长休' };
  $label.textContent = labels[mode];
  stopTimer();
  updateDisplay();
  document.querySelectorAll('.mode-btn').forEach((b) => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
}

// --- Timer ---
function startTimer() {
  if (running) return;
  running = true;
  $start.textContent = '暂停';
  interval = setInterval(() => {
    if (timerSec <= 0) {
      clearInterval(interval);
      running = false;
      $start.textContent = '开始';
      onFinish();
      return;
    }
    timerSec--;
    updateDisplay();
  }, 1000);
}

function stopTimer() {
  clearInterval(interval);
  running = false;
  $start.textContent = '开始';
}

function resetTimer() {
  stopTimer();
  timerSec = durations[mode] * 60;
  totalSec = timerSec;
  updateDisplay();
}

async function onFinish() {
  ipcRenderer.send('notify', {
    title: mode === 'focus' ? '专注时间结束！' : '休息时间结束！',
    body: mode === 'focus' ? '做得不错，休息一下吧~' : '可以开始新的番茄钟了！',
  });

  if (mode === 'focus') {
    const data = await ipcRenderer.invoke('load-data');
    const t = new Date().toDateString();
    data.history[t] = (data.history[t] || 0) + 1;
    await ipcRenderer.invoke('save-data', data);
    today = t;
    count = data.history[t];
    $count.textContent = count;
  }

  timerSec = durations[mode] * 60;
  totalSec = timerSec;
  updateDisplay();

  // Show notification window
  ipcRenderer.send('notify', {
    title: '⏰ 番茄钟',
    body: mode === 'focus'
      ? `专注完成！今日 ${count} 个番茄`
      : '时间到，继续加油！',
  });
}

// --- Events ---
$start.addEventListener('click', () => {
  if (running) stopTimer();
  else startTimer();
});

$('#btn-reset').addEventListener('click', resetTimer);

document.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

// Titlebar
$('#btn-close').addEventListener('click', () => ipcRenderer.send('close-window'));

$('#btn-min').addEventListener('click', () => {
  $settings.style.display = $settings.style.display === 'none' ? 'flex' : 'none';
});

$('#btn-save-settings').addEventListener('click', () => {
  const f = parseInt($('#set-focus').value);
  const b = parseInt($('#set-break').value);
  const l = parseInt($('#set-long').value);
  if (f > 0) durations.focus = f;
  if (b > 0) durations.break = b;
  if (l > 0) durations.long = l;
  document.querySelectorAll('.mode-btn').forEach((btn) => {
    const m = btn.dataset.mode;
    btn.textContent = (
      m === 'focus' ? '专注 ' : m === 'break' ? '休息 ' : '长休 '
    ) + durations[m];
  });
  resetTimer();
  $settings.style.display = 'none';
});

let pinned = true;
$('#btn-pin').addEventListener('click', () => {
  pinned = !pinned;
  $('#btn-pin').style.opacity = pinned ? '1' : '0.4';
});

// Initial
updateDisplay();
