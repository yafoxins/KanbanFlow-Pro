// Универсальная система уведомлений для Kanban/ToDo/Team Board
(function () {
    let notificationsData = [];
    let unreadCount = 0;

    // Инициализация Socket.IO для уведомлений
    function initNotificationsSocket() {
        if (typeof io !== 'undefined') {
            const socket = io();
            const username = document.body.getAttribute('data-username');
            if (!username) return;
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
        }
    }

    // Загрузка уведомлений
    async function loadNotifications() {
        try {
            const username = document.body.getAttribute('data-username');
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
            <div class="notification-message">${escapeHTML(notification.message)}</div>
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
            const username = document.body.getAttribute('data-username');
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

    // Отметить все как прочитанные
    async function markAllNotificationsAsRead() {
        try {
            const username = document.body.getAttribute('data-username');
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

    // Инициализация обработчиков уведомлений
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

    // Вспомогательные функции
    function getInitials(name) {
        if (!name) return '?';
        return name[0].toUpperCase();
    }
    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }
    // Используем глобальную функцию getHeaders

    // Автоматическая инициализация при загрузке страницы
    document.addEventListener('DOMContentLoaded', function () {
        initNotifications();
    });

    // Экспортируем для ручного вызова (если нужно)
    window.initNotifications = initNotifications;
})(); 