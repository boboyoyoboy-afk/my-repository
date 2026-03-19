const STORAGE_KEY = 'monthly-days-off-calendar-state';
const defaults = {
  workStartDate: '',
  backgroundImage: '',
  theme: {
    primary: '#5263ff',
    accent: '#ff7a59',
    surface: '#ffffff',
    eventColors: {
      dayOff: '#5263ff',
      nationalHoliday: '#ff8f70',
      familyOccasion: '#58c4a5',
      custom: '#a26bff',
    },
  },
  customEventLabel: 'Custom event',
  events: {},
};

const state = loadState();
let viewDate = new Date();
let selectedDateKey = formatDateKey(new Date());

const monthLabel = document.getElementById('monthLabel');
const monthMeta = document.getElementById('monthMeta');
const calendarGrid = document.getElementById('calendarGrid');
const weekdayRow = document.getElementById('weekdayRow');
const daysOffCounter = document.getElementById('daysOffCounter');
const counterHelper = document.getElementById('counterHelper');
const statsGrid = document.getElementById('statsGrid');
const legendList = document.getElementById('legendList');
const workStartDateInput = document.getElementById('workStartDate');
const eventModal = document.getElementById('eventModal');
const modalDateLabel = document.getElementById('modalDateLabel');
const eventOptions = document.getElementById('eventOptions');
const settingsModal = document.getElementById('settingsModal');
const primaryColorInput = document.getElementById('primaryColor');
const accentColorInput = document.getElementById('accentColor');
const surfaceColorInput = document.getElementById('surfaceColor');
const dayOffColorInput = document.getElementById('dayOffColor');
const holidayColorInput = document.getElementById('holidayColor');
const familyColorInput = document.getElementById('familyColor');
const customColorInput = document.getElementById('customColor');
const backgroundUploadInput = document.getElementById('backgroundUpload');
const customEventLabelInput = document.getElementById('customEventLabel');
const backgroundLayer = document.getElementById('backgroundLayer');
const statCardTemplate = document.getElementById('statCardTemplate');

const eventDefinitions = () => ([
  { key: 'dayOff', label: 'Day off', color: 'var(--dayoff)', affectsCounter: true },
  { key: 'nationalHoliday', label: 'National holiday', color: 'var(--holiday)', affectsCounter: false },
  { key: 'familyOccasion', label: 'Family occasion', color: 'var(--family)', affectsCounter: false },
  { key: 'custom', label: state.customEventLabel || defaults.customEventLabel, color: 'var(--custom)', affectsCounter: false },
]);

initialize();

function initialize() {
  renderWeekdays();
  bindEvents();
  syncSettingsInputs();
  applyTheme();
  renderAll();
}

function bindEvents() {
  document.getElementById('prevMonth').addEventListener('click', () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1);
    renderAll();
  });

  document.getElementById('nextMonth').addEventListener('click', () => {
    viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    renderAll();
  });

  document.getElementById('openSettings').addEventListener('click', () => {
    syncSettingsInputs();
    settingsModal.showModal();
  });

  workStartDateInput.addEventListener('change', (event) => {
    state.workStartDate = event.target.value;
    saveState();
    renderAll();
  });

  backgroundUploadInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    state.backgroundImage = await fileToDataUrl(file);
    saveState();
    applyTheme();
  });

  primaryColorInput.addEventListener('input', (event) => updateThemeColor('primary', event.target.value));
  accentColorInput.addEventListener('input', (event) => updateThemeColor('accent', event.target.value));
  surfaceColorInput.addEventListener('input', (event) => updateThemeColor('surface', event.target.value));
  dayOffColorInput.addEventListener('input', (event) => updateEventColor('dayOff', event.target.value));
  holidayColorInput.addEventListener('input', (event) => updateEventColor('nationalHoliday', event.target.value));
  familyColorInput.addEventListener('input', (event) => updateEventColor('familyOccasion', event.target.value));
  customColorInput.addEventListener('input', (event) => updateEventColor('custom', event.target.value));

  customEventLabelInput.addEventListener('input', (event) => {
    state.customEventLabel = event.target.value.trim() || defaults.customEventLabel;
    saveState();
    renderAll();
  });

  document.getElementById('resetSettings').addEventListener('click', () => {
    state.theme = cloneTheme(defaults.theme);
    state.backgroundImage = '';
    state.customEventLabel = defaults.customEventLabel;
    syncSettingsInputs();
    saveState();
    applyTheme();
    renderAll();
  });

  settingsModal.addEventListener('close', () => {
    syncSettingsInputs();
    applyTheme();
    renderAll();
  });

  eventModal.addEventListener('close', () => {
    renderAll();
  });
}

