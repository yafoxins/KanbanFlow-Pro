// Topbar навигация
const body = document.body;
const USERNAME = body.dataset.username;
let CSRF_TOKEN = body.dataset.csrfToken;
function getHeaders(contentType = 'application/json') {
    const headers = {
        'X-CSRF-Token': (typeof CSRF_TOKEN !== 'undefined' ? CSRF_TOKEN : (document.body.dataset.csrfToken || ''))
    };
    if (contentType) headers['Content-Type'] = contentType;
    return headers;
}
const profileForm = document.getElementById('profile-form');

// Обработчики навигации с проверками
const kanbanBtn = document.getElementById("kanban-btn");
const todoBtn = document.getElementById("todo-btn");

if (kanbanBtn) {
    kanbanBtn.onclick = () => (location.href = `/${USERNAME}/kanban`);
}
if (todoBtn) {
    todoBtn.onclick = () => (location.href = `/${USERNAME}/todo`);
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

// ====== Новый UX для профиля ======
// Старая логика удалена - используется централизованный режим в конце файла

// Функция обновления аватарки в профиле
function updateProfileAvatar(avatarUrl) {
    const avatarImg = document.getElementById("profile-avatar-img");
    const avatarInitial = document.getElementById("profile-avatar-initial");
    const deleteBtn = document.getElementById("delete-avatar-btn");
    if (!avatarImg || !avatarInitial || !deleteBtn) return;
    if (avatarUrl) {
        avatarImg.src = avatarUrl;
        avatarImg.style.display = "block";
        avatarInitial.style.display = "none";
        deleteBtn.style.display = "inline-flex";
    } else {
        avatarImg.style.display = "none";
        avatarInitial.style.display = "block";
        deleteBtn.style.display = "none";
    }
}

// Обработчик загрузки аватарки
const avatarUpload = document.getElementById("avatar-upload");
if (avatarUpload) {
    avatarUpload.onchange = async function (e) {
        const file = e.target.files[0];
        if (!file) return;

        // Проверяем размер файла (максимум 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert("Файл слишком большой. Максимальный размер: 5MB");
            return;
        }

        const formData = new FormData();
        formData.append("avatar", file);

        try {
            const response = await fetch(`/${USERNAME}/api/upload_avatar`, {
                method: "POST",
                headers: {
                    'X-CSRF-Token': (typeof CSRF_TOKEN !== 'undefined' ? CSRF_TOKEN : (document.body.dataset.csrfToken || ''))
                },
                body: formData,
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Обновляем аватарку в профиле
                updateProfileAvatar(data.avatar_url);
                // Обновляем аватарку в topbar
                updateTopbarAvatar(data.avatar_url);
                alert("Аватарка успешно загружена!");
            } else {
                alert(data.error || "Ошибка загрузки аватарки");
            }
        } catch (error) {
            alert("Ошибка загрузки аватарки");
        }
    };
}

// Обработчик удаления аватарки
const deleteAvatarBtn = document.getElementById("delete-avatar-btn");
if (deleteAvatarBtn) {
    deleteAvatarBtn.onclick = async function () {
        if (!confirm("Удалить аватарку?")) return;

        try {
            const response = await fetch(`/${USERNAME}/api/delete_avatar`, {
                method: "POST",
                headers: getHeaders(),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Обновляем аватарку
                updateProfileAvatar(null);
                // Обновляем аватарку в topbar
                updateTopbarAvatar(null);
                alert("Аватарка удалена!");
            } else {
                alert(data.error || "Ошибка удаления аватарки");
            }
        } catch (error) {
            alert("Ошибка удаления аватарки");
        }
    };
}

// Функция обновления аватарки в topbar
function updateTopbarAvatar(avatarUrl) {
    const userMenuBtn = document.getElementById("user-menu-btn");
    if (userMenuBtn) {
        const avatarSpan = userMenuBtn.querySelector(".material-icons");
        if (avatarUrl) {
            // Создаем изображение аватарки
            avatarSpan.style.display = "none";
            let avatarImg = userMenuBtn.querySelector(".user-avatar-img");
            if (!avatarImg) {
                avatarImg = document.createElement("img");
                avatarImg.className = "user-avatar-img";
                avatarImg.style.cssText = "width: 24px; height: 24px; border-radius: 50%; object-fit: cover; margin-right: 8px;";
                userMenuBtn.insertBefore(avatarImg, avatarSpan);
            }
            avatarImg.src = avatarUrl;
            avatarImg.style.display = "block";
        } else {
            // Показываем иконку по умолчанию
            avatarSpan.style.display = "inline-block";
            const avatarImg = userMenuBtn.querySelector(".user-avatar-img");
            if (avatarImg) {
                avatarImg.style.display = "none";
            }
        }
    }
}

// Загружаем аватарку при загрузке страницы
async function loadUserAvatar() {
    try {
        const response = await fetch(`/api/avatar/${USERNAME}`, { headers: getHeaders() });
        const data = await response.json();
        if (data.avatar_url) {
            updateTopbarAvatar(data.avatar_url);
        }
    } catch (error) {
        alert("Ошибка загрузки аватарки");
    }
}

// Вызываем загрузку аватарки при инициализации
loadUserAvatar();

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

function closeProfileModal() {
    const profileModal = document.getElementById("profile-modal");
    if (profileModal) {
        profileModal.classList.remove("show");
    }
}

// ========== Кнопка Мои команды ==========
const teamsBtn = document.getElementById("teams-btn");
if (teamsBtn) {
    teamsBtn.onclick = function () {
        if (userDropdown) userDropdown.classList.remove("open");
        const teamsModal = document.getElementById("teams-modal");
        if (teamsModal) {
            teamsModal.classList.add("show");
            fetchTeams();
        }
    };
}

// ========== Кнопка О проекте ==========
const aboutBtn = document.getElementById("about-btn");
if (aboutBtn) {
    aboutBtn.onclick = function () {
        if (userDropdown) userDropdown.classList.remove("open");
        const aboutModal = document.getElementById("about-modal");
        if (aboutModal) {
            aboutModal.classList.add("show");
        }
    };
}

const aboutModal = document.getElementById("about-modal");

const teamsModal = document.getElementById("teams-modal");

function closeTeamsModal() {
    const teamsModal = document.getElementById("teams-modal");
    if (teamsModal) {
        teamsModal.classList.remove("show");
    }
}

// ========== Смена пароля ==========
const changePasswordBtn = document.getElementById("change-password-btn");
if (changePasswordBtn) {
    changePasswordBtn.onclick = function () {
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

function closeChangePasswordModal() {
    const changePasswordModal = document.getElementById("change-password-modal");
    if (changePasswordModal) {
        changePasswordModal.classList.remove("show");
    }
}

const changePasswordModal = document.getElementById("change-password-modal");

const changePasswordForm = document.getElementById("change-password-form");
if (changePasswordForm) {
    changePasswordForm.onsubmit = async function (e) {
        e.preventDefault();
        let oldPass = document.getElementById("old_password").value;
        let newPass = document.getElementById("new_password").value;
        let newPass2 = document.getElementById("new_password2").value;
        let err = document.getElementById("change-password-error");
        if (newPass !== newPass2) {
            if (err) err.innerText = "Пароли не совпадают!";
            return;
        }
        try {
            let resp = await fetch(`/${USERNAME}/api/change_password`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({
                    old_password: oldPass,
                    new_password: newPass,
                }),
            });
            if (resp.ok) {
                if (err) {
                    err.style.color = "#32c964";
                    err.innerText = "Пароль изменён!";
                }
                setTimeout(closeChangePasswordModal, 900);
            } else {
                if (err) {
                    err.style.color = "#d11a2a";
                    let data = await resp.json();
                    err.innerText = data.error || "Ошибка смены пароля!";
                }
            }
        } catch (error) {
            if (err) err.innerText = "Ошибка сети!";
        }
    };
}

// ===================== State =====================
let STATUSES = [];
let TASKS = [];

// ===================== SPA: Fetch Board =====================
async function fetchBoard() {
    try {
        let [statuses, tasks] = await Promise.all([
            fetch(`/${USERNAME}/api/statuses`, { headers: getHeaders() }).then((r) => r.json()),
            fetch(`/${USERNAME}/api/tasks`, { headers: getHeaders() }).then((r) => r.json()),
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

        renderBoard();
    } catch (error) {
        TASKS = [];
        STATUSES = [];
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
            ? `<div class="task-desc" style="white-space:pre-line;word-break:break-word;">${escapeHTML(descPreview)}</div>`
            : ""
        }
          <div class="task-meta">
            ${avatarHtml}
            ${assigneeNameHtml}
          </div>
          <div class="task-actions" style="margin-top: 6px; display: flex; flex-direction: row; gap: 6px; align-items: center;">
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
        const response = await fetch(`/api/avatar/${username}`, { headers: getHeaders() });
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
                    headers: getHeaders(),
                    body: JSON.stringify({ orders }),
                });
                if (resp.ok) fetchBoard();
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
                headers: getHeaders(null), // Не добавляем Content-Type для FormData
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
                headers: getHeaders(),
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
                fetchBoard();
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
                headers: getHeaders(),
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
async function fetchTeams() {
    try {
        let resp = await fetch(`/${USERNAME}/api/teams/list`, { headers: getHeaders() });
        let data = await resp.json();
        // Универсальная обработка: массив может быть либо сразу, либо по ключу
        if (Array.isArray(data)) {
            TEAMS = data;
        } else if (Array.isArray(data.teams)) {
            TEAMS = data.teams;
        } else if (Array.isArray(data.results)) {
            TEAMS = data.results;
        } else {
            TEAMS = [];
        }
        renderTeams();
    } catch (e) {
        TEAMS = [];
        renderTeams();
    }
}
function renderTeams() {
    const list = document.getElementById("teams-list");
    list.innerHTML = "";
    if (!TEAMS || TEAMS.length === 0) {
        list.innerHTML = `<div style="padding: 18px 0; text-align: center; color: var(--text-soft); font-size: 1.08em;">Нет команд</div>`;
        return;
    }
    TEAMS.forEach((team) => {
        const card = document.createElement("div");
        card.className = "team-card";
        card.dataset.teamId = team.id;
        let isLeader =
            team.leader_name === USERNAME ||
            team.leader === USERNAME ||
            team.is_leader;
        card.innerHTML = `
            <div class="team-header">
              <span class="team-icon material-icons">groups</span>
              <span class="team-title">${escapeHTML(
            team.name || team.title || "Без названия"
        )}</span>
              ${isLeader
                ? `<button class="icon-btn edit-team-btn" data-team-id="${team.id}" title="Редактировать"><span class="material-icons">edit</span></button>`
                : ""
            }
            </div>
            <div class="team-leader">
              <span class="material-icons member-icon" title="Лидер">star</span>
              <span>${escapeHTML(
                team.leader_name || team.leader || "-"
            )}</span>
            </div>
            <div class="team-members">
              ${(team.members || [])
                .map(
                    (m) => `<span class="team-member">${escapeHTML(m)}</span>`
                )
                .join("")}
            </div>
            <div class="team-actions">
              <button class="plus-btn team-enter-btn" data-team-id="${team.id
            }"><span class="material-icons">login</span>Перейти</button>
              ${!isLeader
                ? `<button class="plus-btn danger-btn team-leave-btn" data-team-id="${team.id}"><span class="material-icons">logout</span>Выйти</button>`
                : ""
            }
            </div>
          `;
        list.appendChild(card);
    });
    document.querySelectorAll(".edit-team-btn").forEach((btn) => {
        btn.onclick = function (e) {
            e.preventDefault();
            const teamId = +btn.dataset.teamId;
            const team = TEAMS.find((t) => t.id === teamId);
            const isLeader =
                team &&
                (team.leader_name === USERNAME ||
                    team.leader === USERNAME ||
                    team.is_leader);
            if (!isLeader) return;
            openEditTeamModal(teamId);
        };
    });
    document.querySelectorAll(".team-leave-btn").forEach((btn) => {
        btn.onclick = async function (e) {
            e.preventDefault();
            if (!confirm("Выйти из команды?")) return;
            let teamId = btn.dataset.teamId;
            let resp = await fetch(`/${USERNAME}/api/teams/${teamId}/leave`, {
                method: "POST",
                headers: getHeaders(),
            });
            if (resp.ok) {
                // Перенаправляем на личную Kanban-доску
                window.location.href = `/${USERNAME}/kanban`;
            } else {
                alert("Ошибка выхода из команды");
            }
        };
    });
    document.querySelectorAll(".team-enter-btn").forEach((btn) => {
        btn.onclick = function () {
            const teamId = btn.dataset.teamId;
            window.location = `/${USERNAME}/team?team_id=${teamId}`;
        };
    });
}
// === Создание команды ===
const createTeamBtn = document.getElementById("create-team-btn");
if (createTeamBtn) {
    createTeamBtn.onclick = function () {
        const createTeamModal = document.getElementById("create-team-modal");
        const createTeamError = document.getElementById("create-team-error");
        const teamNameInput = document.getElementById("team-name-input");

        if (createTeamModal) createTeamModal.classList.add("show");
        if (createTeamError) createTeamError.innerText = "";
        if (teamNameInput) teamNameInput.value = "";
    };
}

function closeCreateTeamModal() {
    const createTeamModal = document.getElementById("create-team-modal");
    if (createTeamModal) createTeamModal.classList.remove("show");
}

const createTeamModal = document.getElementById("create-team-modal");

const createTeamForm = document.getElementById("create-team-form");
if (createTeamForm) {
    createTeamForm.onsubmit = async function (e) {
        e.preventDefault();
        const teamNameInput = document.getElementById("team-name-input");
        const createTeamError = document.getElementById("create-team-error");

        if (!teamNameInput) return;
        let name = teamNameInput.value.trim();
        try {
            let resp = await fetch(`/${USERNAME}/api/teams`, {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ name }),
            });
            if (resp.ok) {
                let data = await resp.json();
                closeCreateTeamModal();
                fetchTeams();
                // Переход на командную доску этой команды:
                window.location.href = `/${USERNAME}/team?team_id=${data.team_id}`;
            } else {
                let data = await resp.json();
                if (createTeamError) {
                    createTeamError.innerText = data.error || "Ошибка создания!";
                }
            }
        } catch (error) {
            if (createTeamError) {
                createTeamError.innerText = "Ошибка сети!";
            }
        }
    };
}

// === Модалка редактирования команды ===
async function openEditTeamModal(teamId) {
    CURRENT_EDIT_TEAM = teamId;
    try {
        const response = await fetch(`/${USERNAME}/api/teams/${teamId}/info`, { headers: getHeaders() });
        const data = await response.json();

        const editTeamName = document.getElementById("edit-team-name");
        const editTeamMembers = document.getElementById("edit-team-members");
        const editTeamModal = document.getElementById("edit-team-modal");

        if (editTeamName) editTeamName.value = data.name;
        if (editTeamMembers) {
            editTeamMembers.innerHTML = "";
            // Лидер всегда сверху, без кнопок
            const leader = data.leader_name;
            if (leader) {
                editTeamMembers.innerHTML += `
              <div class="member-item leader-member" style="display:flex;align-items:center;gap:10px;background:rgba(255,152,0,0.10);border:2px solid #ff9800;box-shadow:0 2px 8px #ff980033;">
                <span class="material-icons member-icon" style="color: #ff9800; font-size:1.3em;">star</span>
                <span class="member-info" style="font-weight:800;color:#ff9800;">${leader}</span>
                <span class="member-admin" style="background:#ff9800;color:#fff;font-weight:900;margin-left:10px;padding:4px 10px;border-radius:8px;font-size:1em;">админ</span>
              </div>
          `;
            }

            // Остальные участники
            (data.members || []).forEach((member) => {
                if (member !== leader) {
                    editTeamMembers.innerHTML += `
              <div class="edit-team-member">
                <span>${escapeHTML(member)}</span>
                <button class="remove-member" onclick="removeMember('${member}')">
                  <span class="material-icons">close</span>
                </button>
              </div>
            `;
                }
            });
        }

        if (editTeamModal) editTeamModal.classList.add("show");
    } catch (error) {
        alert("Ошибка получения информации о команде");
    }
}

function closeEditTeamModal() {
    const editTeamModal = document.getElementById("edit-team-modal");
    if (editTeamModal) editTeamModal.classList.remove("show");
    CURRENT_EDIT_TEAM = null;
}

const editTeamModal = document.getElementById("edit-team-modal");

// === Обработчики для команд ===
const addMemberBtn = document.getElementById("add-member-btn");
if (addMemberBtn) {
    addMemberBtn.onclick = async function () {
        const addMemberInput = document.getElementById("add-member-input");
        const editTeamError = document.getElementById("edit-team-error");

        if (!addMemberInput) return;
        let username = addMemberInput.value.trim();
        if (!username) return;

        try {
            let resp = await fetch(
                `/${USERNAME}/api/teams/${CURRENT_EDIT_TEAM}/members`,
                {
                    method: "POST",
                    headers: getHeaders(),
                    body: JSON.stringify({ username }),
                }
            );
            if (resp.ok) {
                addMemberInput.value = "";
                openEditTeamModal(CURRENT_EDIT_TEAM);
                // Обновляем список участников команды для автодополнения исполнителей
                // (если мы находимся на командной доске)
                if (window.location.pathname.includes('/team')) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const teamId = urlParams.get('team_id');
                    if (teamId && CURRENT_EDIT_TEAM == teamId) {
                        const membersResponse = await fetch(`/${USERNAME}/api/teams/${teamId}/members`, { headers: getHeaders() });
                        const membersData = await membersResponse.json();
                        if (window.MEMBERS) {
                            window.MEMBERS = membersData.members || [];
                        }
                    }
                }
            } else {
                let data = await resp.json();
                if (editTeamError) {
                    editTeamError.innerText = data.error || "Ошибка добавления!";
                }
            }
        } catch (error) {
            if (editTeamError) {
                editTeamError.innerText = "Ошибка сети!";
            }
        }
    };
}

const editTeamForm = document.getElementById("edit-team-form");
if (editTeamForm) {
    editTeamForm.onsubmit = async function (e) {
        e.preventDefault();
        const editTeamName = document.getElementById("edit-team-name");
        const editTeamError = document.getElementById("edit-team-error");

        if (!editTeamName) return;
        let name = editTeamName.value.trim();

        try {
            let resp = await fetch(
                `/${USERNAME}/api/teams/${CURRENT_EDIT_TEAM}/edit`,
                {
                    method: "POST",
                    headers: getHeaders(),
                    body: JSON.stringify({ name }),
                }
            );
            if (resp.ok) {
                closeEditTeamModal();
                fetchTeams();
            } else {
                let data = await resp.json();
                if (editTeamError) {
                    editTeamError.innerText = data.error || "Ошибка сохранения!";
                }
            }
        } catch (error) {
            if (editTeamError) {
                editTeamError.innerText = "Ошибка сети!";
            }
        }
    };
}

const deleteTeamBtn = document.getElementById("delete-team-btn");
if (deleteTeamBtn) {
    deleteTeamBtn.onclick = async function () {
        if (!confirm("Удалить команду?")) return;
        const editTeamError = document.getElementById("edit-team-error");

        try {
            let resp = await fetch(
                `/${USERNAME}/api/teams/${CURRENT_EDIT_TEAM}/delete`,
                {
                    method: "POST",
                    headers: getHeaders(),
                }
            );
            if (resp.ok) {
                closeEditTeamModal();
                fetchTeams();
            } else {
                let data = await resp.json();
                if (editTeamError) {
                    editTeamError.innerText = data.error || "Ошибка удаления!";
                }
            }
        } catch (error) {
            if (editTeamError) {
                editTeamError.innerText = "Ошибка сети!";
            }
        }
    };
}

// Функция удаления участника
function removeMember(username) {
    if (!confirm(`Удалить участника ${username}?`)) return;

    fetch(`/${USERNAME}/api/teams/${CURRENT_EDIT_TEAM}/members`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ username, remove: true }),
    }).then(async (resp) => {
        if (resp.ok) {
            // Просто обновляем участников, не закрывая модалку
            openEditTeamModal(CURRENT_EDIT_TEAM);
            // Обновляем список участников команды для автодополнения исполнителей
            // (если мы находимся на командной доске)
            if (window.location.pathname.includes('/team')) {
                const urlParams = new URLSearchParams(window.location.search);
                const teamId = urlParams.get('team_id');
                if (teamId && CURRENT_EDIT_TEAM == teamId) {
                    const membersResponse = await fetch(`/${USERNAME}/api/teams/${teamId}/members`, { headers: getHeaders() });
                    const membersData = await membersResponse.json();
                    if (window.MEMBERS) {
                        window.MEMBERS = membersData.members || [];
                    }
                }
            }
        } else {
            resp.json().then((data) => {
                const editTeamError = document.getElementById("edit-team-error");
                if (editTeamError) {
                    editTeamError.innerText = data.error || "Ошибка удаления!";
                }
            });
        }
    }).catch((error) => {
        if (editTeamError) {
            editTeamError.innerText = "Ошибка сети!";
        }
    });
}

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
fetchTeams();
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
                    headers: getHeaders(),
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
            try {
                let resp = await fetch(`/${USERNAME}/api/tasks/${id}`, {
                    method: "DELETE",
                    headers: getHeaders(),
                });
                if (resp.ok) {
                    fetchBoard();
                } else {
                    let data = await resp.json();
                    let errorMsg =
                        data && data.error ? data.error : "Ошибка удаления задачи";
                    alert(errorMsg);
                }
            } catch (error) {
                alert("Ошибка при удалении задачи");
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
        let resp = await fetch(`/api/check_user_id/${userId}`, { headers: getHeaders() });
        if (resp.ok) {
            let data = await resp.json();
            if (data && data.username) return data.username;
        }
    } catch (e) { }
    return "-";
}

