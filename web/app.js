// ─── Constants & State ───────────────────────────────────────
const FOCUS_DURATION = 90 * 60; // 90 minutes in seconds
const DEFAULT_CHIPS = ['Deep Work', 'Codi', 'Lectura', 'Disseny', 'Planificació', 'Escriptura'];

let state = {
  currentStreak: 0,
  longestStreak: 0,
  todayFocusSeconds: 0,
  sessions: [], // { id, taskName, startTime, endTime, duration, completed }
  dailyGoals: {}, // date -> { totalSeconds, goalMet }
  customChips: [...DEFAULT_CHIPS]
};

let activeSession = null;
let timerInterval = null;
let currentTaskName = '';
let editingSessionId = null;

// ─── DOM Elements ────────────────────────────────────────────
const els = {
  // Screens
  screenHome: document.getElementById('screen-home'),
  screenFocus: document.getElementById('screen-focus'),
  screenHistory: document.getElementById('screen-history'),
  
  // Home
  todayDate: document.getElementById('today-date'),
  streakCount: document.getElementById('streak-count'),
  streakFill: document.getElementById('streak-fill'),
  streakLabel: document.getElementById('streak-label'),
  taskInput: document.getElementById('task-input'),
  durationInput: document.getElementById('duration-input'),
  chipsContainer: document.getElementById('chips'),
  btnEditChips: document.getElementById('btn-edit-chips'),
  btnStart: document.getElementById('btn-start'),
  statsRow: document.getElementById('stats-row'),
  statStreak: document.getElementById('stat-streak'),
  statBest: document.getElementById('stat-best'),
  statToday: document.getElementById('stat-today'),
  btnOpenHistory: document.getElementById('btn-open-history'),
  
  // Focus
  btnBack: document.getElementById('btn-back'),
  focusTaskName: document.getElementById('focus-task-name'),
  ringProgress: document.getElementById('ring-progress'),
  timerTime: document.getElementById('timer-time'),
  focusStreakPill: document.getElementById('focus-streak-pill'),
  focusStreakText: document.getElementById('focus-streak-text'),
  btnStop: document.getElementById('btn-stop'),
  completionCard: document.getElementById('completion-card'),
  completionText: document.getElementById('completion-text'),
  btnDone: document.getElementById('btn-done'),
  timerContainer: document.querySelector('.timer-container'),

  // History
  btnBackHistory: document.getElementById('btn-back-history'),
  historyList: document.getElementById('history-list'),

  // Modals
  modalChips: document.getElementById('modal-chips'),
  newChipInput: document.getElementById('new-chip-input'),
  btnAddChip: document.getElementById('btn-add-chip'),
  chipEditList: document.getElementById('chip-edit-list'),
  btnCloseChipsModal: document.getElementById('btn-close-chips-modal'),

  modalEditSession: document.getElementById('modal-edit-session'),
  editSessionTaskName: document.getElementById('edit-session-task-name'),
  editSessionTime: document.getElementById('edit-session-time'),
  btnCancelEdit: document.getElementById('btn-cancel-edit'),
  btnSaveSession: document.getElementById('btn-save-session'),
};

// ─── Initialization ──────────────────────────────────────────
function init() {
  loadState();
  updateDate();
  recalculateStreaks();
  renderChips();
  bindEvents();
  renderHome();
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => console.error('SW Error:', err));
  }
}

function loadState() {
  const saved = localStorage.getItem('fitxa_state');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
      if (!state.sessions) state.sessions = [];
      if (!state.dailyGoals) state.dailyGoals = {};
      if (!state.customChips || state.customChips.length === 0) state.customChips = [...DEFAULT_CHIPS];
    } catch (e) {
      console.error('Error parsing state', e);
    }
  }
  
  const savedSession = localStorage.getItem('fitxa_active_session');
  if (savedSession) {
    try {
      activeSession = JSON.parse(savedSession);
      currentTaskName = activeSession.taskName;
      showScreen('focus');
      resumeTimer();
    } catch (e) {
      console.error('Error parsing active session', e);
    }
  }
}

function saveState() {
  localStorage.setItem('fitxa_state', JSON.stringify(state));
}