function renderAll() {
  renderCalendar();
  renderSidebar();
  renderLegend();
  renderSelectedDateOptions();
}

function renderWeekdays() {
  weekdayRow.innerHTML = '';
  ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach((day) => {
    const label = document.createElement('div');
    label.className = 'weekday';
    label.textContent = day;
    weekdayRow.append(label);
  });
}

function renderCalendar() {
  calendarGrid.innerHTML = '';
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const gridStart = new Date(firstDay);
  gridStart.setDate(firstDay.getDate() - firstDay.getDay());

  monthLabel.textContent = firstDay.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  monthMeta.textContent = describeAccrualSchedule(firstDay);

  for (let index = 0; index < 42; index += 1) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + index);
    const dateKey = formatDateKey(cellDate);
    const inMonth = cellDate.getMonth() === month;
    const isToday = dateKey === formatDateKey(new Date());
    const isSelected = dateKey === selectedDateKey;

    const cell = document.createElement('article');
    cell.className = `day-cell${inMonth ? '' : ' outside'}${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}`;
    cell.tabIndex = 0;
    cell.setAttribute('role', 'button');
    cell.setAttribute('aria-label', `Open events for ${formatLongDate(dateKey)}`);
    cell.addEventListener('click', () => openDateModal(dateKey));
    cell.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDateModal(dateKey);
      }
    });

    const header = document.createElement('div');
    header.className = 'day-header';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'date-button';
    button.textContent = String(cellDate.getDate());
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      openDateModal(dateKey);
    });

    const smallTag = document.createElement('span');
    smallTag.className = 'muted small';
    smallTag.textContent = inMonth ? '' : cellDate.toLocaleDateString(undefined, { month: 'short' });

    header.append(button, smallTag);

    const pillList = document.createElement('div');
    pillList.className = 'pill-list';

    getActiveEventKeys(dateKey).forEach((eventKey) => {
      const definition = getEventDefinition(eventKey);
      if (!definition) return;
      const pill = document.createElement('div');
      pill.className = 'event-pill';
      pill.dataset.type = eventKey;

      const label = document.createElement('span');
      label.textContent = getEventDisplayLabel(dateKey, eventKey);

      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'delete-pill';
      deleteButton.setAttribute('aria-label', `Delete ${definition.label} event`);
      deleteButton.textContent = '×';
      deleteButton.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleEvent(dateKey, eventKey, false);
      });

      pill.append(label, deleteButton);
      pillList.append(pill);
    });

    cell.append(header, pillList);
    calendarGrid.append(cell);
  }
}

function renderSidebar() {
  workStartDateInput.value = state.workStartDate;

  const currentMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
  const accruedDaysOff = calculateAccruedDaysOff(currentMonth);
  const usedDaysOff = getUsedDayOffCount();
  const remainingDaysOff = Math.max(accruedDaysOff - usedDaysOff, 0);
  const currentMonthUsage = getMonthEventCount(currentMonth, 'dayOff');
  const currentMonthEvents = getTotalEventsInMonth(currentMonth);

  daysOffCounter.textContent = String(remainingDaysOff);
  counterHelper.textContent = state.workStartDate
    ? `${accruedDaysOff} accrued − ${usedDaysOff} used since ${formatLongDate(state.workStartDate)}.`
    : 'Choose a work start date to begin monthly accruals.';

  const stats = [
    ['Accrued months', String(accruedDaysOff)],
    ['Used day off events', String(usedDaysOff)],
    ['This month days off', String(currentMonthUsage)],
    ['This month total events', String(currentMonthEvents)],
  ];

  statsGrid.innerHTML = '';
  stats.forEach(([label, value]) => {
    const clone = statCardTemplate.content.firstElementChild.cloneNode(true);
    clone.querySelector('.stat-label').textContent = label;
    clone.querySelector('.stat-value').textContent = value;
    statsGrid.append(clone);
  });
}

function renderLegend() {
  legendList.innerHTML = '';
  eventDefinitions().forEach((definition) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = definition.color;
    const text = document.createElement('span');
    text.textContent = definition.label;
    item.append(swatch, text);
    legendList.append(item);
  });
}