async function openViewTaskModal(task) {
    const modal = document.getElementById("view-task-modal");
    const title = document.getElementById("view-task-title");
    const content = document.getElementById("view-task-content");

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
    let imageNotice = hasImage
        ? `<div class='view-task-has-image'><span class='material-icons' style='vertical-align:middle;color:#5271ff;'>image</span> <span style='color:#5271ff;font-weight:500;'>Есть вложения</span></div>`
        : "";

    if (content) {
        content.innerHTML = `
          <div class="view-task-section">
            <div class="view-task-field">
              <span class="material-icons">flag</span>
              <span><strong>Статус:</strong> ${getStatusTitle(
            task.status
        )}</span>
            </div>
            ${task.due_date
                ? `
              <div class="view-task-field">
                <span class="material-icons">event</span>
                <span><strong>Срок:</strong> ${formatRuDate(
                    task.due_date
                )}</span>
              </div>
            `
                : ""
            }
            ${task.tags && task.tags.length > 0
                ? `
              <div class="view-task-field">
                <span class="material-icons">label</span>
                <span><strong>Теги:</strong> ${task.tags
                    .map(
                        (tag) =>
                            `<span class="task-tag tag-${tag.toLowerCase()}">${escapeHTML(
                                tag
                            )}</span>`
                    )
                    .join(" ")}</span>
              </div>
            `
                : ""
            }
            <div class="view-task-field">
              <span class="material-icons">description</span>
              <span><strong>Описание:</strong></span>
            </div>
            <div class="view-task-description-preview" style="white-space:pre-line;word-break:break-word;">${textPreview}${imageNotice}</div>
            ${needShowFull
                ? `<div class='view-task-more'><button class='view-full-task-btn plus-btn' data-task-id='${task.id}'><span class='material-icons'>open_in_new</span>Открыть полностью</button></div>`
                : ""
            }
            <div class="view-task-field">
              <span class="material-icons">person</span>
              <span><strong>Обновлено:</strong> ${task.updated_by_name || "Неизвестно"
            }</span>
            </div>
            <div class="view-task-field">
              <span class="material-icons">schedule</span>
              <span><strong>Дата:</strong> ${formatDateTime(
                task.updated_at
            )}</span>
            </div>
          </div>
        `;
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

function openFullTaskView(taskId) {
    window.location.href = `/${USERNAME}/task/${taskId}`;
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

function closeAboutModal() {
    const aboutModal = document.getElementById("about-modal");
    if (aboutModal) aboutModal.classList.remove("show");
}

// === Централизованный режим редактирования профиля ===
let profileEditMode = false;
const saveBtn = document.getElementById('save-profile-btn');
const cancelBtn = document.getElementById('cancel-profile-btn');
const errorDiv = document.getElementById('profile-error');
const fields = ['email', 'country', 'fullname'];

function setProfileEditMode(on) {
    profileEditMode = on;
    const profileForm = document.getElementById('profile-form');
    const profileInfo = document.getElementById('profile-info-block');

    // Показываем/скрываем блоки
    if (profileInfo) profileInfo.style.display = on ? 'none' : 'flex';
    if (profileForm) profileForm.style.display = on ? 'block' : 'none';

    fields.forEach(f => {
        const input = document.getElementById(`profile-${f}-input`);
        const display = document.getElementById(`profile-${f}`);
        const select = document.getElementById(`profile-country-select`);

        if (f === 'country' && select) {
            if (on) {
                // Включаем редактирование
                fillCountryOptions(select, select.value || '');
                select.disabled = false;
                select.style.display = 'block';
                if (display) display.style.display = 'none';
            } else {
                // Возвращаем просмотр
                select.disabled = true;
                select.style.display = 'none';
                if (display) display.style.display = 'block';
            }
            select.classList.toggle('active', on);
        } else if (input && display) {
            if (on) {
                // Включаем редактирование
                input.disabled = false;
                input.style.display = 'block';
                display.style.display = 'none';
            } else {
                // Возвращаем просмотр
                input.disabled = true;
                input.style.display = 'none';
                display.style.display = 'block';
            }
            input.classList.toggle('active', on);
        }
    });

    // Показываем/скрываем кнопки
    if (saveBtn) {
        saveBtn.style.display = on ? 'inline-flex' : 'none';
        saveBtn.classList.toggle('active', on);
    }
    if (cancelBtn) {
        cancelBtn.style.display = on ? 'inline-flex' : 'none';
        cancelBtn.classList.toggle('active', on);
    }

    if (profileForm) {
        profileForm.classList.toggle('active', on);
    }
}

const editProfileBtn = document.getElementById('edit-profile-btn');
if (editProfileBtn) {
    editProfileBtn.onclick = function () {
        setProfileEditMode(true);
    };
}
if (cancelBtn) {
    cancelBtn.onclick = function () {
        setProfileEditMode(false);
        resetProfileEditFields(window.lastProfileData || {});
        if (errorDiv) {
            errorDiv.textContent = '';
            errorDiv.className = 'profile-error';
        }
    };
}
if (saveBtn && profileForm) {
    profileForm.onsubmit = async function (e) {
        e.preventDefault();
        saveBtn.disabled = true;
        errorDiv.textContent = '';
        errorDiv.className = 'profile-error';

        // Скрываем предыдущее успешное сообщение
        const successMessage = document.getElementById('profile-success-message');
        if (successMessage) successMessage.style.display = 'none';

        const email = document.getElementById('profile-email-input')?.value?.trim() || '';
        const country = document.getElementById('profile-country-select')?.value?.trim() || '';
        const fullname = document.getElementById('profile-fullname-input')?.value?.trim() || '';
        // Валидация email
        const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (!emailPattern.test(email)) {
            errorDiv.textContent = 'Введите корректный e-mail';
            errorDiv.className = 'profile-error visible';
            saveBtn.disabled = false;
            return;
        }
        try {
            const resp = await fetch(`/${USERNAME}/api/update_profile`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ email, country, fullname })
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                // Обновляем отображаемые значения
                const emailEl = document.getElementById('profile-email');
                const countryEl = document.getElementById('profile-country');
                const fullnameEl = document.getElementById('profile-fullname');
                if (emailEl) emailEl.textContent = email;
                if (countryEl) countryEl.textContent = country;
                if (fullnameEl) fullnameEl.textContent = fullname;

                // Показываем успешное сообщение в блоке информации
                if (successMessage) {
                    successMessage.textContent = 'Профиль успешно обновлён!';
                    successMessage.style.display = 'flex';
                }

                window.lastProfileData = { email, country, fullname };
                setProfileEditMode(false);

                // Скрываем сообщение через 3 секунды
                setTimeout(() => {
                    if (successMessage) successMessage.style.display = 'none';
                }, 3000);
            } else {
                errorDiv.textContent = data.error || 'Ошибка обновления профиля';
                errorDiv.className = 'profile-error visible';
            }
        } catch (err) {
            errorDiv.textContent = 'Ошибка сети';
            errorDiv.className = 'profile-error visible';
        }
        saveBtn.disabled = false;
    };
}

function resetProfileEditFields(data) {
    fields.forEach(f => {
        const input = document.getElementById(`profile-${f}-input`);
        const display = document.getElementById(`profile-${f}`);
        const select = document.getElementById(`profile-country-select`);
        if (f === 'country' && select) {
            if (select) select.value = data[f] || '';
            if (display) display.textContent = data[f] || '';
        } else {
            if (input) input.value = data[f] || '';
            if (display) display.textContent = data[f] || '';
        }
    });
}

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

function showProfileModal() {
    const profileModal = document.getElementById('profile-modal');
    if (profileModal) profileModal.classList.add('show');
}

// === Инициализация селектора стран ===
function initializeCountrySelect() {
    const countrySelect = document.getElementById('profile-country-select');
    if (countrySelect && typeof fillCountryOptions === 'function') {
        fillCountryOptions(countrySelect, countrySelect.value || '');
    }
}

// Инициализируем селектор стран при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    initializeCountrySelect();
});

