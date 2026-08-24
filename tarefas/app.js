let allTasks = [];
let activeStatus = 'all';
let deferredInstallPrompt = null;

const els = {
  taskCount: document.getElementById('taskCount'),
  readyCount: document.getElementById('readyCount'),
  updatedAt: document.getElementById('updatedAt'),
  taskList: document.getElementById('taskList'),
  emptyState: document.getElementById('emptyState'),
  searchInput: document.getElementById('searchInput'),
  statusFilters: document.getElementById('statusFilters'),
  refreshBtn: document.getElementById('refreshBtn'),
  copyBtn: document.getElementById('copyBtn'),
  installBtn: document.getElementById('installBtn'),
  template: document.getElementById('taskTemplate'),
};

const statusOrder = ['all', 'ready', 'todo', 'running', 'review', 'blocked', 'scheduled', 'triage'];
const statusNames = {
  all: 'Todas',
  ready: 'Prontas',
  todo: 'A fazer',
  running: 'Execução',
  review: 'Revisão',
  blocked: 'Bloqueadas',
  scheduled: 'Agendadas',
  triage: 'Triagem',
};

function formatUpdatedAt(iso) {
  if (!iso) return '--';
  const date = new Date(iso);
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function textForTask(task) {
  return `${task.id} - ${task.title} [${task.status_label}]`;
}

function filteredTasks() {
  const query = els.searchInput.value.trim().toLowerCase();
  return allTasks.filter(task => {
    const matchesStatus = activeStatus === 'all' || task.status === activeStatus;
    const haystack = `${task.title} ${task.body} ${task.id}`.toLowerCase();
    return matchesStatus && (!query || haystack.includes(query));
  });
}

function renderFilters() {
  const present = new Set(allTasks.map(task => task.status));
  els.statusFilters.innerHTML = '';
  statusOrder.filter(status => status === 'all' || present.has(status)).forEach(status => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `chip${status === activeStatus ? ' active' : ''}`;
    btn.textContent = statusNames[status] || status;
    btn.addEventListener('click', () => {
      activeStatus = status;
      render();
    });
    els.statusFilters.appendChild(btn);
  });
}

function renderTasks() {
  const tasks = filteredTasks();
  els.taskList.innerHTML = '';
  els.emptyState.hidden = tasks.length !== 0;

  tasks.forEach(task => {
    const node = els.template.content.cloneNode(true);
    const card = node.querySelector('.task-card');
    const badge = node.querySelector('.badge');
    badge.textContent = task.status_label || task.status;
    badge.classList.add(task.status || 'ready');
    node.querySelector('.task-id').textContent = task.id;
    node.querySelector('h3').textContent = task.title;
    node.querySelector('p').textContent = task.body || 'Sem descrição adicional.';
    node.querySelector('.priority').textContent = `prioridade ${task.priority}`;
    node.querySelector('.copy-task').addEventListener('click', async () => {
      await navigator.clipboard.writeText(textForTask(task));
      card.classList.add('copied');
      setTimeout(() => card.classList.remove('copied'), 700);
    });
    els.taskList.appendChild(node);
  });
}

function renderSummary(payload) {
  els.taskCount.textContent = String(allTasks.length);
  els.readyCount.textContent = String(allTasks.filter(task => task.status === 'ready').length);
  els.updatedAt.textContent = formatUpdatedAt(payload.generated_at);
}

function render(payload = {}) {
  renderSummary(payload);
  renderFilters();
  renderTasks();
}

async function loadTasks() {
  els.refreshBtn.disabled = true;
  try {
    const response = await fetch(`/tasks.json?v=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    allTasks = payload.tasks || [];
    render(payload);
  } catch (error) {
    els.taskList.innerHTML = `<p class="empty">Não consegui carregar tasks.json. Tente novamente. ${error.message}</p>`;
  } finally {
    els.refreshBtn.disabled = false;
  }
}

els.searchInput.addEventListener('input', renderTasks);
els.refreshBtn.addEventListener('click', loadTasks);
els.copyBtn.addEventListener('click', async () => {
  const summary = filteredTasks().map(textForTask).join('\n');
  await navigator.clipboard.writeText(summary || 'Nenhuma tarefa ativa filtrada.');
});

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  els.installBtn.hidden = false;
});

els.installBtn.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  els.installBtn.hidden = true;
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

loadTasks();
