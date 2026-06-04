// ─── Constants & State ───────────────────────────────────────
const STANDARD_GOAL = 90 * 60; // 90 min in seconds
const REST_GOAL = 5 * 60 * 60; // 5 hours in seconds

function isRestDayString(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(y, m - 1, d).getDay();
  return dayOfWeek === 5 || dayOfWeek === 6; // Friday = 5, Saturday = 6
}

function getGoalThreshold(dateStr) {
  return isRestDayString(dateStr) ? REST_GOAL : STANDARD_GOAL;
}

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
let pausedSession = null;   // { id, taskName, startTime, targetDuration, elapsedSeconds }
let timerInterval = null;
let currentTaskName = '';
let editingSessionId = null;
let calendarDate = new Date(); // currently displayed month
let selectedDayStr = null;    // 'YYYY-MM-DD' of tapped day

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
  // Paused session card
  pausedCard: document.getElementById('paused-card'),
  pausedTaskName: document.getElementById('paused-task-name'),
  pausedTimeLabel: document.getElementById('paused-time-label'),
  pausedProgressFill: document.getElementById('paused-progress-fill'),
  btnResume: document.getElementById('btn-resume'),
  btnEndPaused: document.getElementById('btn-end-paused'),
  
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

  // History / Calendar
  btnBackHistory: document.getElementById('btn-back-history'),
  calPrev: document.getElementById('cal-prev'),
  calNext: document.getElementById('cal-next'),
  calMonthLabel: document.getElementById('cal-month-label'),
  calGrid: document.getElementById('cal-grid'),
  dayDetail: document.getElementById('day-detail'),
  dayDetailDate: document.getElementById('day-detail-date'),
  dayDetailTotal: document.getElementById('day-detail-total'),
  dayDetailSessions: document.getElementById('day-detail-sessions'),

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

  // Delete confirm modal
  modalConfirmDelete: document.getElementById('modal-confirm-delete'),
  confirmDeleteDesc: document.getElementById('confirm-delete-desc'),
  btnCancelDelete: document.getElementById('btn-cancel-delete'),
  btnConfirmDelete: document.getElementById('btn-confirm-delete'),
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
  
  // Load paused session (has priority)
  const savedPaused = localStorage.getItem('fitxa_paused_session');
  if (savedPaused) {
    try { pausedSession = JSON.parse(savedPaused); } catch(e) {}
  }
  // Convert any leftover active session to paused (app was closed mid-session)
  const savedSession = localStorage.getItem('fitxa_active_session');
  if (savedSession && !pausedSession) {
    try {
      const sess = JSON.parse(savedSession);
      const elapsed = Math.min(
        Math.floor((Date.now() - sess.startTime) / 1000),
        sess.targetDuration
      );
      pausedSession = { ...sess, elapsedSeconds: elapsed };
      localStorage.removeItem('fitxa_active_session');
      localStorage.setItem('fitxa_paused_session', JSON.stringify(pausedSession));
    } catch(e) {}
  }
}

function saveState() {
  localStorage.setItem('fitxa_state', JSON.stringify(state));
}

function updateDate() {
  const opts = { weekday: 'long', day: 'numeric', month: 'long' };
  els.todayDate.textContent = new Date().toLocaleDateString('ca-ES', opts);

  const todayStr = getTodayString();
  const goalText = isRestDayString(todayStr) ? '5 hores' : '90 minuts';
  const heroSub = document.getElementById('hero-sub');
  if (heroSub) {
    heroSub.textContent = `${goalText} de focus profund avui.`;
  }
}

function getTodayString() {
  return new Date().toISOString().split('T')[0];
}

