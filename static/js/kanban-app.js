// Topbar навигация
const body = document.body;
const USERNAME = body.dataset.username;
let CSRF_TOKEN = body.dataset.csrfToken;
// Используем глобальную функцию getHeaders
const profileForm = document.getElementById('profile-form');

// Обработчики навигации с проверками
const kanbanBtn = document.getElementById("kanban-btn");
const todoBtn = document.getElementById("todo-btn");

if (kanbanBtn) {
    kanbanBtn.onclick = () => {
        if (typeof smoothNavigate === 'function') {
            smoothNavigate(`/${USERNAME}/kanban`);
        } else {
            disconnectAllSockets();
            location.href = `/${USERNAME}/kanban`;
        }
    };
}
if (todoBtn) {
    todoBtn.onclick = () => {
        if (typeof smoothNavigate === 'function') {
            smoothNavigate(`/${USERNAME}/todo`);
        } else {
            disconnectAllSockets();
            location.href = `/${USERNAME}/todo`;
        }
    };
}

// Установка активной кнопки
if (window.location.pathname.includes("/kanban")) {
    if (kanbanBtn) kanbanBtn.classList.add("active");
    if (todoBtn) todoBtn.classList.remove("active");
} else {
    if (todoBtn) todoBtn.classList.add("active");
    if (kanbanBtn) kanbanBtn.classList.remove("active");
}

// ========== User Dropdown ==========
// Инициализация происходит в universal-modals.js

// ====== Новый UX для профиля ======
// Старая логика удалена - используется централизованный режим в конце файла

// Функция updateProfileAvatar теперь универсальная в profile.js

// Функция updateTopbarAvatar теперь универсальная в profile.js

// Загрузка аватарки происходит в profile.js

function getAvatarColor(id) {
    const colors = [
        "#5271ff",
        "#ff9800",
        "#ff5470",
        "#00b894",
        "#a29bfe",
        "#00bcd4",
    ];
    if (!id) return colors[0];
    let sum = 0;
    for (let i = 0; i < id.length; ++i) sum += id.charCodeAt(i);
    return colors[sum % colors.length];
}

function getInitials(name) {
    if (!name) return "?";
    return name[0].toUpperCase();
}

// closeProfileModal экспортируется из profile.js

// ========== Кнопка Мои команды ==========
// Инициализация происходит в team-modal.js

// ========== Кнопка О проекте ==========
// Инициализация происходит в universal-modals.js

// ========== Кнопка Профиль ==========
// Инициализация происходит в profile.js

// ========== Смена пароля ==========
// Инициализация происходит в universal-modals.js

// ========== Смена пароля ==========
// Инициализация происходит в universal-modals.js

// ===================== State =====================
let STATUSES = [];
let TASKS = [];

// Делаем данные доступными глобально для поиска
window.STATUSES = STATUSES;
window.TASKS = TASKS;

// ===================== SPA: Fetch Board =====================
async function fetchBoard() {
    try {
        let [statuses, tasks] = await Promise.all([
            fetch(`/${USERNAME}/api/statuses`, { headers: window.getHeaders() }).then((r) => r.json()),
            fetch(`/${USERNAME}/api/tasks`, { headers: window.getHeaders() }).then((r) => r.json()),
        ]);

        // Проверяем, что получили валидные данные
        if (Array.isArray(tasks)) {
            TASKS = tasks;
        } else if (tasks && tasks.tasks && Array.isArray(tasks.tasks)) {
            TASKS = tasks.tasks;
        } else if (tasks && tasks.error) {
            TASKS = [];
        } else {
            TASKS = [];
        }

        if (Array.isArray(statuses)) {
            STATUSES = statuses;
        } else if (statuses && statuses.error) {
            STATUSES = [];
        } else {
            STATUSES = [];
        }

        // Обновляем глобальные переменные для поиска
        window.STATUSES = STATUSES;
        window.TASKS = TASKS;

        renderBoard();
    } catch (error) {
        TASKS = [];
        STATUSES = [];
        // Обновляем глобальные переменные для поиска
        window.STATUSES = STATUSES;
        window.TASKS = TASKS;
        renderBoard();
    }
}

// ===================== Render =====================
function renderBoard() {
    const row = document.getElementById("kanban-board");
    if (!row) {
        return;
    }
    row.innerHTML = "";

    // Проверяем, что STATUSES и TASKS определены
    if (!STATUSES || !Array.isArray(STATUSES)) {
        STATUSES = [];
    }
    if (!TASKS || !Array.isArray(TASKS)) {
        TASKS = [];
    }

    STATUSES.forEach((status) => {
        const col = document.createElement("div");
        col.className = "kanban-column";
        col.setAttribute("data-status-code", status.code);
        col.innerHTML = `
      <div class="kanban-col-title">
        <span>${escapeHTML(status.title)}</span>
      </div>
      <div class="kanban-tasks"></div>
      <button class="kanban-add-task-btn" data-status-code="${status.code}">
        <span class="material-icons">add</span>Добавить задачу
      </button>
    `;
        const tasksBlock = col.querySelector(".kanban-tasks");
        const tasks = TASKS.filter((t) => t.status === status.code);
        if (tasks.length === 0) {
            tasksBlock.innerHTML = `<div class="no-tasks">Нет задач</div>`;
        } else {
            tasks.forEach((task) => {
                tasksBlock.appendChild(createTaskCard(task));
            });
        }
        // Кнопка удаления статуса — крестик справа
        const delBtn = document.createElement("button");
        delBtn.className = "icon-btn kanban-delete-status-btn";
        delBtn.title = "Удалить статус";
        delBtn.setAttribute("data-status-code", status.code);
        delBtn.innerHTML = `<span class="material-icons">close</span>`;
        col.querySelector(".kanban-col-title").appendChild(delBtn);
        row.appendChild(col);
    });
    bindAllHandlers();
    updateDnD();
    bindTaskViewHandlers();
    // --- ИСПРАВЛЕНО: восстанавливаем состояние поиска после рендера ---
    if (window.searchPanel && typeof window.searchPanel.restoreSearchState === 'function') {
        window.searchPanel.restoreSearchState();
    }
    // Переинициализируем поиск после рендера
    setTimeout(() => {
        if (window.searchPanel) {
            if (typeof window.searchPanel.populateFilters === 'function') {
                window.searchPanel.populateFilters();
            }
            if (typeof window.searchPanel.updateInitialStats === 'function') {
                window.searchPanel.updateInitialStats();
            }
        }
    }, 100);
}