function renderSelectedDateOptions() {
  modalDateLabel.textContent = formatLongDate(selectedDateKey);
  eventOptions.innerHTML = '';

  eventDefinitions().forEach((definition) => {
    const row = document.createElement('div');
    row.className = `checkbox-item${definition.key === 'custom' ? ' custom-row' : ''}`;

    const left = document.createElement('label');
    left.className = 'checkbox-left';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = getDateEntry(selectedDateKey).types[definition.key];
    checkbox.addEventListener('change', (event) => {
      toggleEvent(selectedDateKey, definition.key, event.target.checked);
    });

    const text = document.createElement('span');
    text.textContent = definition.key === 'custom' ? 'Custom event' : definition.label;
    left.append(checkbox, text);

    row.append(left);

    if (definition.key === 'custom') {
      const customInput = document.createElement('input');
      customInput.type = 'text';
      customInput.className = 'inline-text-input';
      customInput.maxLength = 28;
      customInput.placeholder = state.customEventLabel || defaults.customEventLabel;
      customInput.value = getDateEntry(selectedDateKey).customLabel;
      customInput.setAttribute('aria-label', 'Custom event name');
      customInput.addEventListener('click', (event) => event.stopPropagation());
      customInput.addEventListener('input', (event) => {
        updateCustomLabel(selectedDateKey, event.target.value);
      });
      row.append(customInput);
    }

    eventOptions.append(row);
  });
}

function openDateModal(dateKey) {
  selectedDateKey = dateKey;
  renderSelectedDateOptions();
  renderCalendar();
  eventModal.showModal();
}

function toggleEvent(dateKey, eventKey, enabled) {
  const entry = ensureDateEntry(dateKey);
  entry.types[eventKey] = enabled;

  if (!enabled && eventKey === 'custom' && !entry.customLabel) {
    entry.customLabel = '';
  }

  cleanupDateEntry(dateKey);
  saveState();
  renderAll();
}

function updateCustomLabel(dateKey, label) {
  const entry = ensureDateEntry(dateKey);
  entry.customLabel = label.slice(0, 28);
  cleanupDateEntry(dateKey);
  saveState();

  if (entry.types.custom) {
    renderCalendar();
  }
}

function calculateAccruedDaysOff(monthDate) {
  if (!state.workStartDate) return 0;

  const start = new Date(`${state.workStartDate}T00:00:00`);
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  if (monthStart <= start) {
    return 0;
  }

  const firstAccrualMonth = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  if (monthStart < firstAccrualMonth) {
    return 0;
  }

  return ((monthStart.getFullYear() - firstAccrualMonth.getFullYear()) * 12)
    + (monthStart.getMonth() - firstAccrualMonth.getMonth())
    + 1;
}

function getUsedDayOffCount() {
  if (!state.workStartDate) return 0;
  const startKey = state.workStartDate;

  return Object.keys(state.events).reduce((total, dateKey) => {
    const entry = getDateEntry(dateKey);
    return total + (dateKey >= startKey && entry.types.dayOff ? 1 : 0);
  }, 0);
}

function getMonthEventCount(monthDate, eventKey) {
  const prefix = getMonthPrefix(monthDate);
  return Object.keys(state.events).reduce((total, dateKey) => {
    const entry = getDateEntry(dateKey);
    return total + (dateKey.startsWith(prefix) && entry.types[eventKey] ? 1 : 0);
  }, 0);
}

function getTotalEventsInMonth(monthDate) {
  const prefix = getMonthPrefix(monthDate);
  return Object.keys(state.events).reduce((total, dateKey) => {
    return total + (dateKey.startsWith(prefix) ? getActiveEventKeys(dateKey).length : 0);
  }, 0);
}

function describeAccrualSchedule(monthDate) {
  if (!state.workStartDate) {
    return 'Set a work start date to begin monthly accrual tracking.';
  }

  const nextAccrual = getNextAccrualDate();
  const currentMonthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const currentAccrued = calculateAccruedDaysOff(currentMonthStart);

  return `${currentAccrued} total day off credit${currentAccrued === 1 ? '' : 's'} accrued for this view. Next +1 on ${formatLongDate(nextAccrual)}.`;
}

function getNextAccrualDate() {
  if (!state.workStartDate) return new Date();
  const start = new Date(`${state.workStartDate}T00:00:00`);
  const today = new Date();
  const todayMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const candidate = new Date(start.getFullYear(), start.getMonth() + 1, 1);

  if (candidate > todayMonthStart) {
    return candidate;
  }

  return new Date(today.getFullYear(), today.getMonth() + 1, 1);
}

function syncSettingsInputs() {
  primaryColorInput.value = state.theme.primary;
  accentColorInput.value = state.theme.accent;
  surfaceColorInput.value = state.theme.surface;
  dayOffColorInput.value = state.theme.eventColors.dayOff;
  holidayColorInput.value = state.theme.eventColors.nationalHoliday;
  familyColorInput.value = state.theme.eventColors.familyOccasion;
  customColorInput.value = state.theme.eventColors.custom;
  customEventLabelInput.value = state.customEventLabel;
  workStartDateInput.value = state.workStartDate;
}

