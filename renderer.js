const TASK_KEY = 'daily-checklist.tasks';
const SETTINGS_KEY = 'daily-checklist.settings';
const DAY_KEY = 'daily-checklist.day';

const taskListEl = document.getElementById('task-list');
const addBtn = document.getElementById('add-btn');
const customizeBtn = document.getElementById('customize-btn');
const customizeDialog = document.getElementById('customize-dialog');
const closeCustomizeBtn = document.getElementById('close-customize');
const uiColorInput = document.getElementById('ui-color');
const textColorInput = document.getElementById('text-color');
const bgImageInput = document.getElementById('bg-image');
const clearBgBtn = document.getElementById('clear-bg');
const backgroundLayer = document.getElementById('background-layer');

let tasks = readJson(TASK_KEY, []);
let settings = readJson(SETTINGS_KEY, {
  uiColor: '#f5f7ff',
  textColor: '#1e2235',
  bgData: '',
});

resetTasksIfNewDay();
applySettings();
renderTasks();

addBtn.addEventListener('click', () => {
  const newTask = {
    id: crypto.randomUUID(),
    text: 'New Task',
    completed: false,
  };
  tasks.unshift(newTask);
  persistTasks();
  renderTasks();
});

customizeBtn.addEventListener('click', () => customizeDialog.showModal());
closeCustomizeBtn.addEventListener('click', () => customizeDialog.close());

uiColorInput.addEventListener('input', (event) => {
  settings.uiColor = event.target.value;
  persistSettings();
  applySettings();
});

textColorInput.addEventListener('input', (event) => {
  settings.textColor = event.target.value;
  persistSettings();
  applySettings();
});

bgImageInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  settings.bgData = await toDataUrl(file);
  persistSettings();
  applySettings();
});

clearBgBtn.addEventListener('click', () => {
  settings.bgData = '';
  bgImageInput.value = '';
  persistSettings();
  applySettings();
});

function renderTasks() {
  taskListEl.innerHTML = '';

  tasks.forEach((task) => {
    const li = document.createElement('li');
    li.className = `task-item${task.completed ? ' completed' : ''}`;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => {
      task.completed = checkbox.checked;
      persistTasks();
      renderTasks();
    });

    const taskText = document.createElement('span');
    taskText.className = 'task-text';
    taskText.textContent = task.text;
    taskText.title = 'Double-click to edit';
    taskText.addEventListener('dblclick', () => editTask(task.id));

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.type = 'button';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Delete task';
    deleteBtn.addEventListener('click', () => {
      tasks = tasks.filter((t) => t.id !== task.id);
      persistTasks();
      renderTasks();
    });

    li.append(checkbox, taskText, deleteBtn);
    taskListEl.appendChild(li);
  });
}

function editTask(id) {
  const index = tasks.findIndex((task) => task.id === id);
  if (index < 0) {
    return;
  }

  const nextText = prompt('Edit task', tasks[index].text);
  if (nextText === null) {
    return;
  }

  const cleaned = nextText.trim();
  if (!cleaned) {
    return;
  }

  tasks[index].text = cleaned;
  persistTasks();
  renderTasks();
}

function resetTasksIfNewDay() {
  const currentDay = new Date().toISOString().slice(0, 10);
  const lastDay = localStorage.getItem(DAY_KEY);

  if (lastDay !== currentDay) {
    tasks = tasks.map((task) => ({ ...task, completed: false }));
    localStorage.setItem(DAY_KEY, currentDay);
    persistTasks();
  }
}

function applySettings() {
  document.documentElement.style.setProperty('--ui-color', settings.uiColor);
  document.documentElement.style.setProperty('--text-color', settings.textColor);

  uiColorInput.value = settings.uiColor;
  textColorInput.value = settings.textColor;

  backgroundLayer.style.backgroundImage = settings.bgData
    ? `url(${settings.bgData})`
    : 'none';
}

function persistTasks() {
  localStorage.setItem(TASK_KEY, JSON.stringify(tasks));
}

function persistSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function toDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