// Удаляет все HTML-теги и декодирует спецсимволы
function stripTags(html) {
    let tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

function createTaskCard(task) {
    const div = document.createElement("div");
    div.className = "kanban-task";
    div.dataset.taskId = task.id;

    // --- аватар и ник ---
    let avatarHtml = "";
    if (task.assignee_id) {
        // Создаем аватарку с возможностью загрузки аватарки пользователя
        avatarHtml = `<span class='task-avatar' data-username='${task.assignee_name}'>${getInitials(task.assignee_name)}</span>`;
    }
    let assigneeNameHtml = task.assignee_name
        ? `<span class='assignee-name'>${escapeHTML(task.assignee_name)}</span>`
        : "";
    let tagsHtml = renderTags(task.tags);
    let dateHtml = task.due_date
        ? `<span class='task-date-badge'>${formatRuDate(task.due_date)}</span>`
        : "";

    // --- исправление: сохраняем переносы строк ---
    let descPreview = "";
    if (task.description) {
        let tmp = document.createElement("div");
        tmp.innerHTML = stripTags(task.description);
        descPreview = tmp.textContent || tmp.innerText || "";
        descPreview = truncate(descPreview, 120);
    }

    div.innerHTML = `
          <div class="task-header">
            <div class="task-title">${escapeHTML(truncate(task.text, 80))}</div>
            <div class="task-badges">${dateHtml}</div>
          </div>
          ${tagsHtml}
          ${descPreview
            ? `<div class="task-desc">${escapeHTML(descPreview)}</div>`
            : ""
        }
          <div class="task-meta">
            ${avatarHtml}
            ${assigneeNameHtml}
          </div>
          <div class="task-actions">
            <button class="icon-btn edit-btn" title="Редактировать" data-task-id="${task.id}"><span class="material-icons">edit</span></button>
            <button class="icon-btn delete-btn" title="Удалить" data-task-id="${task.id}"><span class="material-icons">delete</span></button>
          </div>
        `;

    // Загружаем аватарку для исполнителя если есть
    if (task.assignee_name) {
        loadUserAvatarForTask(div, task.assignee_name);
    }

    return div;
}

// Функция загрузки аватарки пользователя для карточки задачи
async function loadUserAvatarForTask(taskElement, username) {
    try {
        const response = await fetch(`/api/avatar/${username}`, { headers: window.getHeaders() });
        const data = await response.json();
        if (data.avatar_url) {
            const avatarElement = taskElement.querySelector('.task-avatar');
            if (avatarElement) {
                // Создаем изображение аватарки
                const avatarImg = document.createElement('img');
                avatarImg.src = data.avatar_url;
                avatarImg.style.cssText = 'width: 100%; height: 100%; object-fit: cover; border-radius: 50%;';
                avatarImg.alt = username;
                // Очищаем содержимое и добавляем изображение
                avatarElement.innerHTML = '';
                avatarElement.appendChild(avatarImg);
            }
        }
    } catch (error) {
        alert("Ошибка загрузки аватарки");
    }
}

function escapeHTML(str) {
    return String(str).replace(
        /[&<>"']/g,
        (s) =>
        ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        }[s])
    );
}
function truncate(str, len) {
    return str.length > len ? str.slice(0, len) + "…" : str;
}

// ===================== Drag & Drop =====================
function updateDnD() {
    document.querySelectorAll(".kanban-tasks").forEach(function (col) {
        if (col._sortable) return;
        col._sortable = new Sortable(col, {
            group: "tasks",
            animation: 220,
            ghostClass: "drag-ghost",
            onEnd: async function (evt) {
                // Проверяем, перемещалась ли задача между колонками
                const movedTaskId = evt.item.dataset.taskId;
                const newColumn = evt.to.closest(".kanban-column");
                const newStatus = newColumn.dataset.statusCode || newColumn.getAttribute("data-status-code");
                const oldColumn = evt.from.closest(".kanban-column");
                const oldStatus = oldColumn.dataset.statusCode || oldColumn.getAttribute("data-status-code");

                let orders = {};
                document
                    .querySelectorAll(".kanban-tasks")
                    .forEach(function (list) {
                        const status =
                            list.closest(".kanban-column").dataset.statusCode ||
                            list.closest(".kanban-column").getAttribute("data-status-code");
                        orders[status] = Array.from(
                            list.querySelectorAll(".kanban-task")
                        ).map((x) => +x.dataset.taskId);
                    });
                let resp = await fetch(`/${USERNAME}/api/tasks/order`, {
                    method: "POST",
                    headers: window.getHeaders(),
                    body: JSON.stringify({ orders }),
                });
                if (resp.ok) {
                    fetchBoard();

                    // Показываем toast уведомление если задача перемещалась между статусами
                    if (newStatus !== oldStatus && window.toast) {
                        const task = TASKS.find(t => t.id == movedTaskId);
                        const taskTitle = task ? task.text : "Задача";
                        const newStatusTitle = getStatusTitle(newStatus);
                        window.toast.taskStatusChanged(taskTitle, newStatusTitle);
                    }
                }
            },
        });
    });
}