function recalculateStreaks() {
  const todayStr = getTodayString();
  
  // Generate all date strings for the last 365 days, sorted ascending
  const datesAsc = [];
  const todayDate = new Date();
  for (let i = 365; i >= 0; i--) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - i);
    datesAsc.push(d.toISOString().split('T')[0]);
  }

  let longest = 0;
  let running = 0;

  for (let i = 0; i < datesAsc.length; i++) {
    const dateStr = datesAsc[i];
    const goal = state.dailyGoals[dateStr];
    const seconds = goal ? goal.totalSeconds : 0;
    
    const isRest = isRestDayString(dateStr);
    const threshold = isRest ? REST_GOAL : STANDARD_GOAL;
    const isToday = (i === datesAsc.length - 1);
    
    const goalMet = seconds >= threshold;
    if (goal) {
      goal.goalMet = goalMet ? 1 : 0;
    }

    if (isRest) {
      if (goalMet) {
        running++;
        if (running > longest) longest = running;
      } else {
        // Rest day (Friday/Saturday) with less than 5h.
        // Streak doesn't break, but doesn't increment.
      }
    } else {
      if (goalMet) {
        running++;
        if (running > longest) longest = running;
      } else {
        if (isToday) {
          // Today is in progress, do not break streak
        } else {
          running = 0;
        }
      }
    }
  }

  state.longestStreak = longest;
  state.currentStreak = running;
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
  const todayStr = getTodayString();
  const threshold = getGoalThreshold(todayStr);
  const progress = Math.min(state.todayFocusSeconds / threshold, 1);
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

  // Paused session card
  if (pausedSession) {
    els.pausedCard.style.display = 'flex';
    els.pausedTaskName.textContent = pausedSession.taskName;
    const elapsed = pausedSession.elapsedSeconds;
    const remaining = pausedSession.targetDuration - elapsed;
    const pct = Math.min((elapsed / pausedSession.targetDuration) * 100, 100);
    els.pausedProgressFill.style.width = pct + '%';
    const em = Math.floor(elapsed / 60), es = elapsed % 60;
    const rm = Math.floor(remaining / 60), rs = remaining % 60;
    els.pausedTimeLabel.textContent =
      `${em}:${String(es).padStart(2,'0')} registrats · ${rm}:${String(rs).padStart(2,'0')} restants`;
  } else {
    els.pausedCard.style.display = 'none';
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
  els.btnResume.addEventListener('click', resumePausedSession);
  els.btnEndPaused.addEventListener('click', endPausedSession);
  
  // Focus
  els.btnBack.addEventListener('click', pauseSession);
  els.btnStop.addEventListener('click', pauseSession);
  els.btnDone.addEventListener('click', finishSession);

  // Pause timer when app goes to background; resume when it comes back
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (activeSession && timerInterval) {
        const elapsed = Math.floor((Date.now() - activeSession.startTime) / 1000);
        activeSession._elapsedOnHide = elapsed;
        clearInterval(timerInterval);
        timerInterval = null;
      }
    } else {
      if (activeSession && activeSession._elapsedOnHide !== undefined) {
        activeSession.startTime = Date.now() - (activeSession._elapsedOnHide * 1000);
        delete activeSession._elapsedOnHide;
        tick();
        timerInterval = setInterval(tick, 1000);
      }
    }
  });

  // History / Calendar
  els.btnBackHistory.addEventListener('click', () => {
    hideDayDetail();
    showScreen('home');
  });
  els.calPrev.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  });
  els.calNext.addEventListener('click', () => {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  });
  // Close day detail when tapping outside the panel
  document.getElementById('screen-history').addEventListener('click', (e) => {
    if (!els.dayDetail.contains(e.target) && !e.target.closest('.cal-day')) {
      hideDayDetail();
    }
  });

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

  // Delete Confirm Modal
  els.btnCancelDelete.addEventListener('click', () => els.modalConfirmDelete.classList.remove('active'));
  els.btnConfirmDelete.addEventListener('click', confirmDeleteSession);
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
  // Clear any previous paused session when starting a new one
  pausedSession = null;
  localStorage.removeItem('fitxa_paused_session');
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

// Pause the running session and return to home
function pauseSession() {
  clearInterval(timerInterval);
  timerInterval = null;
  els.timerContainer.classList.remove('running');
  if (!activeSession) { showScreen('home'); return; }

  const elapsed = Math.min(
    Math.floor((Date.now() - activeSession.startTime) / 1000),
    activeSession.targetDuration
  );
  pausedSession = {
    id: activeSession.id,
    taskName: activeSession.taskName,
    startTime: activeSession.startTime,
    targetDuration: activeSession.targetDuration,
    elapsedSeconds: elapsed
  };
  activeSession = null;
  localStorage.removeItem('fitxa_active_session');
  localStorage.setItem('fitxa_paused_session', JSON.stringify(pausedSession));

  showScreen('home');
}

// Resume a paused session
function resumePausedSession() {
  if (!pausedSession) return;
  activeSession = {
    id: pausedSession.id,
    taskName: pausedSession.taskName,
    startTime: Date.now() - (pausedSession.elapsedSeconds * 1000),
    targetDuration: pausedSession.targetDuration
  };
  pausedSession = null;
  localStorage.removeItem('fitxa_paused_session');
  localStorage.setItem('fitxa_active_session', JSON.stringify(activeSession));

  resetFocusUI();
  showScreen('focus');
  resumeTimer();
}

