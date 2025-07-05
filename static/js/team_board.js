// В самом начале:
let TEAM_ID = null;
let STATUSES = [];
let TASKS = [];
let MEMBERS = [];
let TEAM_INFO = null;
let USERNAME = null;
let socket = null;
let TEAMS = [];

// Используем глобальную функцию getHeaders

// Инициализация USERNAME
function initUsername() {
    // Используем функцию getUsername из HTML если она доступна
    if (typeof window.getUsername === 'function') {
        USERNAME = window.getUsername();
    } else if (document.body) {
        USERNAME = window.USERNAME || document.body.getAttribute('data-username');
    } else {
        USERNAME = window.USERNAME;
    }

    if (!USERNAME) {
        console.error('[team_board] USERNAME не определен!');
    }
}

// ===================== Team ID =====================
const urlParams = new URLSearchParams(window.location.search);
TEAM_ID = urlParams.get("team_id") || null;

if (!TEAM_ID) {
    document.getElementById("main-board").style.display = "none";
    document.getElementById("no-team-id").style.display = "block";
} else {
    // ===================== Socket.IO =====================
    socket = io();
    socket.emit("join_team", { team_id: TEAM_ID });
    socket.on("team_task_added", (task) => {
        TASKS.push(task);
        renderBoard();
    });
    socket.on("team_task_updated", (task) => {
        let idx = TASKS.findIndex((t) => t.id === task.id);
        if (idx !== -1) TASKS[idx] = task;
        renderBoard();
    });
    socket.on("team_task_deleted", (data) => {
        TASKS = TASKS.filter((t) => t.id !== data.id);
        renderBoard();
    });
    socket.on("team_tasks_reordered", (data) => {
        if (data.team_id == TEAM_ID) fetchTeamBoard();
    });
    // Socket.IO обработчики комментариев
    socket.on("comment_added", (data) => {
        if (data.team_id === TEAM_ID) {
            // Если открыта модалка с той же задачей, обновляем комментарии
            if (window._lastOpenedTask && window._lastOpenedTask.id === data.task_id) {
                window.loadModalComments(true);
            }

            // Показываем уведомление если комментарий не наш
            if (data.author !== USERNAME) {
                if (window.toast) {
                    const task = TASKS.find(t => t.id === data.task_id);
                    const taskTitle = task ? task.title : 'Задача';
                    window.toast.newComment(data.author, taskTitle);
                }
            }
        }
    });
    socket.on("comment_deleted", (data) => {
        if (data.team_id === TEAM_ID) {
            // Если открыта модалка с той же задачей, обновляем комментарии
            if (window._lastOpenedTask && window._lastOpenedTask.id === data.task_id) {
                window.loadModalComments();
            }
        }
    });
    // ===================== Socket.IO: статусы =====================
    if (socket) {
        socket.on("team_status_added", (data) => {
            if (data.team_id == TEAM_ID) fetchTeamBoard();
        });
        socket.on("team_status_deleted", (data) => {
            if (data.team_id == TEAM_ID) fetchTeamBoard();
        });
    }

    // Гарантированная загрузка доски после инициализации
    fetchTeamBoard();
}

// Инициализируем USERNAME при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    initUsername();
    // Дополнительная проверка через небольшую задержку
    setTimeout(() => {
        if (!USERNAME && document.body) {
            USERNAME = document.body.getAttribute('data-username');
        }
    }, 100);
});

// ========== User Dropdown ==========
// Обработчики перенесены в team_board.js

// ========== Профиль (логика вынесена в profile.js) ==========

// ========== Выход ==========
// Обработчик перенесен в team_board.js

// ========== Кнопка Мои команды ==========
// Обработчик перенесен в team_board.js

// ========== Смена пароля ==========
// Обработчик перенесен в team_board.js

// ========== О проекте ==========
// Обработчик перенесен в team_board.js

// ========== Обработчики тегов ==========
// Функции перенесены в team_board.js

// ===================== Modal: Task =====================
// Функции openTaskModal и closeTaskModal перенесены в team_board.js

// === Локальное обновление задач ===
// Функции перенесены в team_board.js

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

// Обработчик отправки формы задачи
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
        let tags = getSelectedTags();
        let due_date = this.task_due_date.value || null;
        let assignee_id = this.task_assignee.value || null;
        // Всегда подставляем ID, если выбран из MEMBERS
        if (assignee_id && Array.isArray(MEMBERS)) {
            const member = MEMBERS.find(m => m.username == assignee_id || m.id == assignee_id);
            if (member) assignee_id = member.id;
        }
        let method = id ? "PATCH" : "POST";
        let url =
            `/${USERNAME}/api/teams/${TEAM_ID}/tasks` + (id ? `/${id}` : "");
        let body = {
            text,
            description,
            status,
            tags,
            due_date,
            assignee_id,
        };
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
            // --- Локальное обновление только для редактирования ---
            if (id) {
                // Редактирование: обновить карточку
                const idx = TASKS.findIndex(t => t.id == id);
                if (idx !== -1) {
                    TASKS[idx] = { ...TASKS[idx], ...body, id };
                    updateTaskCard(TASKS[idx]);
                    // Автоматически открыть задачу для просмотра после редактирования
                    setTimeout(() => {
                        openViewTaskModal(TASKS[idx]);
                    }, 100);
                }
            }
            // Для новых задач локальное добавление не нужно - Socket.IO сделает это
            if (window.toast && !id) {
                window.toast.taskCreated(text);
            }
        } else {
            let err = data && data.error ? data.error : "Ошибка сохранения!";
            document.getElementById("task-modal-error").innerText = err;
        }
    };
}

// Функция closeTaskModal перенесена в team_board.js

// Обработчик закрытия модалки задачи по клику вне окна
const taskModal = document.getElementById("task-modal");

// ===================== Modal: Status =====================
// Функции openStatusModal, closeStatusModal и обработчики перенесены в team_board.js

// ===================== Modal: View Task =====================
// Функции перенесены в team_board.js

// Обработчик закрытия модалки просмотра задачи по клику вне окна
const viewTaskModal = document.getElementById("view-task-modal");

// ===================== Team Functions =====================
async function fetchTeamInfo() {
    try {
        let r = await fetch(`/${USERNAME}/api/teams/${TEAM_ID}/info`, { headers: window.getHeaders() });
        let data = await r.json();
        setTeamNameInTopbar(data.name);
    } catch (error) {
        // Ошибка получения информации о команде
    }
}

// JS: Рендер участников в модалке редактирования команды (как в kanban.html)
function renderEditTeamMembers(team) {
    const membersDiv = document.getElementById("universal-edit-team-members");
    if (!membersDiv) return;
    membersDiv.innerHTML = "";
    // Лидер всегда сверху, без кнопок
    const leader = team.leader_name || team.leader;
    if (leader) {
        membersDiv.innerHTML += `
          <div class="member-item leader-member" style="display:flex;align-items:center;gap:10px;background:rgba(255,152,0,0.10);border:2px solid #ff9800;box-shadow:0 2px 8px #ff980033;">
            <span class="material-icons member-icon" style="color: #ff9800; font-size:1.3em;">star</span>
            <span class="member-info" style="font-weight:800;color:#ff9800;">${escapeHTML(leader)}</span>
            <span class="member-admin" style="background:#ff9800;color:#fff;font-weight:900;margin-left:10px;padding:4px 10px;border-radius:8px;font-size:1em;">админ</span>
          </div>
        `;
    }
    // Остальные участники
    (team.members || []).forEach((member) => {
        if (member !== leader) {
            membersDiv.innerHTML += `
            <div class="edit-team-member" style="display:flex;align-items:center;gap:10px;">
              <span class="material-icons member-icon" style="color:var(--accent);font-size:1.3em;">person</span>
              <span class="member-info">${escapeHTML(member)}</span>
              <button class="remove-member" onclick="removeMember('${member}')">
                <span class="material-icons">close</span>
              </button>
              <button class="make-leader" onclick="window.makeLeader && window.makeLeader('${member}')">
                <span class="material-icons">star</span>
              </button>
              </div>
            `;
        }
    });
}
// Функции makeLeader и removeMember перенесены в team_board.js

// --- Анимация для крестика и звездочки ---
// Добавить в style.css:
// .btn-animate { transform: scale(1.25) rotate(-12deg); filter: brightness(1.3); transition: all 0.28s cubic-bezier(.4,1.4,.6,1); }

// JS: красивые теги в карточках и просмотре задачи
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

// ===================== Инициализация обработчиков модалок =====================
// Универсальный обработчик закрытия модалок
function bindModalCloseHandlers() {
    document.querySelectorAll(".modal-close").forEach((btn) => {
        btn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            const modal = btn.closest(".modal");
            if (modal) modal.classList.remove("show");
        };
    });
    document.querySelectorAll(".modal").forEach((modal) => {
        // удалено: modal.onclick = function (e) { ... }
    });
}

// Вызвать после DOMContentLoaded
bindModalCloseHandlers();

// ===================== Team Creation =====================
// Обработчик перенесен в конец файла

// ===================== Profile Handlers =====================
// Кнопка создания команды
const openCreateTeamBtn = document.getElementById(
    "open-create-team-modal"
);
if (openCreateTeamBtn) {
    openCreateTeamBtn.onclick = function () {
        document.getElementById("universal-create-team-modal").classList.add("show");
        document.getElementById("universal-create-team-error").innerText = "";
        document.getElementById("team-name-input").value = "";
    };
}

// ===================== SPA: Fetch Board (эталон kanban.html, но для команды)
async function fetchTeamBoard() {
    if (!TEAM_ID) {
        console.error('[team_board] TEAM_ID не определен!');
        return;
    }

    // Проверяем и инициализируем USERNAME если нужно
    if (!USERNAME) {
        initUsername();
        if (!USERNAME) {
            console.error('[team_board] USERNAME не определен для fetchTeamBoard!');
            return;
        }
    }

    try {
        let [statuses, tasks, members] = await Promise.all([
            fetch(`/${USERNAME}/api/teams/${TEAM_ID}/statuses`).then((r) =>
                r.json()
            ),
            fetch(`/${USERNAME}/api/teams/${TEAM_ID}/tasks`).then((r) =>
                r.json()
            ),
            fetch(`/${USERNAME}/api/teams/${TEAM_ID}/members`).then((r) =>
                r.json()
            ),
        ]);

        // Проверяем, что получили валидные данные
        if (Array.isArray(statuses)) {
            STATUSES = statuses;
        } else if (statuses && statuses.error) {
            STATUSES = [];
        } else {
            STATUSES = [];
        }

        if (Array.isArray(tasks)) {
            TASKS = tasks;
        } else if (tasks && tasks.tasks && Array.isArray(tasks.tasks)) {
            TASKS = tasks.tasks;
        } else if (tasks && tasks.error) {
            TASKS = [];
        } else {
            TASKS = [];
        }

        // Получаем участников с их ID
        MEMBERS = [];
        if (members && members.members && members.members.length > 0) {
            // Используем структуру с id и username из API
            MEMBERS = members.members;
        }

        renderBoard();
        bindAddStatusBtn();

        // Обновляем данные для поиска после успешной загрузки
        window.STATUSES = STATUSES;
        window.MEMBERS = MEMBERS;
        window.TASKS = TASKS;

        // Уведомляем о загрузке данных для поиска
        window.dispatchEvent(new Event('teamDataLoaded'));
        // Переинициализируем поисковую панель после загрузки данных
        if (window.searchPanel && typeof window.searchPanel.populateFilters === 'function') {
            window.searchPanel.populateFilters();
        }

        // Вызов события для обновления фильтров
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new Event('kanbanBoardRendered'));
        }
    } catch (error) {
        STATUSES = [];
        TASKS = [];
        MEMBERS = [];
        renderBoard();
        bindAddStatusBtn();
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new Event('kanbanBoardRendered'));
        }

        // Обновляем данные для поиска в любом случае
        window.STATUSES = STATUSES;
        window.MEMBERS = MEMBERS;
        window.TASKS = TASKS;

        // Уведомляем о загрузке данных для поиска
        window.dispatchEvent(new Event('teamDataLoaded'));
        // Переинициализируем поисковую панель после загрузки данных
        if (window.searchPanel && typeof window.searchPanel.populateFilters === 'function') {
            window.searchPanel.populateFilters();
        }
    }
}