// ===================== Modal: Task =====================
function openTaskModal({
    edit = false,
    id = null,
    text = "",
    description = "",
    status = "",
    tags = [],
    due_date = null,
} = {}) {
    const taskModalTitle = document.getElementById("task-modal-title");
    const editTaskId = document.getElementById("edit_task_id");
    const taskText = document.getElementById("task_text");
    const taskStatus = document.getElementById("task_status");
    const taskDueDate = document.getElementById("task_due_date");
    const taskModalError = document.getElementById("task-modal-error");
    const taskModal = document.getElementById("task-modal");

    if (taskModalTitle) {
        taskModalTitle.innerText = edit ? "Редактировать задачу" : "Новая задача";
    }
    if (editTaskId) editTaskId.value = id || "";
    if (taskText) taskText.value = text || "";

    // Инициализируем Quill.js если ещё не инициализирован
    if (!window.taskEditor) {
        initTaskEditor();
    }

    // Устанавливаем содержимое редактора
    if (window.taskEditor) {
        window.taskEditor.root.innerHTML = description || "";
    }

    if (taskStatus) {
        taskStatus.innerHTML = STATUSES.map(
            (s) =>
                `<option value="${s.code}"${(status || STATUSES[0].code) === s.code ? " selected" : ""
                }>${escapeHTML(s.title)}</option>`
        ).join("");
    }

    // --- новые поля ---
    let tagSet = new Set(tags || []);
    document.querySelectorAll(".tag-badge[data-tag]").forEach((badge) => {
        if (tagSet.has(badge.dataset.tag)) {
            badge.classList.add("selected");
        } else {
            badge.classList.remove("selected");
        }
    });

    if (taskDueDate) {
        taskDueDate.value = due_date ? due_date.slice(0, 10) : "";
    }
    if (taskModalError) taskModalError.innerText = "";
    if (taskModal) taskModal.classList.add("show");

    bindTagBadges();
    setTimeout(() => {
        if (taskText) taskText.focus();
    }, 120);
}

// Кастомный image handler для загрузки на сервер
function imageHandler() {
    const input = document.createElement("input");
    input.setAttribute("type", "file");
    input.setAttribute("accept", "image/*");
    input.click();
    input.onchange = async () => {
        const file = input.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append("image", file);
        try {
            const res = await fetch("/api/upload_image", {
                method: "POST",
                headers: window.getHeaders(null), // Не добавляем Content-Type для FormData
                body: formData,
            });
            const data = await res.json();
            if (data.url) {
                const range = window.taskEditor.getSelection();
                window.taskEditor.insertEmbed(range.index, "image", data.url);
            } else {
                alert("Ошибка загрузки изображения: " + (data.error || ""));
            }
        } catch (e) {
            alert("Ошибка загрузки изображения");
        }
    };
}

// Инициализация Quill.js редактора
function initTaskEditor() {
    if (window.taskEditor) {
        return; // Уже инициализирован
    }

    const quill = new Quill("#task_description_editor", {
        theme: "snow",
        modules: {
            toolbar: {
                container: [
                    [{ header: [1, 2, 3, false] }],
                    ["bold", "italic", "underline", "strike"],
                    [{ color: [] }, { background: [] }],
                    [{ list: "ordered" }, { list: "bullet" }],
                    [{ align: [] }],
                    ["link", "image", "code-block"],
                    ["clean"],
                ],
                handlers: {
                    image: imageHandler,
                },
            },
        },
        placeholder: "Опишите задачу...",
        bounds: "#task_description_editor",
    });

    window.taskEditor = quill;
}

// Обработчики для тегов
function bindTagBadges() {
    const badges = document.querySelectorAll(".tag-badge[data-tag]");
    badges.forEach((badge) => {
        badge.onclick = function () {
            badge.classList.toggle("selected");
        };
    });
}

// Получить цвет для тега
function getTagColor(tagName) {
    const colors = {
        Срочно: "#ff3a3a",
        Баг: "#ff9800",
        Улучшение: "#3a8dde",
        Обсудить: "#a259ff",
        Документы: "#00b894",
    };
    return colors[tagName] || "#666";
}

function closeTaskModal() {
    const taskModal = document.getElementById("task-modal");
    const taskModalForm = document.getElementById("task-modal-form");

    if (taskModal) taskModal.classList.remove("show");
    if (taskModalForm) taskModalForm.reset();

    // Очищаем Quill.js редактор
    if (window.taskEditor) {
        window.taskEditor.root.innerHTML = "";
    }

    // Сбрасываем стили тегов
    document.querySelectorAll(".tag-badge").forEach((cb) => {
        cb.classList.remove("selected");
    });
}

const taskModalForm = document.getElementById("task-modal-form");
if (taskModalForm) {
    taskModalForm.onsubmit = async function (e) {
        e.preventDefault();
        let text = this.task_text.value.trim();
        let description = window.taskEditor
            ? window.taskEditor.root.innerHTML
            : "";
        let status = this.task_status.value;
        let id = this.edit_task_id.value;
        let tags = Array.from(this.querySelectorAll(".tag-badge.selected")).map(
            (cb) => cb.dataset.tag
        );
        let due_date = this.task_due_date.value || null;
        let method = id ? "PATCH" : "POST";
        let url = `/${USERNAME}/api/tasks` + (id ? `/${id}` : "");
        let body = { text, description, status, tags, due_date };

        try {
            let resp = await fetch(url, {
                method,
                headers: window.getHeaders(),
                body: JSON.stringify(body),
            });
            let data = null;
            try {
                data = await resp.json();
            } catch (e) {
                data = null;
            }
            if (resp.ok && data && (data.id || data.success)) {
                closeTaskModal();
                // --- Локальное обновление ---
                if (id) {
                    // Редактирование: обновить карточку
                    const idx = TASKS.findIndex(t => t.id == id);
                    if (idx !== -1) {
                        TASKS[idx] = { ...TASKS[idx], ...body, id };
                        window.TASKS = TASKS; // Обновляем глобально
                        updateTaskCard(TASKS[idx]);
                    }
                    // Показываем toast уведомление
                    if (window.toast) {
                        window.toast.taskUpdated(text);
                    }
                } else {
                    // Добавление: добавить карточку
                    const newTask = { ...body, id: data.id };
                    TASKS.push(newTask);
                    window.TASKS = TASKS; // Обновляем глобально
                    addTaskCard(newTask);
                    // Показываем toast уведомление
                    if (window.toast) {
                        window.toast.taskCreated(text);
                    }
                }
            } else {
                let err = data && data.error ? data.error : "Ошибка сохранения!";
                const taskModalError = document.getElementById("task-modal-error");
                if (taskModalError) taskModalError.innerText = err;
            }
        } catch (error) {
            if (taskModalError) taskModalError.innerText = "Ошибка сети!";
        }
    };
}