function updateDate() {
  const opts = { weekday: 'long', day: 'numeric', month: 'long' };
  els.todayDate.textContent = new Date().toLocaleDateString('ca-ES', opts);
}

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function recalculateStreaks() {
  const dates = Object.keys(state.dailyGoals).sort().reverse();
  
  let current = 0;
  let longest = 0;
  let running = 0;
  
  const todayStr = getTodayString();
  const todayMet = state.dailyGoals[todayStr]?.goalMet;
  
  dates.forEach(date => {
    if (state.dailyGoals[date].goalMet) {
      running++;
      if (running > longest) longest = running;
    } else {
      running = 0;
    }
  });
  state.longestStreak = longest;
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  if (todayMet) {
    current = 1;
    let d = new Date(yesterday);
    while (state.dailyGoals[d.toISOString().split('T')[0]]?.goalMet) {
      current++;
      d.setDate(d.getDate() - 1);
    }
  } else if (state.dailyGoals[yesterdayStr]?.goalMet) {
    let d = new Date(yesterday);
    while (state.dailyGoals[d.toISOString().split('T')[0]]?.goalMet) {
      current++;
      d.setDate(d.getDate() - 1);
    }
  }
  state.currentStreak = current;
  state.todayFocusSeconds = state.dailyGoals[todayStr]?.totalSeconds || 0;
  
  saveState();
}

// ─── UI Logic ────────────────────────────────────────────────
function showScreen(screenName) {
  els.screenHome.classList.remove('active');
  els.screenFocus.classList.remove('active');
  els.screenHistory.classList.remove('active');
  
  if (screenName === 'home') {
    renderHome();
    els.screenHome.classList.add('active');
  } else if (screenName === 'focus') {
    els.screenFocus.classList.add('active');
  } else if (screenName === 'history') {
    renderHistory();
    els.screenHistory.classList.add('active');
  }
}

function renderHome() {
  els.streakCount.textContent = state.currentStreak;
  const progress = Math.min(state.todayFocusSeconds / FOCUS_DURATION, 1);
  els.streakFill.style.width = `${progress * 100}%`;
  
  if (progress >= 1) {
    els.streakFill.style.backgroundColor = 'var(--gold)';
    els.streakLabel.textContent = '✓ Meta assolida';
    els.streakCount.style.color = 'var(--gold)';
  } else {
    els.streakFill.style.backgroundColor = 'var(--primary)';
    els.streakLabel.textContent = `${Math.round(progress * 100)}% avui`;
    els.streakCount.style.color = state.currentStreak > 0 ? 'var(--orange)' : 'var(--text-muted)';
  }
  
  if (state.longestStreak > 0 || state.todayFocusSeconds > 0) {
    els.statsRow.style.display = 'flex';
    els.statStreak.textContent = state.currentStreak;
    els.statBest.textContent = state.longestStreak;
    els.statToday.textContent = Math.round(state.todayFocusSeconds / 60);
  } else {
    els.statsRow.style.display = 'none';
  }
  
  validateInput();
}

function renderChips() {
  els.chipsContainer.innerHTML = '';
  state.customChips.forEach(chipName => {
    const btn = document.createElement('button');
    btn.className = `chip ${chipName === currentTaskName ? 'active' : ''}`;
    btn.dataset.task = chipName;
    btn.textContent = chipName;
    btn.addEventListener('click', () => {
      currentTaskName = chipName;
      els.taskInput.value = currentTaskName;
      renderChips();
      validateInput();
    });
    els.chipsContainer.appendChild(btn);
  });
}

function bindEvents() {
  // Home
  els.taskInput.addEventListener('input', (e) => {
    currentTaskName = e.target.value;
    renderChips();
    validateInput();
  });
  els.durationInput.addEventListener('input', validateInput);
  
  els.taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && currentTaskName.trim()) startSession();
  });
  els.durationInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && currentTaskName.trim()) startSession();
  });
  
  els.btnStart.addEventListener('click', startSession);
  els.btnOpenHistory.addEventListener('click', () => showScreen('history'));
  
  // Focus
  els.btnBack.addEventListener('click', () => endSession(0));
  els.btnStop.addEventListener('click', () => endSession(0));
  els.btnDone.addEventListener('click', finishSession);

  // History
  els.btnBackHistory.addEventListener('click', () => showScreen('home'));

  // Edit Chips Modal
  els.btnEditChips.addEventListener('click', openChipsModal);
  els.btnCloseChipsModal.addEventListener('click', () => els.modalChips.classList.remove('active'));
  els.btnAddChip.addEventListener('click', addChip);
  els.newChipInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addChip();
  });

  // Edit Session Modal
  els.btnCancelEdit.addEventListener('click', () => els.modalEditSession.classList.remove('active'));
  els.btnSaveSession.addEventListener('click', saveSessionEdit);
}