// End a paused session and save it
function endPausedSession() {
  if (!pausedSession) return;
  const duration = pausedSession.elapsedSeconds;
  const dateStr = new Date(pausedSession.startTime).toISOString().split('T')[0];

  state.sessions.push({
    id: pausedSession.id,
    taskName: pausedSession.taskName,
    startTime: pausedSession.startTime,
    endTime: Date.now(),
    duration,
    completed: 0
  });

  if (!state.dailyGoals[dateStr]) state.dailyGoals[dateStr] = { totalSeconds: 0, goalMet: 0 };
  state.dailyGoals[dateStr].totalSeconds += duration;
  const threshold = getGoalThreshold(dateStr);
  if (state.dailyGoals[dateStr].totalSeconds >= threshold) {
    state.dailyGoals[dateStr].goalMet = 1;
  } else {
    state.dailyGoals[dateStr].goalMet = 0;
  }

  pausedSession = null;
  localStorage.removeItem('fitxa_paused_session');
  recalculateStreaks();
  showScreen('home');
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
  const threshold = getGoalThreshold(today);
  if (state.dailyGoals[today].totalSeconds >= threshold) {
    state.dailyGoals[today].goalMet = 1;
  } else {
    state.dailyGoals[today].goalMet = 0;
  }
  
  activeSession = null;
  localStorage.removeItem('fitxa_active_session');
  
  recalculateStreaks();
  
  if (showCompletionCard) {
    els.btnStop.style.display = 'none';
    els.focusStreakPill.style.display = 'none';
    els.completionCard.style.display = 'block';
    
    const durationMins = Math.round(duration / 60);
    if (state.dailyGoals[today].goalMet) {
      els.completionText.innerHTML = `${durationMins} minuts de focus completats.<br/><strong>Meta diària assolida! 🔥</strong>`;
    } else {
      els.completionText.textContent = `${durationMins} minuts de focus completats.`;
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

// ─── Calendar ────────────────────────────────────────────────
function renderHistory() {
  calendarDate = new Date();
  selectedDayStr = null;
  hideDayDetail();
  renderCalendar();
}

function renderCalendar() {
  const year  = calendarDate.getFullYear();
  const month = calendarDate.getMonth(); // 0-indexed

  // Header label
  els.calMonthLabel.textContent = new Date(year, month, 1)
    .toLocaleDateString('ca-ES', { month: 'long', year: 'numeric' })
    .replace(/^./, c => c.toUpperCase());

  // Prevent navigating to future months
  const now = new Date();
  els.calNext.disabled = (year === now.getFullYear() && month >= now.getMonth());
  els.calNext.style.opacity = els.calNext.disabled ? '0.25' : '1';

  // Build sessions index by date
  const sessionsPerDay = {};
  state.sessions.forEach(s => {
    const d = new Date(s.startTime).toISOString().split('T')[0];
    if (!sessionsPerDay[d]) sessionsPerDay[d] = { sessions: [], totalSeconds: 0 };
    sessionsPerDay[d].sessions.push(s);
    sessionsPerDay[d].totalSeconds += s.duration;
  });

  // First day of month (0=Sun … 6=Sat). Convert to Mon-start (0=Mon).
  const firstDay = new Date(year, month, 1);
  let startOffset = firstDay.getDay() - 1; // Mon = 0
  if (startOffset < 0) startOffset = 6;    // Sunday correction

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = getTodayString();

  els.calGrid.innerHTML = '';

  // Empty leading cells
  for (let i = 0; i < startOffset; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day cal-day--empty';
    els.calGrid.appendChild(empty);
  }

  // Day cells
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const dayData  = sessionsPerDay[dateStr];
    const goalData = state.dailyGoals[dateStr];
    const goalMet  = goalData?.goalMet;
    const hasSess  = !!dayData;
    const isToday  = dateStr === todayStr;
    const isFuture = dateStr > todayStr;
    const isSelected = dateStr === selectedDayStr;

    const isRest = isRestDayString(dateStr);

    const cell = document.createElement('button');
    cell.className = [
      'cal-day',
      isRest   ? 'cal-day--rest'     : '',
      goalMet  ? 'cal-day--fire'     : '',
      hasSess && !goalMet ? 'cal-day--partial' : '',
      isToday  ? 'cal-day--today'    : '',
      isFuture ? 'cal-day--future'   : '',
      isSelected ? 'cal-day--selected' : ''
    ].join(' ').trim();
    cell.dataset.date = dateStr;
    cell.disabled = isFuture;

    // Inner HTML: number + optional fire badge
    cell.innerHTML = `
      <span class="cal-day-num">${d}</span>
      ${goalMet ? '<span class="cal-fire">🔥</span>' : ''}
      ${hasSess && !goalMet ? '<span class="cal-dot"></span>' : ''}
    `;

    cell.addEventListener('click', () => selectDay(dateStr, dayData));
    els.calGrid.appendChild(cell);
  }
}

function selectDay(dateStr, dayData) {
  selectedDayStr = dateStr;
  renderCalendar(); // re-render to show selected state

  const dateObj = new Date(dateStr + 'T12:00:00');
  const dateFormatted = dateObj.toLocaleDateString('ca-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  els.dayDetailDate.textContent = dateFormatted.replace(/^./, c => c.toUpperCase());

  if (!dayData || dayData.sessions.length === 0) {
    els.dayDetailTotal.textContent = '';
    els.dayDetailSessions.innerHTML = '<p class="day-detail-empty">Cap sessió enregistrada.</p>';
  } else {
    const totalMins = Math.round(dayData.totalSeconds / 60);
    const goalMet = state.dailyGoals[dateStr]?.goalMet;
    els.dayDetailTotal.textContent = `${totalMins} min${goalMet ? ' 🔥' : ''}`;

    els.dayDetailSessions.innerHTML = '';
    dayData.sessions
      .sort((a, b) => a.startTime - b.startTime)
      .forEach(session => {
        const timeFormatted = new Date(session.startTime).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
        const durationMins  = Math.round(session.duration / 60);
        const div = document.createElement('div');
        div.className = 'history-session';
        div.innerHTML = `
          <div class="history-session-left">
            <span class="history-session-task">${session.taskName}</span>
            <span class="history-session-time">${timeFormatted} • ${durationMins} min ${session.completed ? '🎯' : ''}</span>
          </div>
          <div class="session-row-actions">
            <button class="btn-edit-session" data-id="${session.id}">Editar</button>
            <button class="btn-delete-session" data-id="${session.id}" aria-label="Eliminar sessió">✕</button>
          </div>
        `;
        div.querySelector('.btn-edit-session').addEventListener('click', () => openEditSessionModal(session.id));
        div.querySelector('.btn-delete-session').addEventListener('click', () => deleteSession(session.id, dateStr));
        els.dayDetailSessions.appendChild(div);
      });
  }

  els.dayDetail.classList.add('open');
}

function hideDayDetail() {
  els.dayDetail.classList.remove('open');
  selectedDayStr = null;
}

let pendingDeleteId = null;
let pendingDeleteDateStr = null;

function deleteSession(sessionId, dateStr) {
  const session = state.sessions.find(s => s.id === sessionId);
  if (!session) return;
  pendingDeleteId = sessionId;
  pendingDeleteDateStr = dateStr || new Date(session.startTime).toISOString().split('T')[0];
  const mins = Math.round(session.duration / 60);
  const time = new Date(session.startTime).toLocaleTimeString('ca-ES', { hour: '2-digit', minute: '2-digit' });
  els.confirmDeleteDesc.textContent = `"${session.taskName}" — ${time} · ${mins} min`;
  els.modalConfirmDelete.classList.add('active');
}

function confirmDeleteSession() {
  if (!pendingDeleteId) return;
  const sessionId = pendingDeleteId;
  const sDateStr  = pendingDeleteDateStr;
  pendingDeleteId = null;
  pendingDeleteDateStr = null;
  els.modalConfirmDelete.classList.remove('active');

  const idx = state.sessions.findIndex(s => s.id === sessionId);
  if (idx === -1) return;
  const session = state.sessions[idx];

  // Update daily totals
  if (state.dailyGoals[sDateStr]) {
    state.dailyGoals[sDateStr].totalSeconds = Math.max(
      0, state.dailyGoals[sDateStr].totalSeconds - session.duration
    );
    state.dailyGoals[sDateStr].goalMet =
      state.dailyGoals[sDateStr].totalSeconds >= getGoalThreshold(sDateStr) ? 1 : 0;
  }

  state.sessions.splice(idx, 1);
  recalculateStreaks();
  renderCalendar();

  // Refresh day detail or close it
  const sessionsForDay = state.sessions.filter(
    s => new Date(s.startTime).toISOString().split('T')[0] === sDateStr
  );
  const totalSeconds = sessionsForDay.reduce((sum, s) => sum + s.duration, 0);
  if (sessionsForDay.length > 0) {
    selectDay(sDateStr, { sessions: sessionsForDay, totalSeconds });
  } else {
    hideDayDetail();
  }
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
    state.dailyGoals[dateStr].goalMet = state.dailyGoals[dateStr].totalSeconds >= getGoalThreshold(dateStr) ? 1 : 0;
  }
  
  recalculateStreaks();
  renderCalendar();
  if (selectedDayStr) {
    // Rebuild dayData for the re-opened panel
    const sessionsForDay = state.sessions.filter(s => new Date(s.startTime).toISOString().split('T')[0] === selectedDayStr);
    const totalSeconds = sessionsForDay.reduce((sum, s) => sum + s.duration, 0);
    selectDay(selectedDayStr, sessionsForDay.length ? { sessions: sessionsForDay, totalSeconds } : null);
  }
  els.modalEditSession.classList.remove('active');
  editingSessionId = null;
}

// ─── Boot ────────────────────────────────────────────────────
init();