const taskModal = document.getElementById("task-modal");

// ===================== Modal: Status =====================
function openStatusModal() {
    const statusModal = document.getElementById("status-modal");
    const statusModalError = document.getElementById("status-modal-error");
    const newStatusTitle = document.getElementById("new_status_title");

    if (statusModal) statusModal.classList.add("show");
    if (statusModalError) statusModalError.innerText = "";
    if (newStatusTitle) newStatusTitle.value = "";

    setTimeout(() => {
        if (newStatusTitle) newStatusTitle.focus();
    }, 120);
}

function closeStatusModal() {
    const statusModal = document.getElementById("status-modal");
    const statusModalForm = document.getElementById("status-modal-form");

    if (statusModal) statusModal.classList.remove("show");
    if (statusModalForm) statusModalForm.reset();
}

const statusModalForm = document.getElementById("status-modal-form");
if (statusModalForm) {
    statusModalForm.onsubmit = async function (e) {
        e.preventDefault();
        let title = this.new_status_title.value.trim();
        if (!title) return;
        let code = "s" + Date.now();

        try {
            let resp = await fetch(`/${USERNAME}/api/statuses`, {
                method: "POST",
                headers: window.getHeaders(),
                body: JSON.stringify({ title, code }),
            });
            if (resp.ok) {
                closeStatusModal();
                fetchBoard();
            } else {
                const statusModalError = document.getElementById("status-modal-error");
                if (statusModalError) statusModalError.innerText = "Ошибка добавления статуса!";
            }
        } catch (error) {
            if (statusModalError) statusModalError.innerText = "Ошибка сети!";
        }
    };
}

const statusModal = document.getElementById("status-modal");

// === Команды ===
let TEAMS = [];
let CURRENT_EDIT_TEAM = null;

// ========== Команды: логика и рендер ==========
// Вся логика команд перенесена в team-modal.js

// === Обработчики кнопок ===
const openTaskModalBtn = document.getElementById("open-task-modal");
if (openTaskModalBtn) {
    openTaskModalBtn.onclick = function () {
        openTaskModal();
    };
}

const openStatusModalBtn = document.getElementById("open-status-modal");
if (openStatusModalBtn) {
    openStatusModalBtn.onclick = function () {
        openStatusModal();
    };
}

// === Инициализация ===
// fetchTeams() теперь вызывается из team-modal.js
fetchBoard();

function bindAllHandlers() {
    document.querySelectorAll(".kanban-add-task-btn").forEach((btn) => {
        btn.onclick = function () {
            openTaskModal({ status: btn.getAttribute("data-status-code") });
        };
    });
    let addStatusBtn = document.getElementById("open-status-modal");
    if (addStatusBtn) addStatusBtn.onclick = openStatusModal;
    document
        .querySelectorAll(".kanban-delete-status-btn")
        .forEach((btn) => {
            btn.onclick = async function () {
                if (!confirm("Удалить статус?")) return;
                let code = btn.getAttribute("data-status-code");
                let resp = await fetch(`/${USERNAME}/api/statuses/${code}`, {
                    method: "DELETE",
                    headers: window.getHeaders(),
                });
                if (resp.ok) fetchBoard();
            };
        });
    document.querySelectorAll(".edit-btn").forEach((btn) => {
        btn.onclick = function () {
            let id = btn.getAttribute("data-task-id");
            let task = TASKS.find((t) => t.id == id);
            if (task) openTaskModal({ edit: true, ...task });
        };
    });
    document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.onclick = async function () {
            if (!confirm("Удалить задачу?")) return;
            let id = btn.getAttribute("data-task-id");
            let task = TASKS.find((t) => t.id == id);
            let taskName = task ? task.text : "Задача";
            try {
                let resp = await fetch(`/${USERNAME}/api/tasks/${id}`, {
                    method: "DELETE",
                    headers: window.getHeaders(),
                });
                if (resp.ok) {
                    // Локальное удаление
                    TASKS = TASKS.filter(t => t.id != id);
                    window.TASKS = TASKS; // Обновляем глобально
                    removeTaskCard(id);
                    // Показываем toast уведомление
                    if (window.toast) {
                        window.toast.taskDeleted(taskName);
                    }
                } else {
                    let data = await resp.json();
                    let errorMsg = data && data.error ? data.error : "Ошибка удаления задачи";
                    if (window.toast) {
                        window.toast.serverError();
                    } else {
                        alert(errorMsg);
                    }
                }
            } catch (error) {
                if (window.toast) {
                    window.toast.networkError();
                } else {
                    alert("Ошибка при удалении задачи");
                }
            }
        };
    });
}

function formatRuDate(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("ru-RU");
}

function formatDateTime(dateStr) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleString("ru-RU");
}

function getStatusTitle(statusCode) {
    const status = STATUSES.find((s) => s.code === statusCode);
    return status ? status.title : statusCode;
}

// Открытие по клику на задачу
function bindTaskViewHandlers() {
    document.querySelectorAll(".kanban-task").forEach((div) => {
        div.onclick = function (e) {
            if (e.target.closest(".edit-btn,.delete-btn")) return;
            const id = div.dataset.taskId;
            const task = TASKS.find((t) => t.id == id);
            if (task) openViewTaskModal(task);
        };
    });
}