function updateThemeColor(key, value) {
  state.theme[key] = value;
  saveState();
  applyTheme();
}

function updateEventColor(key, value) {
  state.theme.eventColors[key] = value;
  saveState();
  applyTheme();
  renderAll();
}

function applyTheme() {
  document.documentElement.style.setProperty('--primary', state.theme.primary);
  document.documentElement.style.setProperty('--accent', state.theme.accent);
  document.documentElement.style.setProperty('--surface', state.theme.surface);
  document.documentElement.style.setProperty('--surface-muted', hexToRgba(state.theme.surface, 0.82));
  document.documentElement.style.setProperty('--border', hexToRgba(state.theme.primary, 0.16));
  document.documentElement.style.setProperty('--dayoff', state.theme.eventColors.dayOff);
  document.documentElement.style.setProperty('--holiday', state.theme.eventColors.nationalHoliday);
  document.documentElement.style.setProperty('--family', state.theme.eventColors.familyOccasion);
  document.documentElement.style.setProperty('--custom', state.theme.eventColors.custom);
  backgroundLayer.style.backgroundImage = state.backgroundImage ? `url(${state.backgroundImage})` : 'none';
}

function getDateEntry(dateKey) {
  const entry = normalizeDateEntry(state.events[dateKey]);
  return entry;
}

function ensureDateEntry(dateKey) {
  const entry = normalizeDateEntry(state.events[dateKey]);
  state.events[dateKey] = entry;
  return entry;
}

function cleanupDateEntry(dateKey) {
  const entry = state.events[dateKey];
  if (!entry) return;

  const hasActiveTypes = Object.values(entry.types).some(Boolean);
  const hasCustomDraft = Boolean(entry.customLabel);

  if (!hasActiveTypes && !hasCustomDraft) {
    delete state.events[dateKey];
  }
}

function normalizeDateEntry(entry) {
  if (Array.isArray(entry)) {
    return {
      types: {
        dayOff: entry.includes('dayOff'),
        nationalHoliday: entry.includes('nationalHoliday'),
        familyOccasion: entry.includes('familyOccasion'),
        custom: entry.includes('custom'),
      },
      customLabel: '',
    };
  }

  return {
    types: {
      dayOff: Boolean(entry?.types?.dayOff),
      nationalHoliday: Boolean(entry?.types?.nationalHoliday),
      familyOccasion: Boolean(entry?.types?.familyOccasion),
      custom: Boolean(entry?.types?.custom),
    },
    customLabel: entry?.customLabel || '',
  };
}

function getActiveEventKeys(dateKey) {
  const entry = getDateEntry(dateKey);
  return Object.entries(entry.types)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key);
}

function getEventDefinition(key) {
  return eventDefinitions().find((item) => item.key === key);
}

function getEventDisplayLabel(dateKey, eventKey) {
  if (eventKey !== 'custom') {
    return getEventDefinition(eventKey)?.label || eventKey;
  }

  const entry = getDateEntry(dateKey);
  return entry.customLabel.trim() || state.customEventLabel || defaults.customEventLabel;
}

function getMonthPrefix(monthDate) {
  return `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return {
      ...defaults,
      ...saved,
      theme: {
        ...cloneTheme(defaults.theme),
        ...(saved?.theme || {}),
        eventColors: {
          ...defaults.theme.eventColors,
          ...(saved?.theme?.eventColors || {}),
        },
      },
      events: saved?.events || {},
    };
  } catch {
    return {
      ...defaults,
      theme: cloneTheme(defaults.theme),
      events: {},
    };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatDateKey(date) {
  const target = typeof date === 'string' ? new Date(`${date}T00:00:00`) : date;
  return [
    target.getFullYear(),
    String(target.getMonth() + 1).padStart(2, '0'),
    String(target.getDate()).padStart(2, '0'),
  ].join('-');
}

function formatLongDate(dateInput) {
  const date = typeof dateInput === 'string' ? new Date(`${dateInput}T00:00:00`) : dateInput;
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '');
  const bigint = Number.parseInt(normalized, 16);
  const red = (bigint >> 16) & 255;
  const green = (bigint >> 8) & 255;
  const blue = bigint & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function cloneTheme(theme) {
  return {
    ...theme,
    eventColors: {
      ...theme.eventColors,
    },
  };
}