// ===================== Render (эталон kanban.html, но для команды)
function renderBoard() {
    // В начало функции renderBoard добавить:
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
    if (!MEMBERS || !Array.isArray(MEMBERS)) {
        MEMBERS = [];
    }

    if (STATUSES.length === 0) {
        row.innerHTML = `
          <div style="text-align: center; padding: 40px; color: var(--text-secondary);">
            <span class="material-icons" style="font-size: 3em; margin-bottom: 16px; opacity: 0.5;">dashboard</span>
            <h3>Нет статусов</h3>
            <p>Создайте первый статус для начала работы с доской</p>
            <button class="btn btn-primary" onclick="openStatusModal()">
              <span class="material-icons">add_circle</span>
              Создать статус
            </button>
          </div>
        `;
        return;
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
            <button class="kanban-add-task-btn" data-status-code="${status.code
            }">
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
    bindAddStatusBtn();
    bindTaskViewHandlers();
    // Восстанавливаем состояние поиска после рендера
    if (window.searchPanel && typeof window.searchPanel.restoreSearchState === 'function') {
        window.searchPanel.restoreSearchState();
    }
    // Обновляем счётчик задач после рендера
    if (window.searchPanel && typeof window.searchPanel.updateSearchStats === 'function') {
        const tasks = document.querySelectorAll('.kanban-task');
        window.searchPanel.updateSearchStats(tasks.length, tasks.length);
    }
}

// ===================== Task View Handlers =====================
function bindTaskViewHandlers() {
    document.querySelectorAll(".kanban-task").forEach((div) => {
        div.onclick = function (e) {
            if (e.target.closest('.edit-btn,.delete-btn')) return;
            const id = div.dataset.taskId;
            const task = TASKS.find((t) => String(t.id) === String(id));
            if (!task) {
                return;
            }
            openViewTaskModal(task);
        };
    });
}

// ===================== Task Card Creation =====================
function createTaskCard(task) {
    try {
        if (!task || !task.id) {
            return document.createElement("div"); // Пустой элемент
        }

        const div = document.createElement("div");
        div.className = "kanban-task";
        div.dataset.taskId = task.id;

        let tagsHtml = "";
        if (task.tags && task.tags.length) {
            tagsHtml = renderTags(task.tags);
        }

        let dateHtml = task.due_date
            ? `<span class='task-date-badge'>${formatRuDate(task.due_date)}</span>`
            : "";

        // Аватарка исполнителя
        let assignee = null;
        if (task.assignee_id && Array.isArray(MEMBERS)) {
            assignee = MEMBERS.find(
                (m) => m.username == task.assignee_id || m.id == assignee_id
            );
        }

        let avatarHtml = "";
        if (assignee) {
            if (assignee.avatar_url) {
                avatarHtml = `<img src="${assignee.avatar_url}" alt="${escapeHTML(assignee.username)}" class="task-avatar-img" />`;
            } else {
                avatarHtml = `<span class='task-avatar' style="background-color: ${getAvatarColor(assignee.username)}">${getInitials(assignee.username)}</span>`;
            }
        }

        let assigneeNameHtml = assignee
            ? `<span class='assignee-name'>${escapeHTML(assignee.username)}</span>`
            : task.assignee_id
                ? `<span class='assignee-name'>${escapeHTML(task.assignee_id)}</span>`
                : "<span style='color:#b9bccc'>Не назначено</span>";

        let descPreview = "";
        if (task.description) {
            try {
                descPreview = stripTags(task.description);
                descPreview = truncate(descPreview, 120);
            } catch (e) {
                descPreview = "";
            }
        }

        div.innerHTML = `
          <div class="task-header">
            <div class="task-title">${escapeHTML(truncate(task.text || "", 80))}</div>
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
            <button class="icon-btn edit-btn" data-task-id="${task.id}"><span class="material-icons">edit</span></button>
            <button class="icon-btn delete-btn" data-task-id="${task.id}"><span class="material-icons">delete</span></button>
          </div>
        `;

        return div;
    } catch (error) {
        // Возвращаем простую карточку с ошибкой
        const errorDiv = document.createElement("div");
        errorDiv.className = "kanban-task error-task";
        errorDiv.innerHTML = `
          <div class="task-header">
            <div class="task-title" style="color: #ff5470;">Ошибка загрузки задачи</div>
          </div>
          <div class="task-desc" style="color: #b9bccc; font-size: 0.9em;">
            Не удалось отобразить задачу (ID: ${task?.id || 'неизвестен'})
          </div>
        `;
        return errorDiv;
    }
}