async function getUserNameById(userId) {
    if (!userId) return "-";
    try {
        let resp = await fetch(`/api/check_user_id/${userId}`, { headers: window.getHeaders() });
        if (resp.ok) {
            let data = await resp.json();
            if (data && data.username) return data.username;
        }
    } catch (e) { }
    return "-";
}

// Функция для рендера блока вложений из description (аналог team_board.js)
function createAttachmentsBlockFromDescription(description) {
    const images = [];
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = description;
    const imgElements = tempDiv.querySelectorAll('img');
    imgElements.forEach(img => {
        if (img.src && img.src.length > 0) {
            images.push({
                src: img.src,
                alt: img.alt || '',
                title: img.title || ''
            });
        }
    });
    if (images.length === 0) return '';
    const attachmentsId = 'attachments-' + Date.now();
    let attachmentsHtml = `
      <div class="attachments-block" id="${attachmentsId}">
        <div class="attachments-header" onclick="toggleAttachments('${attachmentsId}')">
          <div class="attachments-header-left">
            <span class="material-icons">attachment</span>
            <span>Вложения</span>
            <span class="attachments-count">${images.length}</span>
          </div>
          <span class="material-icons attachments-toggle">expand_more</span>
        </div>
        <div class="attachments-content" id="${attachmentsId}-content">
          <div class="attachments-grid">
    `;
    images.forEach((image, index) => {
        const fileName = image.src.split('/').pop();
        attachmentsHtml += `
          <div class="attachment-item" onclick="openImageModal({src: '${image.src}', filename: '${fileName}', downloadUrl: '${image.src}'})">
            <div class="attachment-preview">
              <img src="${image.src}" alt="${image.alt || fileName}" loading="lazy">
            </div>
            <div class="attachment-info">
              <div class="attachment-name">${fileName}</div>
              <div class="attachment-size">Изображение</div>
            </div>
          </div>
        `;
    });
    attachmentsHtml += `
          </div>
        </div>
      </div>
    `;
    return attachmentsHtml;
}

async function openViewTaskModal(task) {
    const modal = document.getElementById("view-task-modal");
    const title = document.getElementById("view-task-title");
    const content = document.getElementById("view-task-content");
    const attachmentsBlock = document.getElementById("view-task-attachments");

    if (title) title.textContent = task.text;

    // Краткий просмотр с ограниченным описанием
    let descriptionPreview = task.description || "Описание отсутствует";
    let hasImage = /<img\s/i.test(descriptionPreview);
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = descriptionPreview;
    let textPreview = tempDiv.textContent || tempDiv.innerText || "";
    let needShowFull = textPreview.length > 200 || /\n/.test(textPreview);
    if (textPreview.length > 200)
        textPreview = textPreview.substring(0, 200) + "...";

    // Блок вложений сразу после описания
    let attachmentsHtml = createAttachmentsBlockFromDescription(task.description || "");

    if (content) {
        content.innerHTML = `
            <div class="view-task-section">
                <div class="view-task-field">
                    <span class="material-icons">flag</span>
                    <span><strong>Статус:</strong> ${getStatusTitle(task.status)}</span>
                </div>
                ${task.due_date ? `<div class="view-task-field"><span class="material-icons">event</span><span><strong>Срок:</strong> ${formatRuDate(task.due_date)}</span></div>` : ''}
                ${task.tags && task.tags.length > 0 ? `<div class="view-task-field"><span class="material-icons">label</span><span><strong>Теги:</strong> ${task.tags.map(tag => `<span class="task-tag tag-${tag.toLowerCase()}">${escapeHTML(tag)}</span>`).join(' ')}</span></div>` : ''}
                <div class="view-task-field">
                    <span class="material-icons">description</span>
                    <span><strong>Описание:</strong></span>
                </div>
                <div class="view-task-description-preview" style="white-space:pre-line;word-break:break-word;">${textPreview}</div>
                ${attachmentsHtml}
                ${needShowFull ? `<div class='view-task-more'><button class='view-full-task-btn plus-btn' data-task-id='${task.id}'><span class='material-icons'>open_in_new</span>Открыть полностью</button></div>` : ''}
                <div class="view-task-field">
                    <span class="material-icons">person</span>
                    <span><strong>Обновлено:</strong> ${task.updated_by_name ? escapeHTML(task.updated_by_name) : "Неизвестно"}</span>
                </div>
                <div class="view-task-field">
                    <span class="material-icons">schedule</span>
                    <span><strong>Дата:</strong> ${task.updated_at ? formatDateTime(task.updated_at) : ""}</span>
                </div>
            </div>
        `;
    }

    // Скрываю отдельный блок attachmentsBlock (он больше не нужен)
    if (attachmentsBlock) {
        attachmentsBlock.style.display = 'none';
        attachmentsBlock.innerHTML = '';
    }

    if (modal) modal.classList.add("show");

    // Назначаем обработчик для кнопки редактирования
    const viewTaskEditBtn = document.getElementById("view-task-edit-btn");
    if (viewTaskEditBtn) {
        viewTaskEditBtn.onclick = function () {
            openTaskModal({ edit: true, ...task });
            closeViewTaskModal();
        };
    }

    // Назначаем обработчик для кнопки "Открыть полностью"
    const viewFullBtn = document.querySelector(".view-full-task-btn");
    if (viewFullBtn) {
        viewFullBtn.onclick = function (e) {
            e.stopPropagation();
            openFullTaskView(task.id);
        };
    }
}

// Функция для безопасного отключения всех сокетов
function disconnectAllSockets() {
    // Отключаем основной сокет
    if (window.socket && typeof window.socket.disconnect === 'function') {
        try {
            window.socket.disconnect();
        } catch (e) {
            console.log('[kanban-app] Socket disconnect error:', e);
        }
        window.socket = null;
    }

    // Отключаем сокет уведомлений если есть
    if (window.notificationsSocket && typeof window.notificationsSocket.disconnect === 'function') {
        try {
            window.notificationsSocket.disconnect();
        } catch (e) {
            console.log('[kanban-app] Notifications socket disconnect error:', e);
        }
        window.notificationsSocket = null;
    }

    // Отключаем глобальный сокет если есть
    if (window.globalSocket && typeof window.globalSocket.disconnect === 'function') {
        try {
            window.globalSocket.disconnect();
        } catch (e) {
            console.log('[kanban-app] Global socket disconnect error:', e);
        }
        window.globalSocket = null;
    }
}

