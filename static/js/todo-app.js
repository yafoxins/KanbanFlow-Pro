// Версия 4.0 — фикс: просмотр после сохранения/отмены, страна всегда актуальна, красивый select

(function () {
    const USERNAME = window.USERNAME || (document.body.dataset.username || '');

    // Инициализация CSRF токена
    window.CSRF_TOKEN = document.body.dataset.csrfToken || '';

    // ========== Utility Functions ==========
    // Используем глобальную функцию getHeaders

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

        // Инициализация кнопок в dropdown меню
        const profileBtn = document.getElementById("profile-btn");
        const changePasswordBtn = document.getElementById("change-password-btn");
        const aboutBtn = document.getElementById("about-btn");
        const logoutBtn = document.getElementById("logout-btn");

        if (profileBtn) {
            profileBtn.onclick = () => {
                const userDropdown = document.getElementById("user-dropdown");
                if (userDropdown) userDropdown.classList.remove("open");
                if (typeof window.showProfileModal === 'function') {
                    window.showProfileModal();
                }
            };
        }

        if (changePasswordBtn) {
            changePasswordBtn.onclick = () => {
                const userDropdown = document.getElementById("user-dropdown");
                if (userDropdown) userDropdown.classList.remove("open");
                if (typeof window.showChangePasswordModal === 'function') {
                    window.showChangePasswordModal();
                }
            };
        }

        if (aboutBtn) {
            aboutBtn.onclick = () => {
                const userDropdown = document.getElementById("user-dropdown");
                if (userDropdown) userDropdown.classList.remove("open");
                if (typeof window.showAboutModal === 'function') {
                    window.showAboutModal();
                }
            };
        }

        if (logoutBtn) {
            logoutBtn.onclick = () => {
                const userDropdown = document.getElementById("user-dropdown");
                if (userDropdown) userDropdown.classList.remove("open");

                if (typeof smoothNavigate === 'function') {
                    smoothNavigate(`/${USERNAME}/logout`);
                } else {
                    if (typeof disconnectAllSockets === 'function') {
                        disconnectAllSockets();
                    }
                    window.location.href = `/${USERNAME}/logout`;
                }
            };
        }
    }

    // ========== Profile Modal ==========
    // Инициализация профиля происходит в profile.js
    // Функция disconnectAllSockets теперь в profile.js

    // ========== Navigation ==========
    function initNavigation() {
        const kanbanBtn = document.getElementById("kanban-btn");
        const todoBtn = document.getElementById("todo-btn");
        // Инициализация profileBtn происходит в profile.js

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

        // Кнопка "Команды" отсутствует в todo.html

        const aboutBtn = document.getElementById("about-btn");
        if (aboutBtn) {
            aboutBtn.onclick = () => {
                const userDropdown = document.getElementById("user-dropdown");
                if (userDropdown) userDropdown.classList.remove("open");
                const aboutModal = document.getElementById("about-modal");
                if (aboutModal) {
                    aboutModal.classList.add("show");
                }
            };
        }

        if (window.location.pathname.includes("/kanban")) {
            if (kanbanBtn) kanbanBtn.classList.add("active");
        } else {
            if (todoBtn) todoBtn.classList.add("active");
        }
    }

    // ========== Logout ==========
    // Функция initLogout теперь в profile.js

    // ========== Avatar Handling ==========
    // Все функции аватарки теперь в profile.js

    // ========== Change Password Modal ==========
    // Функция initChangePasswordModal теперь в profile.js

    // ========== About Modal ==========
    // Функция initAboutModal теперь в profile.js

    // ========== Todo List ==========
    function initTodoList() {
        const todoList = document.getElementById("todo-list");
        const todoForm = document.getElementById("todo-add-form");
        const todoInput = document.getElementById("todo-input");
        const todoDate = document.getElementById("todo-date");
        const toggleCompletedBtn = document.getElementById("toggle-completed-btn");
        let todos = [];
        let showCompleted = true;

        // Устанавливаем текущую дату по умолчанию
        function setCurrentDate() {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            const currentDate = `${year}-${month}-${day}`;
            if (todoDate) {
                todoDate.value = currentDate;
            }
        }

        // Вызываем функцию при загрузке страницы
        setCurrentDate();

        function renderTodos() {
            if (!todoList) return;

            todoList.innerHTML = "";
            const maxLength = 50; // Максимальная длина для отображения

            // === Мини-статистика ===
            const activeCount = todos.filter(t => !t.done).length;
            const doneCount = todos.filter(t => t.done).length;
            const statsDiv = document.getElementById('todo-stats');
            if (statsDiv) {
                statsDiv.innerHTML = `<span><span class='material-icons' style='font-size:1.1em;vertical-align:-2px;color:#32c964;'>radio_button_unchecked</span> Активных: <b>${activeCount}</b></span>` +
                    `<span><span class='material-icons' style='font-size:1.1em;vertical-align:-2px;color:#b9bccc;'>check_circle</span> Завершённых: <b>${doneCount}</b></span>`;
            }

            todos.forEach((t, i) => {
                if (!showCompleted && t.done) return;
                let li = document.createElement("li");
                li.className = "todo-item" + (t.done ? " completed" : "");

                // Определяем, нужно ли обрезать текст
                const textLength = t.text.length;
                const shouldTruncate = textLength > maxLength;
                const displayText = shouldTruncate ? t.text.substring(0, maxLength) + "..." : t.text;

                li.innerHTML = `
        <label class="todo-checkbox">
          <input type="checkbox" ${t.done ? "checked" : ""} data-i="${i}" />
        </label>
        <div class="todo-content">
          <div class="todo-text-wrapper">
            <span class="todo-text${t.done ? " completed" : ""}" data-i="${i}" data-full-text="${escapeHTML(t.text)}">${escapeHTML(displayText)}</span>
            ${shouldTruncate ? `<button class="todo-expand-btn" data-i="${i}" title="Раскрыть текст"><span class="material-icons">expand_more</span></button>` : ''}
          </div>
          <span class="date${t.done ? " completed" : ""}">${t.date ? formatDate(t.date) : ""}</span>
        </div>
        <button class="remove-btn" data-i="${i}" title="Удалить">
          <span class="material-icons">close</span>
        </button>
      `;
                todoList.appendChild(li);
            });

            // Обработчики для кнопок раскрытия текста
            document.querySelectorAll(".todo-expand-btn").forEach((btn) => {
                btn.addEventListener("click", function (e) {
                    e.stopPropagation();
                    const i = this.getAttribute("data-i");
                    const textElement = this.previousElementSibling;
                    const fullText = textElement.getAttribute("data-full-text");
                    const isExpanded = textElement.classList.contains("expanded");

                    if (isExpanded) {
                        // Сворачиваем текст
                        textElement.textContent = fullText.substring(0, maxLength) + "...";
                        textElement.classList.remove("expanded");
                        this.innerHTML = '<span class="material-icons">expand_more</span>';
                        this.title = "Раскрыть текст";
                    } else {
                        // Разворачиваем текст
                        textElement.textContent = fullText;
                        textElement.classList.add("expanded");
                        this.innerHTML = '<span class="material-icons">expand_less</span>';
                        this.title = "Свернуть текст";
                    }
                });
            });

            // Обновляем стиль и текст кнопки
            if (toggleCompletedBtn) {
                if (showCompleted) {
                    toggleCompletedBtn.classList.remove("active");
                    toggleCompletedBtn.innerHTML = `<span class="material-icons" style="font-size: 1.22em; vertical-align: -2px; margin-right: 7px">checklist</span>Скрыть завершённые`;
                } else {
                    toggleCompletedBtn.classList.add("active");
                    toggleCompletedBtn.innerHTML = `<span class="material-icons" style="font-size: 1.22em; vertical-align: -2px; margin-right: 7px">checklist</span>Показать завершённые`;
                }
            }
        }

        // Загружаем todos из localStorage
        function loadTodos() {
            const saved = localStorage.getItem(`todos_${USERNAME}`);
            if (saved) {
                try {
                    todos = JSON.parse(saved);
                } catch (e) {
                    todos = [];
                }
            }
            renderTodos();
        }

        // Сохраняем todos в localStorage
        function saveTodos() {
            localStorage.setItem(`todos_${USERNAME}`, JSON.stringify(todos));
        }

        // Добавляем новый todo
        if (todoForm) {
            todoForm.onsubmit = function (e) {
                e.preventDefault();
                let text = todoInput.value.trim();
                let date = todoDate.value;
                if (!text) return;

                todos.push({
                    id: Date.now(),
                    text: text,
                    date: date,
                    done: false
                });

                todoInput.value = "";
                saveTodos();
                renderTodos();
            };
        }

        // Обработчики событий
        if (todoList) {
            todoList.addEventListener("click", function (e) {
                if (e.target.matches("input[type='checkbox']")) {
                    let i = parseInt(e.target.dataset.i);
                    const wasCompleted = todos[i].done;
                    todos[i].done = !todos[i].done;

                    // Показываем toast уведомление
                    if (window.toast) {
                        if (todos[i].done) {
                            window.toast.todoCompleted(todos[i].text);
                        } else {
                            window.toast.todoUncompleted(todos[i].text);
                        }
                    }

                    saveTodos();
                    renderTodos();
                } else if (e.target.closest(".remove-btn")) {
                    let i = parseInt(e.target.closest(".remove-btn").dataset.i);
                    const todoText = todos[i].text;
                    todos.splice(i, 1);

                    // Показываем toast уведомление
                    if (window.toast) {
                        window.toast.todoDeleted(todoText);
                    }

                    saveTodos();
                    renderTodos();
                }
            });
        }

        // Кнопка переключения завершённых
        if (toggleCompletedBtn) {
            toggleCompletedBtn.onclick = function () {
                showCompleted = !showCompleted;
                renderTodos();
            };
        }

        // Загружаем todos при инициализации
        loadTodos();
    }

    // ========== Utility Functions ==========
    function formatDate(dateStr) {
        let d = new Date(dateStr);
        return d.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
        });
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

    // ========== Modal Functions ==========
    // Все функции модалок теперь в profile.js и universal-modals.js

    // ===== СИСТЕМА УВЕДОМЛЕНИЙ =====
    let notificationsData = [];
    let unreadCount = 0;

    // Инициализация Socket.IO для уведомлений
    function initNotificationsSocket() {
        if (typeof io !== 'undefined') {
            const socket = io();

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
            console.error('Ошибка загрузки уведомлений:', error);
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

    // Получение инициалов
    function getInitials(name) {
        if (!name) return "?";
        return name[0].toUpperCase();
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
            console.error('Ошибка отметки уведомлений:', error);
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
            console.error('Ошибка отметки всех уведомлений:', error);
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

    // ========== Инициализация ==========
    document.addEventListener('DOMContentLoaded', function () {
        // Инициализация toast уведомлений
        if (window.ToastNotifications) {
            window.toast = new ToastNotifications();
        }

        initUserDropdown();
        // Инициализация профиля и аватарки происходит в profile.js
        initNavigation();
        initTodoList();
        if (typeof window.initUniversalModalHandlers === 'function') window.initUniversalModalHandlers();
        initNotifications(); // Добавляем инициализацию уведомлений

        // Дополнительная загрузка аватарки для гарантии
        if (typeof loadInitialAvatar === 'function') {
            setTimeout(loadInitialAvatar, 200);
        }

        // Инициализация обработчиков из profile.js и universal-modals.js
        if (typeof window.initLogout === 'function') window.initLogout();
        if (typeof window.initChangePasswordForm === 'function') window.initChangePasswordForm();
        if (typeof window.initProfileHandlers === 'function') window.initProfileHandlers();
        if (typeof window.initProfileUniversalHandlers === 'function') window.initProfileUniversalHandlers();

        // Дополнительные обработчики для кнопок отмены в модалках
        // Эти обработчики уже есть в universal-modals.js, поэтому убираем дублирование
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
})();