function validateInput() {
  const isValid = currentTaskName.trim().length > 0;
  const mins = parseInt(els.durationInput.value, 10) || 0;
  const isTimeValid = mins > 0;
  
  els.btnStart.disabled = !(isValid && isTimeValid);
  if (isValid && isTimeValid) {
    els.btnStart.textContent = `▶ Inicia ${mins} min de Focus`;
  } else if (!isValid) {
    els.btnStart.textContent = 'Escriu el nom de la tasca';
  } else {
    els.btnStart.textContent = 'Introdueix un temps vàlid';
  }
}

// ─── Timer Logic ─────────────────────────────────────────────
function startSession() {
  if (!currentTaskName.trim()) return;
  const mins = parseInt(els.durationInput.value, 10) || 90;
  
  activeSession = {
    id: Date.now(),
    taskName: currentTaskName.trim(),
    startTime: Date.now(),
    targetDuration: mins * 60
  };
  localStorage.setItem('fitxa_active_session', JSON.stringify(activeSession));
  
  els.focusTaskName.textContent = activeSession.taskName;
  els.taskInput.value = '';
  currentTaskName = '';
  renderChips();
  
  resetFocusUI();
  showScreen('focus');
  resumeTimer();
}

function resumeTimer() {
  els.focusTaskName.textContent = activeSession.taskName;
  els.timerContainer.classList.add('running');
  
  els.focusStreakText.textContent = state.currentStreak > 0 
    ? `Ratxa de ${state.currentStreak} dies` 
    : 'Inicia la teva ratxa avui';
  
  tick();
  timerInterval = setInterval(tick, 1000);
}

function tick() {
  if (!activeSession) return;
  
  const now = Date.now();
  const elapsed = Math.floor((now - activeSession.startTime) / 1000);
  const remaining = Math.max(activeSession.targetDuration - elapsed, 0);
  
  updateTimerUI(elapsed, remaining);
  
  if (remaining <= 0) {
    completeSession();
  }
}

function updateTimerUI(elapsed, remaining) {
  const m = Math.floor(remaining / 60).toString().padStart(2, '0');
  const s = (remaining % 60).toString().padStart(2, '0');
  els.timerTime.textContent = `${m}:${s}`;
  
  const progress = Math.min(elapsed / activeSession.targetDuration, 1);
  const circumference = 2 * Math.PI * 108; // 678.6
  const offset = circumference - (progress * circumference);
  els.ringProgress.style.strokeDashoffset = offset;
}

function resetFocusUI() {
  els.completionCard.style.display = 'none';
  els.btnStop.style.display = 'block';
  els.focusStreakPill.style.display = 'flex';
  els.ringProgress.classList.remove('completed');
  // Esborrada la línia fixa de 90 minuts i dashoffset per defecte;
  // tick() farà l'update visual al primer segon.
}

function completeSession() {
  clearInterval(timerInterval);
  els.timerContainer.classList.remove('running');
  els.ringProgress.classList.add('completed');
  
  endSession(1, true);
}

function endSession(completed, showCompletionCard = false) {
  clearInterval(timerInterval);
  els.timerContainer.classList.remove('running');
  
  if (!activeSession) return;
  
  const now = Date.now();
  const duration = Math.min(Math.floor((now - activeSession.startTime) / 1000), activeSession.targetDuration);
  
  state.sessions.push({
    ...activeSession,
    endTime: now,
    duration,
    completed
  });
  
  const today = getTodayString();
  if (!state.dailyGoals[today]) {
    state.dailyGoals[today] = { totalSeconds: 0, goalMet: 0 };
  }
  state.dailyGoals[today].totalSeconds += duration;
  if (state.dailyGoals[today].totalSeconds >= FOCUS_DURATION) {
    state.dailyGoals[today].goalMet = 1;
  }
  
  activeSession = null;
  localStorage.removeItem('fitxa_active_session');
  
  recalculateStreaks();
  
  if (showCompletionCard) {
    els.btnStop.style.display = 'none';
    els.focusStreakPill.style.display = 'none';
    els.completionCard.style.display = 'block';
    
    if (state.dailyGoals[today].goalMet) {
      els.completionText.innerHTML = '90 minuts de focus profund completats.<br/><strong>Meta diària assolida! 🔥</strong>';
    } else {
      els.completionText.textContent = '90 minuts de focus profund completats.';
    }
  } else {
    showScreen('home');
  }
}

function finishSession() {
  showScreen('home');
}

// ─── Modals Logic ────────────────────────────────────────────

// Chips
function openChipsModal() {
  renderEditChipsList();
  els.modalChips.classList.add('active');
  els.newChipInput.value = '';
  els.newChipInput.focus();
}