function truncate(str, len) {
    if (!str) return "";
    return str.length > len ? str.slice(0, len) + "…" : str;
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

// ===================== Вспомогательные функции =====================
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// Добавляем недостающую функцию stripTags
function stripTags(html) {
    if (!html) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}

function truncate(str, len) {
    if (!str) return "";
    return str.length > len ? str.slice(0, len) + "…" : str;
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

// Функция для получения названия задачи по ID
function getTaskTitle(taskId) {
    const task = TASKS.find(t => t.id === taskId);
    return task ? task.title : 'Задача';
}

// ===================== ФУНКЦИИ ДЛЯ РАБОТЫ С ВЛОЖЕНИЯМИ =====================

// Создание блока вложений
function createAttachmentsBlock(description) {
    const images = extractImagesFromDescription(description);
    if (images.length === 0) return "";

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
        const fileName = getImageFileName(image.src);
        attachmentsHtml += `
          <div class="attachment-item" onclick="openImageModal('${escapeHTML(image.src)}', '${escapeHTML(fileName)}')">
            <div class="attachment-preview">
              <img src="${escapeHTML(image.src)}" alt="${escapeHTML(image.alt || fileName)}" loading="lazy">
            </div>
            <div class="attachment-info">
              <div class="attachment-name">${escapeHTML(fileName)}</div>
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

// Извлечение изображений из описания
function extractImagesFromDescription(description) {
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

    return images;
}

// Получение имени файла из URL
function getImageFileName(url) {
    try {
        // Если это data URL (base64), создаем красивое имя
        if (url.startsWith('data:image/')) {
            const mimeType = url.split(';')[0].split(':')[1];
            const extension = mimeType.split('/')[1];
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            return `Изображение_${timestamp}.${extension}`;
        }

        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        let fileName = pathname.split('/').pop();

        // Если имя файла пустое, содержит только символы или выглядит как хеш
        if (!fileName || fileName.length < 3 || /^[a-zA-Z0-9+/=]+$/.test(fileName)) {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

            // Пытаемся определить расширение из URL или заголовков
            const extension = getFileExtensionFromUrl(url) || 'jpg';
            fileName = `Изображение_${timestamp}.${extension}`;
        }

        // Декодируем имя файла если оно закодировано
        try {
            fileName = decodeURIComponent(fileName);
        } catch (e) {
            // Если не удается декодировать, оставляем как есть
        }

        return fileName;
    } catch (e) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        return `Изображение_${timestamp}.jpg`;
    }
}

// Вспомогательная функция для определения расширения файла
function getFileExtensionFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const match = pathname.match(/\.([a-z0-9]+)$/i);
        return match ? match[1].toLowerCase() : null;
    } catch (e) {
        return null;
    }
}

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

// Открытие модального окна с изображением
function openImageModal(src, fileName) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('image-modal-img');
    const title = document.getElementById('image-modal-title');

    if (modal && img && title) {
        // Проверяем и исправляем путь к изображению
        let correctedSrc = src;

        // Если путь относительный и не начинается с /static/uploads/, добавляем
        if (!src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('/static/uploads/') && !src.startsWith('/uploads/')) {
            if (src.startsWith('uploads/')) {
                correctedSrc = '/static/' + src;
            } else {
                correctedSrc = '/static/uploads/' + src;
            }
        }

        // Если путь начинается с /uploads/, заменяем на /static/uploads/
        if (src.startsWith('/uploads/')) {
            correctedSrc = src.replace('/uploads/', '/static/uploads/');
        }



        img.src = correctedSrc;
        img.alt = fileName;
        title.textContent = fileName;
        modal.classList.add('show');

        // Сохраняем данные для экспорта
        window.currentImageData = { src: correctedSrc, fileName };

        // Обработчик закрытия по клику вне модального окна
        modal.onclick = function (e) {
            if (e.target === modal) {
                closeImageModal();
            }
        };

        // Обработчик клавиши Escape
        document.addEventListener('keydown', handleImageModalKeydown);
    }
}

// Закрытие модального окна с изображением
function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.classList.remove('show');
        window.currentImageData = null;
        document.removeEventListener('keydown', handleImageModalKeydown);
    }
}

// Обработчик клавиш для модального окна
function handleImageModalKeydown(e) {
    if (e.key === 'Escape') {
        closeImageModal();
    }
}

// Скачивание изображения
function downloadImage() {
    if (!window.currentImageData) return;

    const { src, fileName } = window.currentImageData;
    const link = document.createElement('a');
    link.href = src;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}



// Привязка обработчиков для блоков вложений
function bindAttachmentsHandlers() {
    // Обработчики уже привязаны через onclick в HTML, но можно добавить дополнительные
    document.querySelectorAll('.attachments-block').forEach(block => {
        const header = block.querySelector('.attachments-header');
        if (header && !header.dataset.bound) {
            header.dataset.bound = 'true';
            // Дополнительные обработчики при необходимости
        }
    });
}

// ===================== Event Handlers =====================
// Функции перенесены в team_board.js

// ========== Команды: логика и рендер ==========
// Функции перенесены в team_board.js

// ========== Модалка редактирования команды ==========
// Вся логика команд перенесена в team-modal.js

// ========== Универсальные обработчики модалок ==========
function bindModalCloseHandlers() {
    document.querySelectorAll(".modal-close").forEach((btn) => {
        btn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            const modal = btn.closest(".modal");
            if (modal) modal.classList.remove("show");
        };
    });
}

// ========== Обработчики кнопок отмены ==========
function bindCancelButtons() {
    document.querySelectorAll('[onclick*="close"]').forEach((btn) => {
        const onclick = btn.getAttribute('onclick');
        if (onclick && onclick.includes('close')) {
            btn.onclick = function (e) {
                e.preventDefault();
                const modalName = onclick.match(/close(\w+)Modal/);
                if (modalName) {
                    const modal = document.getElementById(modalName[1].toLowerCase() + '-modal');
                    if (modal) modal.classList.remove('show');
                }
            };
        }
    });
}

// ========== Инициализация ==========
bindModalCloseHandlers();
bindCancelButtons();

document.getElementById('close-view-task-modal-btn')?.addEventListener('click', closeViewTaskModal);

// Добавим вызов при старте страницы, если window.USER_AVATAR_URL определён
if (window.USER_AVATAR_URL && window.updateTopbarAvatar) {
    window.updateTopbarAvatar(window.USER_AVATAR_URL);
}

document.getElementById('close-change-password-modal-btn')?.addEventListener('click', closeChangePasswordModal);
document.getElementById('cancel-change-password-btn')?.addEventListener('click', closeChangePasswordModal);

// ========== Инициализация аватарки в topbar ==========
// Проверяем, есть ли аватарка при загрузке страницы
if (window.USER_AVATAR_URL && typeof updateTopbarAvatar === 'function') {
    updateTopbarAvatar(window.USER_AVATAR_URL);
}

// ===== СИСТЕМА УВЕДОМЛЕНИЙ =====
// Переменные перенесены в конец файла

// Инициализация Socket.IO для уведомлений
function initNotificationsSocket() {
    if (typeof io !== 'undefined') {
        const socket = io();
        const username = document.body ? document.body.getAttribute('data-username') : null;
        if (!username) {
            console.error('[notifications] username не определен для Socket.IO!');
            return;
        }

        // Подключаемся к личной комнате пользователя
        socket.emit('join_user', { username: username });

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

// Загрузка уведомлений
async function loadNotifications() {
    try {
        let username;
        if (typeof window.getUsername === 'function') {
            username = window.getUsername();
        } else if (document.body) {
            username = USERNAME || document.body.getAttribute('data-username');
        } else {
            username = USERNAME;
        }

        if (!username) {
            console.error('[notifications] username не определен!');
            return;
        }
        const response = await fetch(`/${username}/api/notifications`, {
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

        // Красиво выделяем ники в тексте уведомлений
        const highlightUsername = (text, username) => {
            if (!username) return text;
            const regex = new RegExp(`\\b${escapeRegex(username)}\\b`, 'gi');
            return text.replace(regex, `<span class="notif-username">${username}</span>`);
        };

        const titleWithHighlight = highlightUsername(escapeHTML(notification.title), notification.from_username);
        const messageWithHighlight = highlightUsername(escapeHTML(notification.message), notification.from_username);

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
                ${titleWithHighlight}
              </div>
              <div class="notification-message">${messageWithHighlight}</div>
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

// Экранирование специальных символов для регулярных выражений
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Отметить уведомления как прочитанные
async function markNotificationAsRead(notificationIds) {
    try {
        const username = USERNAME || (document.body ? document.body.getAttribute('data-username') : null);
        if (!username) {
            console.error('[notifications] username не определен!');
            return;
        }
        const response = await fetch(`/${username}/api/notifications/mark_read`, {
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
        const username = USERNAME || (document.body ? document.body.getAttribute('data-username') : null);
        if (!username) {
            console.error('[notifications] username не определен!');
            return;
        }
        const response = await fetch(`/${username}/api/notifications/mark_read`, {
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

    // Инициализация Socket.IO
    initNotificationsSocket();

    // Загружаем уведомления при старте
    loadNotifications();
}

// Запускаем систему уведомлений при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    initNotifications();
});

// ИСПРАВЛЕНИЕ 4: Авто-рост textarea для комментариев
function initTextareaAutoResize() {
    const modalCommentInput = document.getElementById('modal-comment-input');
    if (modalCommentInput) {
        // Удаляем старые обработчики
        modalCommentInput.removeEventListener('input', textareaAutoResize);

        // Добавляем новый обработчик
        modalCommentInput.addEventListener('input', textareaAutoResize);
        modalCommentInput.addEventListener('keydown', textareaAutoResize);

        // Изначально сбрасываем высоту
        modalCommentInput.style.height = 'auto';
        modalCommentInput.style.minHeight = '44px';
        modalCommentInput.style.maxHeight = '180px';
        modalCommentInput.style.resize = 'vertical';
    }
}

function textareaAutoResize() {
    this.style.height = 'auto';
    const newHeight = Math.min(Math.max(this.scrollHeight, 44), 180);
    this.style.height = newHeight + 'px';
}

// Инициализируем при загрузке страницы
document.addEventListener('DOMContentLoaded', initTextareaAutoResize);

// Переинициализируем при открытии модалки
const originalOpenViewTaskModal2 = window.openViewTaskModal;
window.openViewTaskModal = function (task) {
    if (originalOpenViewTaskModal2) {
        originalOpenViewTaskModal2(task);
    }
    // Переинициализируем textarea через небольшую задержку
    setTimeout(() => {
        initTextareaAutoResize();
    }, 200);
};

// Обработчик assignee-autocomplete перенесен в функцию openTaskModal
// Инициализация toast уведомлений
document.addEventListener('DOMContentLoaded', function () {
    if (window.ToastNotifications) {
        window.toast = new ToastNotifications();
    }
});

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

    // ... существующий код ...
}

// Функция для безопасного отключения всех сокетов
function disconnectAllSockets() {
    // Отключаем основной сокет
    if (window.socket && typeof window.socket.disconnect === 'function') {
        try {
            window.socket.disconnect();
        } catch (e) {
            console.log('[team_board] Socket disconnect error:', e);
        }
        window.socket = null;
    }

    // Отключаем сокет уведомлений если есть
    if (window.notificationsSocket && typeof window.notificationsSocket.disconnect === 'function') {
        try {
            window.notificationsSocket.disconnect();
        } catch (e) {
            console.log('[team_board] Notifications socket disconnect error:', e);
        }
        window.notificationsSocket = null;
    }

    // Отключаем глобальный сокет если есть
    if (window.globalSocket && typeof window.globalSocket.disconnect === 'function') {
        try {
            window.globalSocket.disconnect();
        } catch (e) {
            console.log('[team_board] Global socket disconnect error:', e);
        }
        window.globalSocket = null;
    }
}

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

// Обработчики для других кнопок навигации
const teamsBtn = document.getElementById("teams-btn");
const profileBtn = document.getElementById("profile-btn");
const aboutBtn = document.getElementById("about-btn");
const logoutBtn = document.getElementById("logout-btn");

if (teamsBtn) {
    teamsBtn.onclick = () => {
        if (typeof smoothNavigate === 'function') {
            smoothNavigate(`/${USERNAME}/teams`);
        } else {
            disconnectAllSockets();
            location.href = `/${USERNAME}/teams`;
        }
    };
}

if (profileBtn) {
    profileBtn.onclick = () => {
        if (typeof smoothNavigate === 'function') {
            smoothNavigate(`/${USERNAME}/profile`);
        } else {
            disconnectAllSockets();
            location.href = `/${USERNAME}/profile`;
        }
    };
}

if (aboutBtn) {
    aboutBtn.onclick = () => {
        if (typeof smoothNavigate === 'function') {
            smoothNavigate(`/${USERNAME}/about`);
        } else {
            disconnectAllSockets();
            location.href = `/${USERNAME}/about`;
        }
    };
}

if (logoutBtn) {
    logoutBtn.onclick = () => {
        if (typeof smoothNavigate === 'function') {
            smoothNavigate(`/${USERNAME}/logout`);
        } else {
            disconnectAllSockets();
            location.href = `/${USERNAME}/logout`;
        }
    };
}

// ===================== Modal: Task =====================
async function openTaskModal({
    edit = false,
    id = null,
    text = "",
    description = "",
    status = "",
    assignee_id = null,
    tags = [],
    due_date = null,
} = {}) {


    // Проверяем и инициализируем USERNAME если нужно
    if (!USERNAME) {
        initUsername();
        if (!USERNAME) {
            console.error('[team_board] USERNAME не определен для openTaskModal!');
            return;
        }
    }

    const modal = document.getElementById("task-modal");
    if (!modal) return;
    // Гарантированно подгружаем участников
    try {
        let resp = await fetch(`/${USERNAME}/api/teams/${TEAM_ID}/members`, { headers: window.getHeaders() });
        let data = await resp.json();
        MEMBERS = (data && data.members) ? data.members : [];
    } catch (e) {
        MEMBERS = [];
    }
    document.getElementById("task-modal-title").innerText = edit
        ? "Редактировать задачу"
        : "Новая задача";
    document.getElementById("edit_task_id").value = id || "";
    document.getElementById("task_text").value = text || "";

    // Инициализируем Quill.js если ещё не инициализирован
    if (!window.taskEditor) {
        initTaskEditor();
    }

    // Устанавливаем содержимое редактора
    if (window.taskEditor) {
        window.taskEditor.root.innerHTML = description || "";
    }

    let statusSel = document.getElementById("task_status");
    statusSel.innerHTML = STATUSES.map(
        (s) =>
            `<option value="${s.code}"${(status || STATUSES[0].code) === s.code ? " selected" : ""
            }>${escapeHTML(s.title)}</option>`
    ).join("");

    // Теги
    let tagSet = new Set(tags || []);
    document.querySelectorAll(".tag-badge[data-tag]").forEach((badge) => {
        if (tagSet.has(badge.dataset.tag)) {
            badge.classList.add("selected");
        } else {
            badge.classList.remove("selected");
        }
    });

    document.getElementById("task_due_date").value = due_date
        ? due_date.slice(0, 10)
        : "";

    // Исполнитель
    let assigneeInput = document.getElementById("task_assignee_input");
    let assigneeHidden = document.getElementById("task_assignee");
    // --- Устанавливаем значение исполнителя при редактировании ---
    if (assigneeInput && assigneeHidden) {
        if (assignee_id && Array.isArray(MEMBERS)) {
            let member = MEMBERS.find(
                (m) => m.username == assignee_id || m.id == assignee_id
            );
            if (member) {
                assigneeInput.value = member.username;
                assigneeHidden.value = member.id;
            } else {
                assigneeInput.value = assignee_id;
                assigneeHidden.value = assignee_id;
            }
        } else {
            assigneeInput.value = "";
            assigneeHidden.value = "";
        }
    }
    // --- Инициализация автокомплита только после открытия модалки ---
    setTimeout(() => {
        let ac = document.getElementById("task-assignee-autocomplete");
        if (!assigneeInput || !ac) return;
        assigneeInput.oninput = function () {
            let val = assigneeInput.value.toLowerCase();
            let list = Array.isArray(MEMBERS) ? MEMBERS.filter(
                (m) => m && m.username && m.username.toLowerCase().includes(val)
            ) : [];
            list = list.slice(0, 5); // Ограничиваем до 5 совпадений
            if (!val || list.length === 0) {
                ac.innerHTML = "";
                ac.style.display = "none";
                ac.classList.remove('show');
                assigneeHidden.value = "";
                return;
            }
            ac.innerHTML = list
                .map(
                    (m) => `<div class='autocomplete-item' data-id='${m.id}'>${m.username}</div>`
                )
                .join("");
            ac.style.display = "block";
            ac.classList.add('show');
        };
        assigneeInput.onfocus = function () {
            assigneeInput.oninput();
        };
        assigneeInput.onblur = function () {
            setTimeout(() => {
                if (ac) {
                    ac.style.display = "none";
                    ac.classList.remove('show');
                    ac.innerHTML = "";
                }
            }, 120);
        };
        ac.onclick = function (e) {
            if (e.target.classList.contains("autocomplete-item")) {
                assigneeInput.value = e.target.textContent;
                assigneeHidden.value = e.target.getAttribute("data-id");
                ac.style.display = "none";
                ac.classList.remove('show');
                ac.innerHTML = "";
            }
        };
    }, 0);

    document.getElementById("task-modal-error").innerText = "";
    modal.classList.add("show");
    bindTagBadges();
    setTimeout(() => {
        document.getElementById("task_text").focus();
    }, 120);
}

// Функция закрытия модалки задачи
function closeTaskModal() {
    const modal = document.getElementById("task-modal");
    if (modal) modal.classList.remove("show");
    const form = document.getElementById("task-modal-form");
    if (form) form.reset();
    // Очищаем Quill.js редактор
    if (window.taskEditor) {
        window.taskEditor.root.innerHTML = "";
    }
    // Сбрасываем стили тегов
    document.querySelectorAll(".tag-badge").forEach((badge) => {
        badge.classList.remove("selected");
    });
}

// Инициализация обработчиков модалки задачи
document.addEventListener('DOMContentLoaded', function () {
    // Обработчик кнопки открытия модалки новой задачи
    const openTaskModalBtn = document.getElementById("open-task-modal");
    if (openTaskModalBtn) {
        openTaskModalBtn.onclick = function () {
            return openTaskModal();
        };
    }

    // Обработчик закрытия модалки задачи по клику вне окна
    const taskModal = document.getElementById("task-modal");
    if (taskModal) {
        taskModal.onclick = function (e) {
            if (e.target === this) {
                closeTaskModal();
            }
        };
    }
});

// ========== Инициализация Quill.js ==========
function initTaskEditor() {
    if (window.taskEditor) return;

    const editorElement = document.getElementById("task_description_editor");
    if (!editorElement) return;

    window.taskEditor = new Quill(editorElement, {
        theme: "snow",
        modules: {
            toolbar: [
                [{ header: [1, 2, false] }],
                ["bold", "italic", "underline"],
                ["link", "image"],
                [{ list: "ordered" }, { list: "bullet" }],
                ["clean"],
            ],
        },
        placeholder: "Описание задачи...",
    });

    // Кастомный image handler для загрузки на сервер
    const toolbar = window.taskEditor.getModule("toolbar");
    toolbar.addHandler("image", imageHandler);
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
                body: formData,
            });
            const data = await res.json();
            if (data.url) {
                const range = window.taskEditor.getSelection();
                window.taskEditor.insertEmbed(range.index, "image", data.url);
            } else {
                if (window.toast) {
                    window.toast.imageUploadError(data.error || "Ошибка загрузки изображения");
                } else {
                    alert("Ошибка загрузки изображения: " + (data.error || ""));
                }
            }
        } catch (error) {
            if (window.toast) {
                window.toast.imageUploadError("Ошибка загрузки изображения");
            } else {
                alert("Ошибка загрузки изображения");
            }
        }
    };
}

// ===================== Modal: Status =====================
function openStatusModal() {
    const modal = document.getElementById("status-modal");
    if (!modal) return;
    modal.classList.add("show");
    document.getElementById("status-modal-error").innerText = "";
    document.getElementById("new_status_title").value = "";
    setTimeout(() => {
        document.getElementById("new_status_title").focus();
    }, 120);
}

function closeStatusModal() {
    const modal = document.getElementById("status-modal");
    if (modal) modal.classList.remove("show");
    const form = document.getElementById("status-modal-form");
    if (form) form.reset();
}

// Инициализация обработчиков модалки статуса
document.addEventListener('DOMContentLoaded', function () {
    // Обработчик кнопки открытия модалки нового статуса
    const openStatusModalBtn = document.getElementById("open-status-modal");
    if (openStatusModalBtn) {
        openStatusModalBtn.onclick = function () {
            openStatusModal();
        };
    }

    // Обработчик отправки формы статуса
    const statusModalForm = document.getElementById("status-modal-form");
    if (statusModalForm) {
        statusModalForm.onsubmit = async function (e) {
            e.preventDefault();
            let title = this.new_status_title.value.trim();
            if (!title) return;
            let code = "s" + Date.now();
            let resp = await fetch(
                `/${USERNAME}/api/teams/${TEAM_ID}/statuses`,
                {
                    method: "POST",
                    headers: window.getHeaders(),
                    body: JSON.stringify({ title, code }),
                }
            );
            if (resp.ok) {
                fetchTeamBoard();
                closeStatusModal();
            } else {
                document.getElementById("status-modal-error").innerText =
                    "Ошибка создания статуса!";
            }
        };
    }

    // Обработчик закрытия модалки статуса по клику вне окна
    const statusModal = document.getElementById("status-modal");
    if (statusModal) {
        statusModal.onclick = function (e) {
            if (e.target === this) {
                closeStatusModal();
            }
        };
    }
});

// ========== User Dropdown ==========
function initUserDropdown() {
    const userMenuBtn = document.getElementById("user-menu-btn");
    const userDropdown = document.getElementById("user-dropdown");
    if (userMenuBtn && userDropdown) {
        userMenuBtn.onclick = function (e) {
            e.stopPropagation();
            userDropdown.classList.toggle("open");
        };
        document.body.addEventListener("click", function () {
            userDropdown.classList.remove("open");
        });
        userDropdown.onclick = function (e) {
            e.stopPropagation();
        };
    }
}

// ========== Выход ==========
function initLogout() {
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
        logoutBtn.onclick = function () {
            const userDropdown = document.getElementById("user-dropdown");
            if (userDropdown) userDropdown.classList.remove("open");
            window.location.href = `/${USERNAME}/logout`;
        };
    }
}

// ========== Кнопка Мои команды ==========
function initTeamsModal() {
    const teamsBtn = document.getElementById("teams-btn");
    if (teamsBtn) {
        teamsBtn.onclick = function () {
            const userDropdown = document.getElementById("user-dropdown");
            if (userDropdown) userDropdown.classList.remove("open");
            const teamsModal = document.getElementById("universal-teams-modal");
            if (teamsModal) {
                teamsModal.classList.add("show");
                fetchTeams();
            }
        };
    }
}

function closeTeamsModal() {
    const modal = document.getElementById("universal-teams-modal");
    if (modal) modal.classList.remove("show");
}

// ========== Смена пароля ==========
function initChangePassword() {
    const changePasswordBtn = document.getElementById("change-password-btn");
    if (changePasswordBtn) {
        changePasswordBtn.onclick = function () {
            const userDropdown = document.getElementById("user-dropdown");
            if (userDropdown) userDropdown.classList.remove("open");
            const changePasswordForm = document.getElementById("change-password-form");
            const changePasswordError = document.getElementById("change-password-error");
            if (changePasswordForm) changePasswordForm.reset();
            if (changePasswordError) changePasswordError.innerText = "";
            const changePasswordModal = document.getElementById("change-password-modal");
            if (changePasswordModal) {
                changePasswordModal.classList.add("show");
            }
        };
    }

    const changePasswordForm = document.getElementById("change-password-form");
    if (changePasswordForm) {
        changePasswordForm.onsubmit = async function (e) {
            e.preventDefault();

            // Проверяем и инициализируем USERNAME если нужно
            if (!USERNAME) {
                initUsername();
                if (!USERNAME) {
                    console.error('[team_board] USERNAME не определен для смены пароля!');
                    return;
                }
            }

            let oldPass = document.getElementById("old_password").value;
            let newPass = document.getElementById("new_password").value;
            let newPass2 = document.getElementById("new_password2").value;
            let err = document.getElementById("change-password-error");
            if (newPass !== newPass2) {
                err.innerText = "Пароли не совпадают!";
                return;
            }
            let resp = await fetch(`/${USERNAME}/api/change_password`, {
                method: "POST",
                headers: window.getHeaders(),
                body: JSON.stringify({
                    old_password: oldPass,
                    new_password: newPass,
                }),
            });
            if (resp.ok) {
                err.style.color = "#32c964";
                err.innerText = "Пароль изменён!";
                setTimeout(() => {
                    if (typeof window.closeChangePasswordModal === 'function') {
                        window.closeChangePasswordModal();
                    }
                }, 900);
            } else {
                err.style.color = "#d11a2a";
                let data = await resp.json();
                err.innerText = data.error || "Ошибка смены пароля!";
            }
        };
    }
}

// Функция closeChangePasswordModal теперь в universal-modals.js

// ========== О проекте ==========
function initAboutModal() {
    const aboutBtn = document.getElementById("about-btn");
    if (aboutBtn) {
        aboutBtn.onclick = function () {
            const userDropdown = document.getElementById("user-dropdown");
            if (userDropdown) userDropdown.classList.remove("open");
            const aboutModal = document.getElementById("about-modal");
            if (aboutModal) {
                aboutModal.classList.add("show");
            }
        };
    }
}

// Функция closeAboutModal теперь в universal-modals.js

// ========== Профиль ==========
// Инициализация профиля происходит в profile.js

// ========== Обработчики тегов ==========
function bindTagBadges() {
    document.querySelectorAll(".tag-badge").forEach((badge) => {
        badge.onclick = function () {
            this.classList.toggle("selected");
        };
    });
}

function getSelectedTags() {
    const selectedTags = [];
    document.querySelectorAll(".tag-badge.selected").forEach((badge) => {
        selectedTags.push(badge.dataset.tag);
    });
    return selectedTags;
}

// === Локальное обновление задач ===
function updateTaskCard(task) {
    const card = document.querySelector(`.kanban-task[data-task-id='${task.id}']`);
    if (card) {
        const newCard = createTaskCard(task);
        card.replaceWith(newCard);
    }
}

function addTaskCard(task) {
    const col = document.querySelector(`.kanban-column[data-status-code='${task.status}'] .kanban-tasks`);
    if (col) {
        // Удаляем блок "Нет задач" если он есть
        const noTasksBlock = col.querySelector('.no-tasks');
        if (noTasksBlock) {
            noTasksBlock.remove();
        }

        const newCard = createTaskCard(task);
        col.appendChild(newCard);
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

// ========== Система комментариев ==========
(function () {
    let modalUsername = null;

    function initModalUsername() {
        // Используем функцию getUsername из HTML если она доступна
        if (typeof window.getUsername === 'function') {
            modalUsername = window.getUsername();
        } else if (document.body) {
            modalUsername = USERNAME || document.body.getAttribute('data-username');
        } else {
            modalUsername = USERNAME;
        }

        if (!modalUsername) {
            console.error('[comments] modalUsername не определен!');
        }
    }
    let lastCommentsCount = 0;
    let autoRefreshInterval = null;
    let isCommentsVisible = false;
    let hasScrolledUp = false;

    // Загрузка комментариев с улучшениями
    async function loadModalComments(markAsNew = false) {
        if (!TEAM_ID || !window._lastOpenedTask || !window._lastOpenedTask.id) return;

        // Инициализируем modalUsername если еще не инициализирован
        if (!modalUsername) {
            initModalUsername();
        }

        if (!modalUsername) {
            console.error('[comments] Не удалось получить modalUsername для загрузки комментариев');
            return;
        }

        // Определяем, какая модалка открыта и используем соответствующие элементы
        const isViewTaskModal = document.getElementById('view-task-modal').classList.contains('show');
        const containerId = isViewTaskModal ? 'view-task-comments-container' : 'comments-container';
        const container = document.getElementById(containerId);
        if (container) container.classList.add('loading');

        try {
            const resp = await fetch(`/${modalUsername}/api/teams/${TEAM_ID}/tasks/${window._lastOpenedTask.id}/comments`, { headers: window.getHeaders() });
            const comments = await resp.json();

            const currentCount = comments ? comments.length : 0;
            const hasNewComments = markAsNew && currentCount > lastCommentsCount;

            renderModalComments(comments, hasNewComments);
            updateCommentsCount(currentCount);

            // Показываем индикатор новых комментариев только если есть новые и пользователь не внизу
            if (hasNewComments && isUserScrolledUp()) {
                showNewCommentsIndicator(currentCount - lastCommentsCount);
            }

            lastCommentsCount = currentCount;
        } catch (error) {
            console.error('Ошибка загрузки комментариев:', error);
        } finally {
            if (container) container.classList.remove('loading');
        }
    }
    window.loadModalComments = loadModalComments;

    // Рендеринг комментариев с улучшениями
    function renderModalComments(comments, hasNewComments = false) {
        // Определяем, какая модалка открыта и используем соответствующие элементы
        const isViewTaskModal = document.getElementById('view-task-modal').classList.contains('show');
        const listId = isViewTaskModal ? 'view-task-comments-list' : 'modal-comments-list';
        const list = document.getElementById(listId);
        if (!list) return;

        if (!comments || comments.length === 0) {
            list.innerHTML = '<div class="no-comments"><span class="material-icons">chat_bubble_outline</span>Комментариев пока нет</div>';
            return;
        }

        const oldCommentsCount = list.children.length;
        const newCommentsToMark = hasNewComments ? comments.length - lastCommentsCount : 0;

        // Сортируем комментарии по дате - новые первыми
        const sortedComments = [...comments].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        list.innerHTML = sortedComments.map((c, index) => {
            // Только действительно новые комментарии получают анимацию
            const isReallyNewComment = hasNewComments && index >= lastCommentsCount && lastCommentsCount > 0;
            const isOnline = isUserOnline(c.author); // Функция для проверки онлайн-статуса

            return `
        <div class="comment-item ${isReallyNewComment ? 'new-comment' : ''}" data-comment-id="${c.id}">
          <div class="comment-avatar ${isOnline ? 'online' : ''}">
            ${c.avatar_url ? `<img src="${c.avatar_url}" alt="${c.author}" />` : `<span class="avatar-initial">${(c.author || '?')[0].toUpperCase()}</span>`}
          </div>
          <div class="comment-body">
            <div class="comment-meta">
              <a href="#" class="comment-author" data-username="${c.author}">${escapeHTML(c.author)}</a>
              <span class="comment-date">${formatDateTime(c.created_at)}</span>
              <div class="comment-actions">
                ${c.author === modalUsername ? `<button class="comment-delete-btn" aria-label="Удалить комментарий" title="Удалить" data-comment-id="${c.id}"><span class="material-icons">delete</span></button>` : ''}
              </div>
            </div>
            <div class="comment-text">${highlightMentions(escapeHTML(c.text), c.mentions)}</div>
          </div>
        </div>
      `;
        }).join('');

        // Назначаем обработчики
        bindCommentHandlers();

        // Убираем анимацию new-comment через 3 секунды
        setTimeout(() => {
            const newComments = list.querySelectorAll('.comment-item.new-comment');
            newComments.forEach(comment => {
                comment.classList.remove('new-comment');
            });
        }, 3000);

        // Автопрокрутка к новым комментариям
        if (hasNewComments && !hasScrolledUp) {
            setTimeout(() => scrollToBottom(), 100);
        }

        // Обновляем индикатор после рендеринга комментариев
        setTimeout(() => updateCommentsAboveIndicator(), 150);
    }

    // Привязка обработчиков комментариев
    function bindCommentHandlers() {
        // Определяем, какая модалка открыта и используем соответствующие элементы
        const isViewTaskModal = document.getElementById('view-task-modal').classList.contains('show');
        const listId = isViewTaskModal ? 'view-task-comments-list' : 'modal-comments-list';
        const list = document.getElementById(listId);
        if (!list) return;

        // Обработчики удаления
        list.querySelectorAll('.comment-delete-btn').forEach(btn => {
            btn.onclick = async function () {
                if (!confirm('Удалить комментарий?')) return;

                // Инициализируем modalUsername если еще не инициализирован
                if (!modalUsername) {
                    initModalUsername();
                }

                if (!modalUsername) {
                    console.error('[comments] Не удалось получить modalUsername для удаления комментария');
                    return;
                }

                const commentId = btn.getAttribute('data-comment-id');
                try {
                    await fetch(`/${modalUsername}/api/teams/${TEAM_ID}/tasks/${window._lastOpenedTask.id}/comments/${commentId}`, {
                        method: 'DELETE',
                        headers: window.getHeaders()
                    });
                    await loadModalComments();
                    if (window.toast) {
                        window.toast.commentDeleted();
                    }
                } catch (error) {
                    if (window.toast) {
                        window.toast.serverError();
                    }
                }
            };
        });

        // Обработчики кликов по авторам
        list.querySelectorAll('.comment-author').forEach(link => {
            link.onclick = function (e) {
                e.preventDefault();
                const username = this.dataset.username;
                // Можно добавить открытие профиля пользователя
                console.log('Клик по пользователю:', username);
            };
        });
    }

    // Обновление счетчика комментариев
    function updateCommentsCount(count) {
        // Определяем, какая модалка открыта и используем соответствующие элементы
        const isViewTaskModal = document.getElementById('view-task-modal').classList.contains('show');
        const countId = isViewTaskModal ? 'view-task-comments-count' : 'comments-count';
        const countElement = document.getElementById(countId);
        if (countElement) {
            countElement.textContent = count;
        }
    }

    // Показать индикатор новых комментариев
    function showNewCommentsIndicator(newCount) {
        // Определяем, какая модалка открыта и используем соответствующие элементы
        const isViewTaskModal = document.getElementById('view-task-modal').classList.contains('show');
        const indicatorId = isViewTaskModal ? 'view-task-new-comments-indicator' : 'new-comments-indicator';
        const textId = isViewTaskModal ? 'view-task-new-comments-text' : 'new-comments-text';

        const indicator = document.getElementById(indicatorId);
        const text = document.getElementById(textId);
        if (indicator && text) {
            text.textContent = `${newCount} новых комментариев`;
            indicator.classList.add('show');
            indicator.onclick = function () {
                scrollToBottom();
                hideNewCommentsIndicator();
            };
        }
    }

    // Скрыть индикатор новых комментариев
    function hideNewCommentsIndicator() {
        // Определяем, какая модалка открыта и используем соответствующие элементы
        const isViewTaskModal = document.getElementById('view-task-modal').classList.contains('show');
        const indicatorId = isViewTaskModal ? 'view-task-new-comments-indicator' : 'new-comments-indicator';

        const indicator = document.getElementById(indicatorId);
        if (indicator) {
            indicator.classList.remove('show');
        }
    }

    // Проверка прокрутки пользователя
    function isUserScrolledUp() {
        // Определяем, какая модалка открыта и используем соответствующие элементы
        const isViewTaskModal = document.getElementById('view-task-modal').classList.contains('show');
        const containerId = isViewTaskModal ? 'view-task-comments-container' : 'comments-container';
        const container = document.getElementById(containerId);
        if (!container) return false;

        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;

        // Считаем что пользователь внизу если до конца осталось меньше 50px
        return scrollTop < scrollHeight - clientHeight - 50;
    }

    // Показать/скрыть индикатор комментариев выше
    function updateCommentsAboveIndicator() {
        // Определяем, какая модалка открыта и используем соответствующие элементы
        const isViewTaskModal = document.getElementById('view-task-modal').classList.contains('show');
        const containerId = isViewTaskModal ? 'view-task-comments-container' : 'comments-container';
        const indicatorId = isViewTaskModal ? 'view-task-comments-above-indicator' : 'comments-above-indicator';

        const container = document.getElementById(containerId);
        const indicator = document.getElementById(indicatorId);

        if (!container || !indicator) return;

        const scrollTop = container.scrollTop;
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;

        // Показываем кнопку если есть прокрутка И пользователь прокрутил вниз
        const hasScroll = scrollHeight > clientHeight;
        const shouldShow = hasScroll && scrollTop > 10;

        if (shouldShow) {
            indicator.classList.add('show');
            indicator.style.display = 'flex';
            indicator.onclick = function () {
                container.scrollTo({ top: 0, behavior: 'smooth' });
                setTimeout(() => {
                    updateCommentsAboveIndicator(); // Обновляем состояние после прокрутки
                }, 300);
            };
        } else {
            indicator.classList.remove('show');
            indicator.style.display = 'none';
        }
    }

    // Прокрутка к низу
    function scrollToBottom() {
        // Определяем, какая модалка открыта и используем соответствующие элементы
        const isViewTaskModal = document.getElementById('view-task-modal').classList.contains('show');
        const containerId = isViewTaskModal ? 'view-task-comments-container' : 'comments-container';

        const container = document.getElementById(containerId);
        if (container) {
            container.scrollTop = container.scrollHeight;
            hasScrolledUp = false;
            hideNewCommentsIndicator();
            updateCommentsAboveIndicator();
        }
    }

    // Проверка онлайн статуса пользователя (заглушка)
    function isUserOnline(username) {
        // Здесь можно добавить реальную проверку онлайн статуса
        return Math.random() > 0.5; // Временная заглушка
    }

    // Автообновление комментариев
    function startAutoRefresh() {
        if (autoRefreshInterval) return;

        autoRefreshInterval = setInterval(() => {
            if (isCommentsVisible && window._lastOpenedTask) {
                loadModalComments(true);
            }
        }, 15000); // Обновляем каждые 15 секунд
    }

    function stopAutoRefresh() {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    }

    function highlightMentions(text, mentions) {
        if (!mentions || !Array.isArray(mentions) || mentions.length === 0) return text;
        let res = text;
        mentions.forEach(m => {
            res = res.replace(new RegExp(`@${m}`, 'g'), `<span class='mention'>@${m}</span>`);
        });
        return res;
    }

    // Авто-рост textarea для комментариев
    function initAutoResizeTextarea() {
        // Инициализируем для обеих модалок
        const commentInputs = [
            document.getElementById('modal-comment-input'),
            document.getElementById('view-task-comment-input')
        ];

        commentInputs.forEach(commentInput => {
            if (commentInput) {
                // Функция авто-изменения высоты
                function autoResize() {
                    commentInput.style.height = 'auto';
                    commentInput.style.height = Math.min(commentInput.scrollHeight, 120) + 'px';
                }

                // Привязываем к событиям
                commentInput.addEventListener('input', autoResize);
                commentInput.addEventListener('focus', autoResize);

                // Инициализируем высоту
                autoResize();
            }
        });
    }

    // Автодополнение по @
    function initMentionAutocomplete() {
        // Инициализируем для обеих модалок
        const commentInputs = [
            { input: document.getElementById('modal-comment-input'), box: document.getElementById('modal-mention-autocomplete') },
            { input: document.getElementById('view-task-comment-input'), box: document.getElementById('view-task-mention-autocomplete') }
        ];

        commentInputs.forEach(({ input: commentInput, box: mentionBox }) => {
            if (!commentInput || !mentionBox) return;

            let mentionActive = false;
            let mentionStart = -1;

            commentInput.addEventListener('input', function (e) {
                const val = commentInput.value;
                const pos = commentInput.selectionStart;
                const atIdx = val.lastIndexOf('@', pos - 1);
                if (atIdx !== -1 && (atIdx === 0 || /[\s.,;:!?()\[\]{}]/.test(val[atIdx - 1] || ''))) {
                    const query = val.slice(atIdx + 1, pos).toLowerCase();
                    // Сначала точные совпадения, потом частичные, ограничиваем до 3 человек
                    const exactMatches = MEMBERS.filter(m => m.username.toLowerCase() === query);
                    const startsWithMatches = MEMBERS.filter(m => m.username.toLowerCase().startsWith(query) && m.username.toLowerCase() !== query);
                    const containsMatches = MEMBERS.filter(m => m.username.toLowerCase().includes(query) && !m.username.toLowerCase().startsWith(query));
                    const filtered = [...exactMatches, ...startsWithMatches, ...containsMatches].slice(0, 3);
                    // Если запрос пустой, показываем первых 3 пользователей
                    const finalFiltered = query.length === 0 ? MEMBERS.slice(0, 3) : filtered;
                    if (finalFiltered.length > 0) {
                        mentionBox.innerHTML = finalFiltered.map(m => `
                <div class='mention-item' data-username='${m.username}'>
                  <div class="mention-avatar">
                    ${m.avatar_url ? `<img src="${m.avatar_url}" alt="${m.username}" />` : `<span class="avatar-initial">${(m.username || '?')[0].toUpperCase()}</span>`}
                  </div>
                  <span class="mention-username">@${m.username}</span>
                </div>
              `).join('');
                        mentionBox.style.display = 'block';
                        mentionActive = true;
                        mentionStart = atIdx;
                        Array.from(mentionBox.children).forEach(item => {
                            item.onclick = function () {
                                const before = val.slice(0, mentionStart);
                                const after = val.slice(pos);
                                commentInput.value = before + '@' + item.dataset.username + ' ' + after;
                                mentionBox.style.display = 'none';
                                commentInput.focus();
                                mentionActive = false;
                            };
                        });
                        return;
                    }
                }
                mentionBox.style.display = 'none';
                mentionActive = false;
            });
            commentInput.addEventListener('blur', function () {
                setTimeout(() => mentionBox.style.display = 'none', 120);
            });
        });
    }

    // Отправка комментария
    function initCommentForm() {
        // Инициализируем для обеих модалок
        const commentForms = [
            { form: document.getElementById('modal-comment-form'), input: document.getElementById('modal-comment-input') },
            { form: document.getElementById('view-task-comment-form'), input: document.getElementById('view-task-comment-input') }
        ];

        commentForms.forEach(({ form: commentForm, input: commentInput }) => {
            if (!commentForm || !commentInput) return;

            commentForm.onsubmit = async function (e) {
                e.preventDefault();

                // Инициализируем modalUsername если еще не инициализирован
                if (!modalUsername) {
                    initModalUsername();
                }

                if (!modalUsername) {
                    console.error('[comments] Не удалось получить modalUsername для отправки комментария');
                    return;
                }

                const sendBtn = commentForm.querySelector('button[type="submit"]');
                if (sendBtn) {
                    sendBtn.disabled = true;
                    sendBtn.classList.add('sending');
                }
                const text = commentInput.value.trim();
                if (!text) {
                    if (sendBtn) {
                        sendBtn.disabled = false;
                        sendBtn.classList.remove('sending');
                    }
                    return;
                }
                const mentionMatches = Array.from(text.matchAll(/@([a-zA-Z0-9_]+)/g)).map(m => m[1]);
                try {
                    await fetch(`/${modalUsername}/api/teams/${TEAM_ID}/tasks/${window._lastOpenedTask.id}/comments`, {
                        method: 'POST',
                        headers: window.getHeaders(),
                        body: JSON.stringify({ text, mentions: mentionMatches })
                    });
                    commentInput.value = '';

                    // Показываем toast уведомление
                    if (window.toast) {
                        window.toast.commentSent();
                    }

                    // Загружаем комментарии и прокручиваем вниз
                    await loadModalComments();
                    setTimeout(() => scrollToBottom(), 100);
                } catch (error) {
                    if (window.toast) {
                        window.toast.serverError();
                    }
                } finally {
                    if (sendBtn) {
                        sendBtn.disabled = false;
                        sendBtn.classList.remove('sending');
                    }
                }
            };
        });
    }

    // Обработчик кнопки обновления
    function initRefreshButton() {
        // Инициализируем для обеих модалок
        const refreshBtns = [
            document.getElementById('refresh-comments-btn'),
            document.getElementById('view-task-refresh-comments-btn')
        ];

        refreshBtns.forEach(refreshBtn => {
            if (refreshBtn) {
                refreshBtn.onclick = async function () {
                    this.classList.add('loading');
                    try {
                        await loadModalComments(true);
                    } finally {
                        this.classList.remove('loading');
                    }
                };
            }
        });
    }

    // Обработчик прокрутки (убираем дублирование)
    let scrollListenerAdded = false;

    // Инициализация при открытии модалки
    const originalOpenViewTaskModal = window.openViewTaskModal;
    window.openViewTaskModal = function (task) {
        if (originalOpenViewTaskModal) {
            originalOpenViewTaskModal(task);
        }

        // Инициализируем modalUsername
        initModalUsername();

        // Инициализируем комментарии
        isCommentsVisible = true;
        hasScrolledUp = false;
        lastCommentsCount = 0;

        // Показываем элементы комментариев
        setTimeout(() => {
            // Инициализация комментариев
            const commentsContainer = document.getElementById('modal-comments-section');

            // Добавляем обработчик прокрутки для индикаторов
            const realScrollContainer = document.getElementById('comments-container');
            if (realScrollContainer && !scrollListenerAdded) {
                realScrollContainer.addEventListener('scroll', function () {
                    updateCommentsAboveIndicator();
                });
                scrollListenerAdded = true;
            }

            // Загружаем комментарии
            loadModalComments();
            startAutoRefresh();

            // Обновляем индикатор через небольшую задержку
            setTimeout(() => {
                updateCommentsAboveIndicator();
                // Автоматически прокручиваем вниз при открытии
                const container = document.getElementById('comments-container');
                if (container && container.scrollHeight > container.clientHeight) {
                    container.scrollTop = container.scrollHeight;
                }
            }, 200);
        }, 100);
    };

    // Очистка при закрытии модалки
    const originalCloseViewTaskModal = window.closeViewTaskModal;
    window.closeViewTaskModal = function () {
        isCommentsVisible = false;
        stopAutoRefresh();
        hideNewCommentsIndicator();

        // Очищаем поле ввода комментария при закрытии модалки
        const commentInput = document.getElementById('modal-comment-input');
        if (commentInput) {
            commentInput.value = '';
            commentInput.style.height = 'auto';
        }

        // Очищаем список комментариев
        const commentsList = document.getElementById('modal-comments-list');
        if (commentsList) {
            commentsList.innerHTML = '';
        }

        // Сбрасываем счетчики
        lastCommentsCount = 0;
        hasScrolledUp = false;

        if (originalCloseViewTaskModal) {
            originalCloseViewTaskModal();
        }
    };

    // Инициализация всех функций комментариев
    document.addEventListener('DOMContentLoaded', function () {
        initModalUsername(); // Инициализируем modalUsername
        initAutoResizeTextarea();
        initMentionAutocomplete();
        initCommentForm();
        initRefreshButton();
    });

})();

// Инициализация всех обработчиков
document.addEventListener('DOMContentLoaded', function () {
    initUserDropdown();
    initLogout();
    initTeamsModal();
    initChangePassword();
    initAboutModal();
    // Инициализация профиля происходит в profile.js

    // Инициализация аватарки происходит в profile.js

    // Обработчик кнопки редактирования задачи в модалке просмотра
    const viewTaskEditBtn = document.getElementById('view-task-edit-btn');
    if (viewTaskEditBtn) {
        viewTaskEditBtn.onclick = function () {
            if (window._lastOpenedTask) {
                openTaskModal({ edit: true, ...window._lastOpenedTask });
                closeViewTaskModal();
            }
        };
    }
});

// ===================== Modal: View Task =====================
function openViewTaskModal(task) {
    window._lastOpenedTask = task;
    try {
        const modal = document.getElementById("view-task-modal");
        const title = document.getElementById("view-task-title");
        const content = document.getElementById("view-task-content");
        if (title) {
            title.textContent = task.text;
        }
        // Краткий просмотр с сохранением переносов строк
        let descriptionPreview = task.description || "Описание отсутствует";
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = descriptionPreview;
        let textPreview = tempDiv.textContent || tempDiv.innerText || "";
        let needShowFull = textPreview.length > 200 || /\n/.test(textPreview);
        if (textPreview.length > 200)
            textPreview = textPreview.substring(0, 200) + "...";
        // Генерируем HTML блока вложений
        let attachmentsHtml = createAttachmentsBlock(descriptionPreview);
        let assigneeHtml = "";
        if (task.assignee_id) {
            let member = null;
            if (Array.isArray(MEMBERS)) {
                member = MEMBERS.find(
                    (m) => m.username == task.assignee_id || m.id == task.assignee_id
                );
            }
            if (member) {
                assigneeHtml = `<div class="view-task-field">
            <span class="material-icons">person</span>
            <span><strong>Исполнитель:</strong> ${escapeHTML(
                    member.username
                )}</span>
          </div>`;
            } else {
                assigneeHtml = `<div class="view-task-field">
            <span class="material-icons">person</span>
            <span><strong>Исполнитель:</strong> ${escapeHTML(
                    task.assignee_id
                )}</span>
          </div>`;
            }
        } else if (task.assignee_name && task.assignee_name !== "null") {
            assigneeHtml = `<div class="view-task-field">
          <span class="material-icons">person</span>
          <span><strong>Исполнитель:</strong> ${escapeHTML(
                task.assignee_name
            )}</span>
        </div>`;
        }
        // Вставляем описание и вложения как отдельные блоки
        content.innerHTML = `
        <div class="view-task-section">
          <div class="view-task-field">
            <span class="material-icons">flag</span>
            <span><strong>Статус:</strong> ${getStatusTitle(
            task.status
        )}</span>
          </div>
          ${task.due_date
                ? `<div class="view-task-field"><span class="material-icons">event</span><span><strong>Срок:</strong> ${formatRuDate(
                    task.due_date
                )}</span></div>`
                : ""
            }
          ${task.tags && task.tags.length > 0
                ? `<div class="view-task-field"><span class="material-icons">label</span><span><strong>Теги:</strong> ${task.tags
                    .map(
                        (tag) =>
                            `<span class="task-tag tag-${tag.toLowerCase()}">${escapeHTML(
                                tag
                            )}</span>`
                    )
                    .join(" ")}</span></div>`
                : ""
            }
          ${assigneeHtml}
          <div class="view-task-field"><span class="material-icons">description</span><span><strong>Описание:</strong></span></div>
          <div class="view-task-description-preview" style="white-space:pre-line;word-break:break-word;">${textPreview}</div>
          ${attachmentsHtml}
          ${needShowFull
                ? `<div class='view-task-more'><button class='view-full-task-btn plus-btn' data-task-id='${task.id}'><span class='material-icons'>open_in_new</span>Открыть полностью</button></div>`
                : ""
            }
          <div class="view-task-field"><span class="material-icons">person</span><span><strong>Обновлено:</strong> ${task.updated_by_name || "Неизвестно"
            }</span></div>
          <div class="view-task-field"><span class="material-icons">schedule</span><span><strong>Дата:</strong> ${formatDateTime(
                task.updated_at
            )}</span></div>
        </div>
      `;
        // Назначаю обработчик только внутри content
        const viewFullBtn = content.querySelector('.view-full-task-btn');
        if (viewFullBtn) {
            viewFullBtn.onclick = function (e) {
                e.stopPropagation();
                openFullTaskView(task.id);
            };
        }
        // ЯВНО ДОБАВЛЯЮ обработчик для кнопки 'Редактировать' после вставки контента
        const viewTaskEditBtn = document.getElementById('view-task-edit-btn');
        if (viewTaskEditBtn) {
            viewTaskEditBtn.onclick = function () {
                openTaskModal({ edit: true, ...task });
                closeViewTaskModal();
            };
        }
        if (modal) {
            modal.classList.add("show");
            if (typeof loadModalComments === 'function') loadModalComments();
            // Инициализируем обработчики для блока вложений
            setTimeout(() => {
                bindAttachmentsHandlers();
            }, 100);
            // Инициализируем обработчики прокрутки для комментариев в view-task-modal
            setTimeout(() => {
                const commentsContainer = document.getElementById('view-task-comments-container');
                if (commentsContainer) {
                    commentsContainer.addEventListener('scroll', function () {
                        updateCommentsAboveIndicator();
                    });
                }
            }, 200);
        }
    } catch (e) {
        // Ошибка в openViewTaskModal
    }
}

function bindViewFullTaskBtn() {
    // Функция для назначения обработчиков кнопки "Открыть полностью"
    // Пока что оставляем пустой, так как обработчик уже назначен выше
}

function openFullTaskView(taskId) {
    if (typeof smoothNavigate === 'function') {
        smoothNavigate(`/${USERNAME}/team_task/${taskId}`);
    } else {
        disconnectAllSockets();
        window.location.href = `/${USERNAME}/team_task/${taskId}`;
    }
}

function closeViewTaskModal() {
    const modal = document.getElementById("view-task-modal");
    if (modal) modal.classList.remove("show");

    // Очищаем комментарии при закрытии модалки
    const commentsList = document.getElementById('view-task-comments-list');
    if (commentsList) {
        commentsList.innerHTML = '';
    }

    // Очищаем поле ввода комментария
    const commentInput = document.getElementById('view-task-comment-input');
    if (commentInput) {
        commentInput.value = '';
        commentInput.style.height = 'auto';
    }

    // Сбрасываем счетчики
    const commentsCount = document.getElementById('view-task-comments-count');
    if (commentsCount) {
        commentsCount.textContent = '0';
    }
}

function closeCommentsModal() {
    const modal = document.getElementById("comments-modal");
    if (modal) modal.classList.remove("show");
}

// ===================== Event Handlers =====================
function bindAllHandlers() {
    // Проверяем и инициализируем USERNAME если нужно
    if (!USERNAME) {
        initUsername();
        if (!USERNAME) {
            console.error('[team_board] USERNAME не определен для bindAllHandlers!');
            return;
        }
    }

    // Кнопки добавить задачу
    document.querySelectorAll(".kanban-add-task-btn").forEach((btn) => {
        btn.onclick = function () {
            openTaskModal({ status: btn.getAttribute("data-status-code") });
        };
    });
    // Кнопки удалить статус
    document
        .querySelectorAll(".kanban-delete-status-btn")
        .forEach((btn) => {
            btn.onclick = async function () {
                if (!confirm("Удалить статус?")) return;
                let code = btn.getAttribute("data-status-code");
                let resp = await fetch(
                    `/${USERNAME}/api/teams/${TEAM_ID}/statuses/${code}`,
                    {
                        method: "DELETE",
                        headers: window.getHeaders(),
                    }
                );
                if (resp.ok) {
                    // Сообщаем через сокет
                    if (socket)
                        socket.emit("team_status_deleted", {
                            team_id: TEAM_ID,
                            code,
                        });
                    fetchTeamBoard();
                }
            };
        });
    // Кнопка добавить статус
    const addStatusBtn = document.getElementById("open-status-modal");
    if (addStatusBtn) addStatusBtn.onclick = openStatusModal;
    // Кнопки редактировать задачу
    document.querySelectorAll(".edit-btn").forEach((btn) => {
        btn.onclick = function () {
            let id = btn.getAttribute("data-task-id");
            let task = TASKS.find((t) => t.id == id);
            if (task) openTaskModal({ edit: true, ...task });
        };
    });
    // Кнопки удалить задачу
    document.querySelectorAll(".delete-btn").forEach((btn) => {
        btn.onclick = async function () {
            if (!confirm("Удалить задачу?")) return;
            let id = btn.getAttribute("data-task-id");
            let task = TASKS.find((t) => t.id == id);
            let taskName = task ? task.text : "Задача";
            try {
                let resp = await fetch(
                    `/${USERNAME}/api/teams/${TEAM_ID}/tasks/${id}`,
                    {
                        method: "DELETE",
                        headers: window.getHeaders(),
                    }
                );
                if (resp.ok) {
                    // Локальное удаление
                    TASKS = TASKS.filter(t => t.id != id);
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
                    alert("Ошибка удаления задачи");
                }
            }
        };
    });
}

function updateDnD() {
    document.querySelectorAll(".kanban-tasks").forEach(function (col) {
        if (col._sortable) return;
        col._sortable = new Sortable(col, {
            group: "tasks",
            animation: 220,
            ghostClass: "drag-ghost",
            onEnd: async function (evt) {
                let orders = {};
                document
                    .querySelectorAll(".kanban-tasks")
                    .forEach(function (list) {
                        const status =
                            list.closest(".kanban-column").dataset.statusCode ||
                            list
                                .closest(".kanban-column")
                                .getAttribute("data-status-code");
                        orders[status] = Array.from(
                            list.querySelectorAll(".kanban-task")
                        ).map((x) => +x.dataset.taskId);
                    });
                let resp = await fetch(
                    `/${USERNAME}/api/teams/${TEAM_ID}/tasks/order`,
                    {
                        method: "POST",
                        headers: window.getHeaders(),
                        body: JSON.stringify({ orders }),
                    }
                );
                if (resp.ok) fetchTeamBoard();
            },
        });
    });
}

function bindAddStatusBtn() {
    const btn = document.getElementById("open-status-modal");
    if (btn) btn.onclick = openStatusModal;
}

// ===================== Topbar: название команды в Team-Nav =====================
function setTeamNameInTopbar(teamName) {
    const badge = document.querySelector(".team-name-badge");
    if (badge) badge.textContent = teamName;
}

// После получения данных о команде:
async function fetchTeamInfoAndSetName() {
    let r = await fetch(`/${USERNAME}/api/teams/${TEAM_ID}/info`);
    let data = await r.json();
    setTeamNameInTopbar(data.name);
}

// ===================== Функции для работы с аватарками =====================
function getAvatarColor(username) {
    const colors = [
        '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
        '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
        '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
}

function getInitials(username) {
    if (!username) return '?';
    const parts = username.split(' ');
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.substring(0, 2).toUpperCase();
}

// ===================== Team Functions =====================
// Вся логика команд перенесена в team-modal.js

// ===================== Инициализация всех обработчиков =====================
document.addEventListener("DOMContentLoaded", function () {
    // Функция для перетаскивания скролла
    function enableDragToScroll(selector) {
        const element = document.querySelector(selector);
        if (!element) return;

        let isDown = false;
        let startX;
        let scrollLeft;

        element.addEventListener("mousedown", (e) => {
            isDown = true;
            element.style.cursor = "grabbing";
            startX = e.pageX - element.offsetLeft;
            scrollLeft = element.scrollLeft;
        });

        element.addEventListener("mouseleave", () => {
            isDown = false;
            element.style.cursor = "grab";
        });

        element.addEventListener("mouseup", () => {
            isDown = false;
            element.style.cursor = "grab";
        });

        element.addEventListener("mousemove", (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - element.offsetLeft;
            const walk = (x - startX) * 2;
            element.scrollLeft = scrollLeft - walk;
        });
    }

    enableDragToScroll(".kanban-board");

    // Вызываем при старте страницы, если window.USER_AVATAR_URL определён
    if (window.USER_AVATAR_URL && window.updateTopbarAvatar) {
        window.updateTopbarAvatar(window.USER_AVATAR_URL);
    }

    // Обработчики закрытия модалок
    document.getElementById('close-view-task-modal-btn')?.addEventListener('click', closeViewTaskModal);

    // Вызываем при старте страницы, если window.USER_AVATAR_URL определён
    if (window.USER_AVATAR_URL && window.updateTopbarAvatar) {
        window.updateTopbarAvatar(window.USER_AVATAR_URL);
    }

    // Вызываем при загрузке страницы и после смены команды
    fetchTeamInfoAndSetName();
});

// Обработчики событий страницы для отключения сокетов
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

// Экспортируем функции для использования в HTML
window.openViewTaskModal = openViewTaskModal;
window.closeViewTaskModal = closeViewTaskModal;
window.closeCommentsModal = closeCommentsModal;
window.bindAllHandlers = bindAllHandlers;
window.updateDnD = updateDnD;
window.bindAddStatusBtn = bindAddStatusBtn;
window.setTeamNameInTopbar = setTeamNameInTopbar;
window.fetchTeamInfoAndSetName = fetchTeamInfoAndSetName;
window.getAvatarColor = getAvatarColor;
window.getInitials = getInitials;
window.fetchTeamInfo = fetchTeamInfo;
// window.renderEditTeamMembers = renderEditTeamMembers; // удалено
// window.makeLeader = makeLeader; // удалено
// window.removeMember = removeMember; // удалено
// Экспорты функций команд перенесены в team-modal.js
// ... существующий код ...

// Дублирующаяся функция fetchTeamBoard удалена

// Дублирующаяся функция renderBoard удалена

function bindTaskViewHandlers() {
    document.querySelectorAll(".kanban-task").forEach((div) => {
        div.onclick = function (e) {
            if (e.target.closest('.edit-btn,.delete-btn')) return;
            const id = div.dataset.taskId;
            const task = TASKS.find((t) => String(t.id) === String(id));
            if (!task) return;
            openViewTaskModal(task);
        };
    });
}

function createTaskCard(task) {
    try {
        if (!task || !task.id) return document.createElement("div");
        const div = document.createElement("div");
        div.className = "kanban-task";
        div.dataset.taskId = task.id;
        let tagsHtml = "";
        if (task.tags && task.tags.length) tagsHtml = renderTags(task.tags);
        let dateHtml = task.due_date ? `<span class='task-date-badge'>${formatRuDate(task.due_date)}</span>` : "";
        let assignee = null;
        if (task.assignee_id && Array.isArray(MEMBERS)) {
            assignee = MEMBERS.find((m) => m.username == task.assignee_id || m.id == task.assignee_id);
        }
        let avatarHtml = "";
        if (assignee) {
            if (assignee.avatar_url) {
                avatarHtml = `<img src="${assignee.avatar_url}" alt="${escapeHTML(assignee.username)}" class="task-avatar-img" />`;
            } else {
                avatarHtml = `<span class='task-avatar' style="background-color: ${getAvatarColor(assignee.username)}">${getInitials(assignee.username)}</span>`;
            }
        }
        let assigneeNameHtml = assignee
            ? `<span class='assignee-name'>${escapeHTML(assignee.username)}</span>`
            : task.assignee_id
                ? `<span class='assignee-name'>${escapeHTML(task.assignee_id)}</span>`
                : "<span style='color:#b9bccc'>Не назначено</span>";
        let descPreview = "";
        if (task.description) {
            try {
                descPreview = stripTags(task.description);
                descPreview = truncate(descPreview, 120);
            } catch (e) {
                descPreview = "";
            }
        }
        div.innerHTML = `
      <div class="task-header">
        <div class="task-title">${escapeHTML(truncate(task.text || "", 80))}</div>
        <div class="task-badges">${dateHtml}</div>
      </div>
      ${tagsHtml}
      ${descPreview ? `<div class="task-desc">${escapeHTML(descPreview)}</div>` : ""}
      <div class="task-meta">
        ${avatarHtml}
        ${assigneeNameHtml}
      </div>
      <div class="task-actions">
        <button class="icon-btn edit-btn" data-task-id="${task.id}"><span class="material-icons">edit</span></button>
        <button class="icon-btn delete-btn" data-task-id="${task.id}"><span class="material-icons">delete</span></button>
      </div>
    `;
        return div;
    } catch (error) {
        const errorDiv = document.createElement("div");
        errorDiv.className = "kanban-task error-task";
        errorDiv.innerHTML = `
      <div class="task-header">
        <div class="task-title" style="color: #ff5470;">Ошибка загрузки задачи</div>
      </div>
      <div class="task-desc" style="color: #b9bccc; font-size: 0.9em;">
        Не удалось отобразить задачу (ID: ${task?.id || 'неизвестен'})
      </div>
    `;
        return errorDiv;
    }
}

// ===================== Вспомогательные функции =====================
function escapeHTML(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function stripTags(html) {
    if (!html) return "";
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || "";
}
function truncate(str, len) {
    if (!str) return "";
    return str.length > len ? str.slice(0, len) + "…" : str;
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
function getTaskTitle(taskId) {
    const task = TASKS.find(t => t.id === taskId);
    return task ? task.title : 'Задача';
}
// ===================== ФУНКЦИИ ДЛЯ РАБОТЫ С ВЛОЖЕНИЯМИ =====================
function createAttachmentsBlock(description) {
    const images = extractImagesFromDescription(description);
    if (images.length === 0) return "";
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
        const fileName = getImageFileName(image.src);
        attachmentsHtml += `
          <div class="attachment-item" onclick="openImageModal('${escapeHTML(image.src)}', '${escapeHTML(fileName)}')">
            <div class="attachment-preview">
              <img src="${escapeHTML(image.src)}" alt="${escapeHTML(image.alt || fileName)}" loading="lazy">
            </div>
            <div class="attachment-info">
              <div class="attachment-name">${escapeHTML(fileName)}</div>
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
function extractImagesFromDescription(description) {
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
    return images;
}
function getImageFileName(url) {
    try {
        if (url.startsWith('data:image/')) {
            const mimeType = url.split(';')[0].split(':')[1];
            const extension = mimeType.split('/')[1];
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            return `Изображение_${timestamp}.${extension}`;
        }
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        let fileName = pathname.split('/').pop();
        if (!fileName || fileName.length < 3 || /^[a-zA-Z0-9+/=]+$/.test(fileName)) {
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            const extension = getFileExtensionFromUrl(url) || 'jpg';
            fileName = `Изображение_${timestamp}.${extension}`;
        }
        try {
            fileName = decodeURIComponent(fileName);
        } catch (e) { }
        return fileName;
    } catch (e) {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        return `Изображение_${timestamp}.jpg`;
    }
}
function getFileExtensionFromUrl(url) {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const match = pathname.match(/\.([a-z0-9]+)$/i);
        return match ? match[1].toLowerCase() : null;
    } catch (e) {
        return null;
    }
}
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
function openImageModal(src, fileName) {
    const modal = document.getElementById('image-modal');
    const img = document.getElementById('image-modal-img');
    const title = document.getElementById('image-modal-title');
    if (modal && img && title) {
        let correctedSrc = src;
        if (!src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('/static/uploads/') && !src.startsWith('/uploads/')) {
            if (src.startsWith('uploads/')) {
                correctedSrc = '/static/' + src;
            } else {
                correctedSrc = '/static/uploads/' + src;
            }
        }
        if (src.startsWith('/uploads/')) {
            correctedSrc = src.replace('/uploads/', '/static/uploads/');
        }
        img.src = correctedSrc;
        img.alt = fileName;
        title.textContent = fileName;
        modal.classList.add('show');
        window.currentImageData = { src: correctedSrc, fileName };
        modal.onclick = function (e) {
            if (e.target === modal) {
                closeImageModal();
            }
        };
        document.addEventListener('keydown', handleImageModalKeydown);
    }
}
function closeImageModal() {
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.classList.remove('show');
        window.currentImageData = null;
        document.removeEventListener('keydown', handleImageModalKeydown);
    }
}
function handleImageModalKeydown(e) {
    if (e.key === 'Escape') {
        closeImageModal();
    }
}
function downloadImage() {
    if (!window.currentImageData) return;
    const { src, fileName } = window.currentImageData;
    const link = document.createElement('a');
    link.href = src;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
function bindAttachmentsHandlers() {
    document.querySelectorAll('.attachments-block').forEach(block => {
        const header = block.querySelector('.attachments-header');
        if (header && !header.dataset.bound) {
            header.dataset.bound = 'true';
        }
    });
}
// ===================== Уведомления =====================
// Переменные уже объявлены выше
function initNotificationsSocket() {
    if (typeof io !== 'undefined') {
        const socket = io();
        const username = document.body ? document.body.getAttribute('data-username') : null;
        if (!username) {
            console.error('[notifications] username не определен для Socket.IO!');
            return;
        }
        socket.emit('join_user', { username: username });
        socket.on('notification_count', (data) => {
            updateNotificationBadge(data.count);
        });
        socket.on('notifications_updated', () => {
            loadNotifications();
        });
        socket.on('task_assigned', (data) => {
            if (window.toast) {
                window.toast.taskAssigned(data.taskTitle, data.assigneeName);
            }
            loadNotifications();
        });
        socket.on('user_mentioned', (data) => {
            if (window.toast) {
                window.toast.mentionReceived(data.authorName, data.taskTitle);
            }
            loadNotifications();
        });
        socket.on('new_comment', (data) => {
            if (window.toast) {
                window.toast.newComment(data.authorName, data.taskTitle);
            }
        });
    }
}
async function loadNotifications() {
    try {
        let username;
        if (typeof window.getUsername === 'function') {
            username = window.getUsername();
        } else if (document.body) {
            username = USERNAME || document.body.getAttribute('data-username');
        } else {
            username = USERNAME;
        }

        if (!username) {
            console.error('[notifications] username не определен!');
            return;
        }
        const response = await fetch(`/${username}/api/notifications`, {
            headers: window.getHeaders()
        });
        if (response.ok) {
            const data = await response.json();
            notificationsData = data.notifications || [];
            unreadCount = data.unread_count || 0;
            updateNotificationBadge(unreadCount);
            renderNotifications();
        }
    } catch (error) { }
}
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
        const highlightUsername = (text, username) => {
            if (!username) return text;
            const regex = new RegExp(`\\b${escapeRegex(username)}\\b`, 'gi');
            return text.replace(regex, `<span class="notif-username">${username}</span>`);
        };
        const titleWithHighlight = highlightUsername(escapeHTML(notification.title), notification.from_username);
        const messageWithHighlight = highlightUsername(escapeHTML(notification.message), notification.from_username);
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
            ${titleWithHighlight}
          </div>
          <div class="notification-message">${messageWithHighlight}</div>
          <div class="notification-time">${timeAgo}</div>
        </div>
        ${!notification.is_read ? '<div class="notification-unread-dot"></div>' : ''}
      </div>
    `;
    }).join('');
    list.querySelectorAll('.notification-item').forEach(item => {
        item.onclick = async function () {
            const id = parseInt(item.dataset.id);
            const link = item.dataset.link;
            if (item.classList.contains('unread')) {
                await markNotificationAsRead([id]);
                item.classList.remove('unread');
                item.querySelector('.notification-unread-dot')?.remove();
            }
            if (link) {
                window.location.href = link;
            }
        };
    });
}
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
function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}
async function markNotificationAsRead(notificationIds) {
    try {
        const username = USERNAME || (document.body ? document.body.getAttribute('data-username') : null);
        if (!username) {
            console.error('[notifications] username не определен!');
            return;
        }
        const response = await fetch(`/${username}/api/notifications/mark_read`, {
            method: 'POST',
            headers: window.getHeaders(),
            body: JSON.stringify({ notification_ids: notificationIds })
        });
        if (response.ok) {
            unreadCount = Math.max(0, unreadCount - notificationIds.length);
            updateNotificationBadge(unreadCount);
        }
    } catch (error) { }
}
async function markAllNotificationsAsRead() {
    try {
        const username = USERNAME || (document.body ? document.body.getAttribute('data-username') : null);
        if (!username) {
            console.error('[notifications] username не определен!');
            return;
        }
        const response = await fetch(`/${username}/api/notifications/mark_read`, {
            method: 'POST',
            headers: window.getHeaders(),
            body: JSON.stringify({ mark_all: true })
        });
        if (response.ok) {
            notificationsData.forEach(n => n.is_read = true);
            unreadCount = 0;
            updateNotificationBadge(0);
            renderNotifications();
        }
    } catch (error) { }
}
function initNotifications() {
    const notificationsBtn = document.getElementById('notifications-btn');
    const notificationsDropdown = document.getElementById('notifications-dropdown');
    const markAllBtn = document.getElementById('mark-all-read-btn');
    if (notificationsBtn && notificationsDropdown) {
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
        notificationsDropdown.onclick = function (e) {
            e.stopPropagation();
        };
        document.addEventListener('click', function () {
            notificationsDropdown.classList.remove('open');
        });
    }
    if (markAllBtn) {
        markAllBtn.onclick = function () {
            if (unreadCount > 0) {
                markAllNotificationsAsRead();
            }
        };
    }
    initNotificationsSocket();
    loadNotifications();
}
// ===================== Универсальные обработчики =====================
function bindModalCloseHandlers() {
    document.querySelectorAll(".modal-close").forEach((btn) => {
        btn.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            const modal = btn.closest(".modal");
            if (modal) modal.classList.remove("show");
        };
    });
}
function bindCancelButtons() {
    document.querySelectorAll('[onclick*="close"]').forEach((btn) => {
        const onclick = btn.getAttribute('onclick');
        if (onclick && onclick.includes('close')) {
            btn.onclick = function (e) {
                e.preventDefault();
                const modalName = onclick.match(/close(\w+)Modal/);
                if (modalName) {
                    const modal = document.getElementById(modalName[1].toLowerCase() + '-modal');
                    if (modal) modal.classList.remove('show');
                }
            };
        }
    });
}
// ===================== Экспортируем в window =====================
window.createAttachmentsBlock = createAttachmentsBlock;
window.extractImagesFromDescription = extractImagesFromDescription;
window.getImageFileName = getImageFileName;
window.getFileExtensionFromUrl = getFileExtensionFromUrl;
window.toggleAttachments = toggleAttachments;
window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;
window.handleImageModalKeydown = handleImageModalKeydown;
window.downloadImage = downloadImage;
window.bindAttachmentsHandlers = bindAttachmentsHandlers;
window.initNotificationsSocket = initNotificationsSocket;
window.loadNotifications = loadNotifications;
window.updateNotificationBadge = updateNotificationBadge;
window.renderNotifications = renderNotifications;
window.formatTimeAgo = formatTimeAgo;
window.escapeRegex = escapeRegex;
window.markNotificationAsRead = markNotificationAsRead;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
window.initNotifications = initNotifications;
window.escapeHTML = escapeHTML;
window.stripTags = stripTags;
window.truncate = truncate;
window.formatRuDate = formatRuDate;
window.formatDateTime = formatDateTime;
window.getStatusTitle = getStatusTitle;
window.getTaskTitle = getTaskTitle;
window.bindModalCloseHandlers = bindModalCloseHandlers;
window.bindCancelButtons = bindCancelButtons;
// ... existing code ... 

// ===================== Глобальные переменные из HTML =====================
window.USER_AVATAR_URL = window.USER_AVATAR_URL || null;
window.USERNAME = window.USERNAME || null;
window.STATUSES = window.STATUSES || [];
window.MEMBERS = window.MEMBERS || [];
window.TASKS = window.TASKS || [];

// ===================== CSRF =====================
// Функция getHeaders уже определена в HTML

// ===================== Render Tags =====================
function renderTags(tags) {
    if (!tags || !tags.length) return "";
    return (
        `<div class='task-tags'>` +
        tags
            .map(
                (tag) =>
                    `<span class='task-tag tag-${tag.toLowerCase()}'>${escapeHTML(tag)}</span>`
            )
            .join("") +
        `</div>`
    );
}
window.renderTags = renderTags;

// ===================== Profile Form =====================
const profileForm = document.getElementById('profile-form');
if (profileForm) {
    profileForm.onsubmit = async function (e) {
        e.preventDefault();
        // Реализуйте отправку профиля через fetch
        // ...
    };
}

// Дублирующийся обработчик editTeamForm удален
// Дублирующийся обработчик addMemberBtn удален
// Дублирующийся обработчик deleteTeamBtn удален
// Дублирующийся обработчик createTeamForm удален
// ===================== Auto-resize textarea =====================
function initTextareaAutoResize() {
    const modalCommentInput = document.getElementById('modal-comment-input');
    if (modalCommentInput) {
        modalCommentInput.removeEventListener('input', textareaAutoResize);
        modalCommentInput.addEventListener('input', textareaAutoResize);
        modalCommentInput.addEventListener('keydown', textareaAutoResize);
        modalCommentInput.style.height = 'auto';
        modalCommentInput.style.minHeight = '44px';
        modalCommentInput.style.maxHeight = '180px';
        modalCommentInput.style.resize = 'vertical';
    }
}
function textareaAutoResize() {
    this.style.height = 'auto';
    const newHeight = Math.min(Math.max(this.scrollHeight, 44), 180);
    this.style.height = newHeight + 'px';
}
document.addEventListener('DOMContentLoaded', initTextareaAutoResize);
window.initTextareaAutoResize = initTextareaAutoResize;
window.textareaAutoResize = textareaAutoResize;

// ===================== Инициализация обработчиков форм =====================

// Обработчик создания команды
const createTeamForm = document.getElementById("universal-create-team-form");
if (createTeamForm) {
    createTeamForm.onsubmit = async function (e) {
        e.preventDefault();

        // Проверяем и инициализируем USERNAME если нужно
        if (!USERNAME) {
            initUsername();
            if (!USERNAME) {
                console.error('[team_board] USERNAME не определен для создания команды!');
                return;
            }
        }

        let name = document.getElementById("team-name-input").value.trim();
        if (!name) return;
        let resp = await fetch(`/${USERNAME}/api/teams`, {
            method: "POST",
            headers: window.getHeaders(),
            body: JSON.stringify({ name }),
        });
        if (resp.ok) {
            let data = await resp.json();
            if (window.toast) {
                window.toast.teamCreated(name);
            }
            document.getElementById("universal-create-team-modal").classList.remove("show");
            document.getElementById("universal-create-team-form").reset();
            fetchTeams();
        } else {
            let data = await resp.json();
            document.getElementById("universal-create-team-error").innerText =
                data.error || "Ошибка создания команды!";
        }
    };
}

// Обработчик редактирования команды
const editTeamForm = document.getElementById("universal-edit-team-form");
if (editTeamForm) {
    editTeamForm.onsubmit = async function (e) {
        e.preventDefault();

        // Проверяем и инициализируем USERNAME если нужно
        if (!USERNAME) {
            initUsername();
            if (!USERNAME) {
                console.error('[team_board] USERNAME не определен для редактирования команды!');
                return;
            }
        }

        let name = document.getElementById("universal-edit-team-name").value.trim();
        let currentEditTeamId = null;
        const editTeamModal = document.getElementById("universal-edit-team-modal");
        if (editTeamModal && editTeamModal.dataset.teamId) {
            currentEditTeamId = editTeamModal.dataset.teamId;
        }
        if (!currentEditTeamId) return;

        let resp = await fetch(`/${USERNAME}/api/teams/${currentEditTeamId}/edit`, {
            method: "POST",
            headers: window.getHeaders(),
            body: JSON.stringify({ name }),
        });
        if (resp.ok) {
            if (window.toast) {
                window.toast.teamUpdated(name);
            }
            closeEditTeamModal();
            fetchTeams();
        } else {
            let data = await resp.json();
            document.getElementById("universal-edit-team-error").innerText =
                data.error || "Ошибка сохранения!";
        }
    };
}

// Обработчик добавления участника
const addMemberBtn = document.getElementById("universal-add-member-btn");
if (addMemberBtn) {
    addMemberBtn.onclick = async function () {
        // Проверяем и инициализируем USERNAME если нужно
        if (!USERNAME) {
            initUsername();
            if (!USERNAME) {
                console.error('[team_board] USERNAME не определен для добавления участника!');
                return;
            }
        }

        let username = document.getElementById("universal-add-member-input").value.trim();
        if (!username) return;
        let currentEditTeamId = null;
        const editTeamModal = document.getElementById("universal-edit-team-modal");
        if (editTeamModal && editTeamModal.dataset.teamId) {
            currentEditTeamId = editTeamModal.dataset.teamId;
        }
        if (!currentEditTeamId) return;

        let resp = await fetch(`/${USERNAME}/api/teams/${currentEditTeamId}/members`, {
            method: "POST",
            headers: window.getHeaders(),
            body: JSON.stringify({ username }),
        });
        if (resp.ok) {
            document.getElementById("universal-add-member-input").value = "";
            openEditTeamModal(currentEditTeamId);
            if (window.toast) {
                window.toast.memberAdded(username);
            }
            if (currentEditTeamId == TEAM_ID) {
                const membersResponse = await fetch(`/${USERNAME}/api/teams/${TEAM_ID}/members`, { headers: window.getHeaders() });
                const membersData = await membersResponse.json();
                MEMBERS = membersData.members || [];
            }
        } else {
            let data = await resp.json();
            document.getElementById("universal-edit-team-error").innerText =
                data.error || "Ошибка добавления!";
        }
    };
}

// Обработчик удаления команды
const deleteTeamBtn = document.getElementById("universal-delete-team-btn");
if (deleteTeamBtn) {
    deleteTeamBtn.onclick = async function () {
        if (!confirm("Удалить команду?")) return;

        // Проверяем и инициализируем USERNAME если нужно
        if (!USERNAME) {
            initUsername();
            if (!USERNAME) {
                console.error('[team_board] USERNAME не определен для удаления команды!');
                return;
            }
        }

        let currentEditTeamId = null;
        const editTeamModal = document.getElementById("universal-edit-team-modal");
        if (editTeamModal && editTeamModal.dataset.teamId) {
            currentEditTeamId = editTeamModal.dataset.teamId;
        }
        if (!currentEditTeamId) return;

        let resp = await fetch(`/${USERNAME}/api/teams/${currentEditTeamId}/delete`, {
            method: "POST",
            headers: window.getHeaders(),
        });
        if (resp.ok) {
            if (window.toast) {
                window.toast.teamDeleted();
            }
            closeEditTeamModal();
            fetchTeams();
        } else {
            let data = await resp.json();
            document.getElementById("universal-edit-team-error").innerText =
                data.error || "Ошибка удаления!";
        }
    };
}

// ===================== Глобальные переменные =====================
let notificationsData = [];
let unreadCount = 0; 