function openFullTaskView(taskId) {
    if (typeof smoothNavigate === 'function') {
        smoothNavigate(`/${USERNAME}/task/${taskId}`);
    } else {
        disconnectAllSockets();
        window.location.href = `/${USERNAME}/task/${taskId}`;
    }
}

function closeViewTaskModal() {
    const viewTaskModal = document.getElementById("view-task-modal");
    if (viewTaskModal) viewTaskModal.classList.remove("show");
}

function renderTags(tags) {
    if (!tags || !tags.length) return "";
    return (
        `<div class='task-tags'>` +
        tags
            .map(
                (tag) =>
                    `<span class='task-tag tag-${tag.toLowerCase()}'>${escapeHTML(
                        tag
                    )}</span>`
            )
            .join("") +
        `</div>`
    );
}

// Функция closeAboutModal теперь в universal-modals.js

// === Централизованный режим редактирования профиля ===
let profileEditMode = false;
// Логика профиля вынесена в profile.js

// === Универсальные обработчики крестиков и кнопок отмены для всех модалок ===
document.querySelectorAll('.modal-close').forEach(btn => {
    btn.onclick = function () {
        const modal = btn.closest('.modal');
        if (modal) modal.classList.remove('show');
    };
});
// Для кнопок отмены (id заканчивается на -cancel, -btn, -close и т.д.)
['cancel-task-modal-btn', 'cancel-change-password-btn', 'close-profile-modal-btn', 'close-task-modal-btn', 'close-status-modal-btn', 'close-teams-modal-btn', 'close-create-team-modal-btn', 'close-edit-team-modal-btn', 'close-view-task-modal-btn', 'close-about-modal-btn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.onclick = function () {
        const modal = btn.closest('.modal');
        if (modal) modal.classList.remove('show');
    };
});

// Инициализация профиля происходит в profile.js

// --- Logout ---
// Инициализация происходит в universal-modals.js

// --- Логика профиля вынесена в profile.js ---

// ===== СИСТЕМА УВЕДОМЛЕНИЙ =====
let socket = null;
let notificationsData = [];
let unreadCount = 0;

// Инициализация Socket.IO для уведомлений
function getOrCreateSocket() {
    if (window.socket && window.socket.connected) return window.socket;
    window.socket = io();
    return window.socket;
}

// Загрузка уведомлений
async function loadNotifications() {
    try {
        const response = await fetch(`/${USERNAME}/api/notifications`, {
            headers: window.getHeaders()
        });

        if (response.ok) {
            const data = await response.json();
            notificationsData = data.notifications || [];
            unreadCount = data.unread_count || 0;

            updateNotificationBadge(unreadCount);
            renderNotifications();
        }
    } catch (error) {
        // Ошибка загрузки уведомлений
    }
}

// Обновление значка уведомлений
function updateNotificationBadge(count) {
    const badge = document.querySelector('.notifications-badge');
    const btn = document.getElementById('notifications-btn');

    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = 'flex';
            if (btn) btn.classList.add('has-unread');
        } else {
            badge.style.display = 'none';
            if (btn) btn.classList.remove('has-unread');
        }
    }
}

// Отрисовка списка уведомлений
function renderNotifications() {
    const list = document.getElementById('notifications-list');
    if (!list) return;

    if (notificationsData.length === 0) {
        list.innerHTML = `
            <div class="no-notifications">
                <span class="material-icons">notifications_none</span>
                <p>Нет новых уведомлений</p>
            </div>
        `;
        return;
    }

    list.innerHTML = notificationsData.map(notification => {
        const iconClass = notification.type === 'mention' ? 'mention' : 'assigned';
        const icon = notification.type === 'mention' ? 'alternate_email' : 'assignment_ind';
        const timeAgo = formatTimeAgo(notification.created_at);
        // Исправляем &quot; на обычные кавычки
        let message = notification.message.replace(/&quot;/g, '"');
        // Выделяем username жирным только для известных username
        const usernames = [notification.from_username, notification.to_username, notification.mentioned_username].filter(Boolean);
        usernames.forEach(u => {
            if (u) message = message.replace(new RegExp(`\\b${u}\\b`, 'g'), `<span class='notif-username'><b>${u}</b></span>`);
        });
        // Также выделяем все @username
        message = message.replace(/@([a-zA-Z0-9_\-]+)/g, '<span class="notif-username">@$1</span>');
        return `
            <div class="notification-item ${!notification.is_read ? 'unread' : ''}" 
                 data-id="${notification.id}" 
                 data-link="${notification.link || ''}">
                <div class="notification-avatar">
                    ${notification.from_avatar
                ? `<img src="${notification.from_avatar}" alt="${notification.from_username}" />`
                : `<span>${getInitials(notification.from_username)}</span>`
            }
                </div>
                <div class="notification-content">
                    <div class="notification-title">
                        <span class="material-icons notification-icon ${iconClass}">${icon}</span>
                        ${escapeHTML(notification.title)}
                    </div>
                    <div class="notification-message">${message}</div>
                    <div class="notification-time">${timeAgo}</div>
                </div>
                ${!notification.is_read ? '<div class="notification-unread-dot"></div>' : ''}
            </div>
        `;
    }).join('');

    // Добавляем обработчики кликов
    list.querySelectorAll('.notification-item').forEach(item => {
        item.onclick = async function () {
            const id = parseInt(item.dataset.id);
            const link = item.dataset.link;

            // Отмечаем как прочитанное
            if (item.classList.contains('unread')) {
                await markNotificationAsRead([id]);
                item.classList.remove('unread');
                item.querySelector('.notification-unread-dot')?.remove();
            }

            // Переходим по ссылке если есть
            if (link) {
                window.location.href = link;
            }
        };
    });
}