function renderEditChipsList() {
  els.chipEditList.innerHTML = '';
  state.customChips.forEach((chip, index) => {
    const li = document.createElement('li');
    li.className = 'chip-edit-item';
    li.innerHTML = `
      <span>${chip}</span>
      <button class="btn-delete-chip" data-index="${index}">×</button>
    `;
    li.querySelector('button').addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      state.customChips.splice(idx, 1);
      saveState();
      renderEditChipsList();
      renderChips();
    });
    els.chipEditList.appendChild(li);
  });
}

function addChip() {
  const val = els.newChipInput.value.trim();
  if (val && !state.customChips.includes(val)) {
    state.customChips.push(val);
    saveState();
    renderEditChipsList();
    renderChips();
    els.newChipInput.value = '';
  }
}

// History & Edit Session
function renderHistory() {
  els.historyList.innerHTML = '';
  
  if (state.sessions.length === 0) {
    els.historyList.innerHTML = '<div class="empty-history">Encara no hi ha sessions guardades.</div>';
    return;
  }

  // Group by date
  const groups = {};
  state.sessions.forEach(session => {
    const dateStr = new Date(session.startTime).toISOString().split('T')[0];
    if (!groups[dateStr]) groups[dateStr] = { sessions: [], totalSeconds: 0 };
    groups[dateStr].sessions.push(session);
    groups[dateStr].totalSeconds += session.duration;
  });

  const sortedDates = Object.keys(groups).sort().reverse();

  sortedDates.forEach(dateStr => {
    const group = groups[dateStr];
    const dateObj = new Date(dateStr);
    const dateFormatted = dateObj.toLocaleDateString('ca-ES', { weekday: 'short', day: 'numeric', month: 'short' });
    const totalMinutes = Math.round(group.totalSeconds / 60);

    const dayDiv = document.createElement('div');
    dayDiv.className = 'history-day';
    
    dayDiv.innerHTML = `
      <div class="history-day-header">
        <span class="history-day-date">${dateFormatted}</span>
        <span class="history-day-total">${totalMinutes} min total</span>
      </div>
    `;

    // Sort sessions within day by time descending
    group.sessions.sort((a, b) => b.startTime - a.startTime).forEach(session => {
      const timeFormatted = new Date(session.startTime).toLocaleTimeString('ca-ES', { hour: '2-digit', minute:'2-digit' });
      const durationMins = Math.round(session.duration / 60);
      
      const sessDiv = document.createElement('div');
      sessDiv.className = 'history-session';
      sessDiv.innerHTML = `
        <div class="history-session-left">
          <span class="history-session-task">${session.taskName}</span>
          <span class="history-session-time">${timeFormatted} &bull; ${durationMins} min ${session.completed ? '🎯' : ''}</span>
        </div>
        <button class="btn-edit-session" data-id="${session.id}">Editar</button>
      `;
      
      sessDiv.querySelector('.btn-edit-session').addEventListener('click', () => openEditSessionModal(session.id));
      dayDiv.appendChild(sessDiv);
    });

    els.historyList.appendChild(dayDiv);
  });
}

function openEditSessionModal(sessionId) {
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session) return;
  
  editingSessionId = sessionId;
  els.editSessionTaskName.textContent = session.taskName;
  els.editSessionTime.value = Math.round(session.duration / 60);
  
  els.modalEditSession.classList.add('active');
}

function saveSessionEdit() {
  if (!editingSessionId) return;
  
  const newMinutes = parseInt(els.editSessionTime.value, 10);
  if (isNaN(newMinutes) || newMinutes < 0) return;
  
  const session = state.sessions.find(s => s.id === editingSessionId);
  if (!session) return;
  
  const oldDuration = session.duration;
  const newDuration = newMinutes * 60;
  
  // Update session
  session.duration = newDuration;
  
  // Update daily goals for that session's date
  const dateStr = new Date(session.startTime).toISOString().split('T')[0];
  if (state.dailyGoals[dateStr]) {
    state.dailyGoals[dateStr].totalSeconds = Math.max(0, state.dailyGoals[dateStr].totalSeconds - oldDuration + newDuration);
    state.dailyGoals[dateStr].goalMet = state.dailyGoals[dateStr].totalSeconds >= FOCUS_DURATION ? 1 : 0;
  }
  
  recalculateStreaks();
  renderHistory();
  els.modalEditSession.classList.remove('active');
  editingSessionId = null;
}

// ─── Boot ────────────────────────────────────────────────────
init();