// Также инициализируем при открытии модалки профиля
const originalShowProfileModal = showProfileModal;
showProfileModal = function () {
    originalShowProfileModal();
    setTimeout(initializeCountrySelect, 100); // Небольшая задержка для гарантии загрузки DOM
};

// --- Logout ---
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.onclick = () => {
        window.location.href = `/${USERNAME}/logout`;
    };
}

// --- Открытие модалки профиля (гарантированно последний обработчик) ---
const profileBtn = document.getElementById("profile-btn");
if (profileBtn) {
    profileBtn.onclick = async function () {
        const userDropdown = document.getElementById("user-dropdown");
        if (userDropdown) userDropdown.classList.remove("show");
        try {
            let r = await fetch(`/api/profile/${USERNAME}`, { headers: getHeaders() });
            let data = await r.json();

            // Заполняем username через innerHTML с <span>
            const usernameEl = document.getElementById("profile-username");
            if (usernameEl) usernameEl.innerHTML = `<span>${data.username || ""}</span>`;

            // Обновляем данные профиля
            window.lastProfileData = {
                email: data.email || '',
                country: data.country || '',
                fullname: data.fullname || ''
            };

            // Заполняем поля
            const emailEl = document.getElementById("profile-email");
            const emailInput = document.getElementById("profile-email-input");
            const countryEl = document.getElementById("profile-country");
            const countrySelect = document.getElementById("profile-country-select");
            const fullnameEl = document.getElementById("profile-fullname");
            const fullnameInput = document.getElementById("profile-fullname-input");

            if (emailEl) emailEl.textContent = data.email || '';
            if (emailInput) emailInput.value = data.email || '';
            if (countryEl) countryEl.textContent = data.country || '';
            if (countrySelect) countrySelect.value = data.country || '';
            if (fullnameEl) fullnameEl.textContent = data.fullname || '';
            if (fullnameInput) fullnameInput.value = data.fullname || '';

            updateProfileAvatar(data.avatar_url);
            setProfileEditMode(false);
            showProfileModal();
        } catch (error) {
            alert("Ошибка загрузки профиля");
        }
    };
}