// Форматирование времени "назад"
function formatTimeAgo(dateString) {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'только что';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} мин назад`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч назад`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} дн назад`;

    return date.toLocaleDateString('ru-RU');
}

// Отметить уведомления как прочитанные
async function markNotificationAsRead(notificationIds) {
    try {
        const response = await fetch(`/${USERNAME}/api/notifications/mark_read`, {
            method: 'POST',
            headers: window.getHeaders(),
            body: JSON.stringify({ notification_ids: notificationIds })
        });

        if (response.ok) {
            // Обновляем счетчик
            unreadCount = Math.max(0, unreadCount - notificationIds.length);
            updateNotificationBadge(unreadCount);
        }
    } catch (error) {
        // Ошибка отметки уведомлений
    }
}

// Отметить все как прочитанные
async function markAllNotificationsAsRead() {
    try {
        const response = await fetch(`/${USERNAME}/api/notifications/mark_read`, {
            method: 'POST',
            headers: window.getHeaders(),
            body: JSON.stringify({ mark_all: true })
        });

        if (response.ok) {
            // Обновляем UI
            notificationsData.forEach(n => n.is_read = true);
            unreadCount = 0;
            updateNotificationBadge(0);
            renderNotifications();
        }
    } catch (error) {
        // Ошибка отметки всех уведомлений
    }
}

// Инициализация обработчиков уведомлений
function initNotifications() {
    const notificationsBtn = document.getElementById('notifications-btn');
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    const markAllBtn = document.getElementById('mark-all-read-btn');

    if (notificationsBtn && notificationsDropdown) {
        // Клик по кнопке уведомлений
        notificationsBtn.onclick = function (e) {
            e.stopPropagation();
            const isOpen = notificationsDropdown.classList.contains('open');

            if (!isOpen) {
                loadNotifications();
                notificationsDropdown.classList.add('open');
            } else {
                notificationsDropdown.classList.remove('open');
            }
        };

        // Предотвращаем закрытие при клике внутри dropdown
        notificationsDropdown.onclick = function (e) {
            e.stopPropagation();
        };

        // Закрытие при клике вне dropdown
        document.addEventListener('click', function () {
            notificationsDropdown.classList.remove('open');
        });
    }

    // Кнопка "Прочитать все"
    if (markAllBtn) {
        markAllBtn.onclick = function () {
            if (unreadCount > 0) {
                markAllNotificationsAsRead();
            }
        };
    }

    // Загружаем уведомления при старте
    loadNotifications();

    // 🔥 ИНИЦИАЛИЗАЦИЯ SOCKET.IO ДЛЯ TOAST УВЕДОМЛЕНИЙ 🔥
    if (typeof io !== 'undefined') {
        const socket = getOrCreateSocket();

        // Подключаемся к личной комнате пользователя
        socket.emit('join_user', { username: USERNAME });

        // Обработчик получения количества уведомлений
        socket.on('notification_count', (data) => {
            updateNotificationBadge(data.count);
        });

        // Обработчик обновления уведомлений
        socket.on('notifications_updated', () => {
            loadNotifications();
        });

        // 🔥 НОВЫЕ ОБРАБОТЧИКИ ДЛЯ TOAST УВЕДОМЛЕНИЙ 🔥

        // Новая задача назначена пользователю
        socket.on('task_assigned', (data) => {
            if (window.toast) {
                window.toast.taskAssigned(data.taskTitle, data.assigneeName);
            }
            loadNotifications(); // Обновляем список уведомлений
        });

        // Пользователя упомянули в комментарии
        socket.on('user_mentioned', (data) => {
            if (window.toast) {
                window.toast.mentionReceived(data.authorName, data.taskTitle);
            }
            loadNotifications(); // Обновляем список уведомлений
        });

        // Новый комментарий к задаче
        socket.on('new_comment', (data) => {
            if (window.toast) {
                window.toast.newComment(data.authorName, data.taskTitle);
            }
        });
    }
}

// Запускаем систему уведомлений при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    // Инициализация toast уведомлений
    if (window.ToastNotifications) {
        window.toast = new ToastNotifications();
    }

    initNotifications();
});

// ========== Инициализация модалок ==========
// Все модалки инициализируются в соответствующих файлах:
// - Команды: team-modal.js
// - Профиль: profile.js
// - Смена пароля и "О проекте": universal-modals.js

// Обработчики навигации уже определены в начале файла

// Обработчики событий страницы
window.addEventListener('beforeunload', function () {
    disconnectAllSockets();
});

// Обработчик при скрытии страницы
document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
        // При скрытии страницы отключаем сокеты
        disconnectAllSockets();
    }
});

// === Для блока комментариев ===
function scrollCommentsToBottom() {
    const list = document.getElementById('modal-comments-list');
    if (list) {
        list.scrollTop = list.scrollHeight;
    }
}

// Везде, где было socket = io(); заменить на getOrCreateSocket();
// Например:
// socket = io();
// socket.emit(...)  =>
// socket = getOrCreateSocket();
// socket.emit(...)

// ========== Комментарии: автопрокрутка и индикатор новых ==========
function renderModalComments(comments) {
    const list = document.getElementById('modal-comments-list');
    if (!list) return;
    if (!comments || comments.length === 0) {
        list.innerHTML = '<div class="no-comments">Комментариев пока нет</div>';
        return;
    }
    // Показываем только последние 5 комментариев, если их больше
    let showCount = 5;
    let showAll = window._showAllComments;
    if (!showAll && comments.length > showCount) {
        const hiddenCount = comments.length - showCount;
        list.innerHTML = `
            <div class='comments-indicator'>Показаны последние ${showCount} из ${comments.length} комментариев</div>
            <button class='show-all-comments-btn'>Показать все</button>
        ` + comments.slice(-showCount).map(c => renderCommentHtml(c)).join('');
        list.querySelector('.show-all-comments-btn').onclick = function () {
            window._showAllComments = true;
            renderModalComments(comments);
        };
    } else {
        list.innerHTML = comments.map(c => renderCommentHtml(c)).join('');
    }
    // Автопрокрутка вниз
    setTimeout(() => { list.scrollTop = list.scrollHeight; }, 80);
    // ... обработчики удаления ...
    list.querySelectorAll('.comment-delete-btn').forEach(btn => {
        btn.onclick = async function () {
            if (!confirm('Удалить комментарий?')) return;
            const commentId = btn.getAttribute('data-comment-id');
            await fetch(`/${USERNAME}/api/teams/${TEAM_ID}/tasks/${window._lastOpenedTask.id}/comments/${commentId}`, {
                method: 'DELETE',
                headers: window.getHeaders()
            });
            await loadModalComments();
        };
    });
}

function renderCommentHtml(c) {
    return `
        <div class="comment-item">
            <div class="comment-avatar">
                ${c.avatar_url ? `<img src="${c.avatar_url}" alt="${c.author}" />` : `<span class="avatar-initial">${(c.author || '?')[0].toUpperCase()}</span>`}
            </div>
            <div class="comment-body">
                <div class="comment-meta">
                    <span class="comment-author">${escapeHTML(c.author)}</span>
                    <span class="comment-date">${formatDateTime(c.created_at)}</span>
                    ${c.author === USERNAME ? `<button class="comment-delete-btn" aria-label="Удалить комментарий" title="Удалить" data-comment-id="${c.id}"><span class="material-icons">delete</span></button>` : ''}
                </div>
                <div class="comment-text">${highlightMentions(escapeHTML(c.text), c.mentions)}</div>
            </div>
        </div>
    `;
}

// === Локальное обновление задач ===
function updateTaskCard(task) {
    // Найти карточку по id
    const card = document.querySelector(`.kanban-task[data-task-id='${task.id}']`);
    if (card) {
        const newCard = createTaskCard(task);
        card.replaceWith(newCard);

        // Назначаем обработчики событий для обновленной карточки
        bindAllHandlers();
        bindTaskViewHandlers();
    }
}

function addTaskCard(task) {
    // Найти колонку по статусу
    const col = document.querySelector(`.kanban-column[data-status-code='${task.status}'] .kanban-tasks`);
    if (col) {
        // Удаляем блок "Нет задач" если он есть
        const noTasksBlock = col.querySelector('.no-tasks');
        if (noTasksBlock) {
            noTasksBlock.remove();
        }

        const newCard = createTaskCard(task);
        col.appendChild(newCard);

        // Назначаем обработчики событий для новой карточки
        bindAllHandlers();
        bindTaskViewHandlers();
    }
}

function removeTaskCard(taskId) {
    const card = document.querySelector(`.kanban-task[data-task-id='${taskId}']`);
    if (card) {
        const column = card.closest('.kanban-tasks');
        card.remove();

        // Проверяем, остались ли задачи в колонке
        updateColumnState(column);
    }
}

// Обновляем состояние колонки (показываем/скрываем "Нет задач")
function updateColumnState(columnElement) {
    if (!columnElement) return;

    const tasks = columnElement.querySelectorAll('.kanban-task');
    const noTasksBlock = columnElement.querySelector('.no-tasks');

    if (tasks.length === 0) {
        // Если нет задач, показываем блок "Нет задач"
        if (!noTasksBlock) {
            columnElement.innerHTML = '<div class="no-tasks">Нет задач</div>';
        }
    } else {
        // Если есть задачи, убираем блок "Нет задач"
        if (noTasksBlock) {
            noTasksBlock.remove();
        }
    }
}

// ===== Просмотр вложения (изображения) =====

function openImageModal({ src, filename, downloadUrl }) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('image-modal-img');
    const fname = document.getElementById('image-modal-filename');
    const downloadBtn = document.getElementById('image-modal-download-btn');
    const closeBtn = document.getElementById('image-modal-close-btn');

    img.src = src;
    img.alt = filename;
    fname.textContent = filename;
    fname.style.display = 'block';
    downloadBtn.innerHTML = '<span class="material-icons">download</span>Скачать';
    downloadBtn.onclick = () => {
        const a = document.createElement('a');
        a.href = downloadUrl || src;
        a.download = filename;
        a.click();
    };
    function closeModal() {
        modal.classList.remove('show');
        img.src = '';
        document.body.classList.remove('modal-open');
        window.removeEventListener('keydown', escListener);
    }
    closeBtn.onclick = closeModal;
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };
    function escListener(e) {
        if (e.key === 'Escape') closeModal();
    }
    window.addEventListener('keydown', escListener);
    modal.classList.add('show');
    document.body.classList.add('modal-open');
}

// Исправленный обработчик клика по превью вложения (унификация)
document.addEventListener('click', function (e) {
    const preview = e.target.closest('.attachment-preview');
    if (preview && preview.dataset.type === 'image') {
        e.preventDefault();
        openImageModal({
            src: preview.dataset.full || preview.querySelector('img')?.src,
            filename: preview.dataset.filename || 'image',
            downloadUrl: preview.dataset.download || preview.dataset.full || preview.querySelector('img')?.src
        });
    }
});

// Переключение состояния блока вложений
function toggleAttachments(attachmentsId) {
    const content = document.getElementById(attachmentsId + '-content');
    const toggle = document.querySelector(`#${attachmentsId} .attachments-toggle`);

    if (content && toggle) {
        const isExpanded = content.classList.contains('expanded');

        if (isExpanded) {
            content.classList.remove('expanded');
            toggle.classList.remove('expanded');
        } else {
            content.classList.add('expanded');
            toggle.classList.add('expanded');
        }
    }
}

// Закрытие модального окна с изображением
function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    }
}