// Система Toast уведомлений
class ToastNotifications {
    constructor() {
        this.container = null;
        this.toasts = new Map();
        this.defaultDuration = 5000;
        this.init();
    }

    init() {
        // Создаем контейнер для toast'ов
        this.container = document.createElement('div');
        this.container.className = 'toast-container';
        document.body.appendChild(this.container);
    }

    show(options) {
        const {
            type = 'info',
            title = '',
            message = '',
            icon = null,
            duration = this.defaultDuration,
            persistent = false,
            className = '',
            onClick = null,
            onClose = null
        } = options;

        const toastId = this.generateId();
        const toast = this.createToast({
            id: toastId,
            type,
            title,
            message,
            icon,
            className,
            onClick,
            onClose
        });

        this.toasts.set(toastId, toast);
        this.container.appendChild(toast.element);

        // Анимация появления
        setTimeout(() => {
            toast.element.classList.add('show');
        }, 50);

        // Автозакрытие
        if (!persistent && duration > 0) {
            this.scheduleRemoval(toastId, duration);
        }

        return toastId;
    }

    createToast({ id, type, title, message, icon, className, onClick, onClose }) {
        const element = document.createElement('div');
        element.className = `toast ${type} ${className}`;
        element.dataset.toastId = id;

        // Определяем иконку по типу
        const iconMap = {
            success: 'check_circle',
            error: 'error',
            warning: 'warning',
            info: 'info',
            loading: 'sync'
        };

        const toastIcon = icon || iconMap[type] || 'notifications';

        element.innerHTML = `
            <div class="toast-icon">
                <span class="material-icons">${toastIcon}</span>
            </div>
            <div class="toast-content">
                ${title ? `<div class="toast-title">${this.escapeHtml(title)}</div>` : ''}
                ${message ? `<div class="toast-message">${this.escapeHtml(message)}</div>` : ''}
            </div>
            <button class="toast-close" type="button">
                <span class="material-icons">close</span>
            </button>
        `;

        // Обработчик закрытия
        const closeButton = element.querySelector('.toast-close');
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.hide(id);
            if (onClose) onClose();
        });

        // Обработчик клика на toast
        if (onClick) {
            element.style.cursor = 'pointer';
            element.addEventListener('click', onClick);
        }

        return { element, id };
    }

    hide(toastId) {
        const toast = this.toasts.get(toastId);
        if (!toast) return;

        toast.element.classList.add('hide');
        toast.element.classList.remove('show');

        setTimeout(() => {
            if (toast.element.parentNode) {
                toast.element.parentNode.removeChild(toast.element);
            }
            this.toasts.delete(toastId);
        }, 400);
    }

    scheduleRemoval(toastId, duration) {
        const toast = this.toasts.get(toastId);
        if (!toast) return;

        // Добавляем прогресс бар
        const progressBar = document.createElement('div');
        progressBar.className = 'toast-progress';
        progressBar.style.width = '100%';
        progressBar.style.animationDuration = `${duration}ms`;
        toast.element.appendChild(progressBar);

        // Анимация уменьшения прогресс бара
        setTimeout(() => {
            progressBar.style.width = '0%';
            progressBar.style.transition = `width ${duration}ms linear`;
        }, 50);

        setTimeout(() => {
            this.hide(toastId);
        }, duration);
    }

    generateId() {
        return 'toast_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Предустановленные методы для разных типов уведомлений
    success(title, message, options = {}) {
        return this.show({
            type: 'success',
            title,
            message,
            ...options
        });
    }

    error(title, message, options = {}) {
        return this.show({
            type: 'error',
            title,
            message,
            ...options
        });
    }

    warning(title, message, options = {}) {
        return this.show({
            type: 'warning',
            title,
            message,
            ...options
        });
    }

    info(title, message, options = {}) {
        return this.show({
            type: 'info',
            title,
            message,
            ...options
        });
    }

    loading(title, message, options = {}) {
        return this.show({
            type: 'loading',
            title,
            message,
            persistent: true,
            ...options
        });
    }

    // Специальные методы для различных событий
    avatarUpdated() {
        return this.show({
            type: 'success',
            title: 'Аватар обновлен',
            message: 'Ваш аватар успешно обновлен',
            icon: 'account_circle',
            className: 'avatar-updated bounce'
        });
    }

    avatarDeleted() {
        return this.show({
            type: 'info',
            title: 'Аватар удален',
            message: 'Аватар успешно удален',
            icon: 'person_remove',
            className: 'avatar-updated'
        });
    }

    telegramLinked() {
        return this.show({
            type: 'success',
            title: 'Telegram привязан',
            message: 'Ваш Telegram аккаунт успешно привязан',
            icon: 'link',
            className: 'telegram-linked bounce'
        });
    }

    telegramUnlinked() {
        return this.show({
            type: 'info',
            title: 'Telegram отвязан',
            message: 'Ваш Telegram аккаунт отвязан',
            icon: 'link_off',
            className: 'telegram-linked'
        });
    }

    searchNoResults(query) {
        return this.show({
            type: 'warning',
            title: 'Ничего не найдено',
            message: `По запросу "${query}" ничего не найдено`,
            icon: 'search_off',
            className: 'search-no-results',
            duration: 3000
        });
    }

    searchResults(count, query) {
        if (count === 0) {
            return this.searchNoResults(query);
        }

        return this.show({
            type: 'info',
            title: 'Результаты поиска',
            message: `Найдено задач: ${count}`,
            icon: 'search',
            duration: 2000
        });
    }

    profileUpdated() {
        return this.show({
            type: 'success',
            title: 'Профиль обновлен',
            message: 'Ваш профиль успешно обновлен',
            icon: 'person',
            className: 'bounce'
        });
    }

    profileUpdateError(reason = null) {
        return this.show({
            type: 'error',
            title: 'Ошибка обновления профиля',
            message: reason || 'Не удалось обновить профиль',
            icon: 'person',
            duration: 6000
        });
    }

    passwordChanged() {
        return this.show({
            type: 'success',
            title: 'Пароль изменен',
            message: 'Ваш пароль успешно изменен',
            icon: 'lock',
            className: 'bounce'
        });
    }

    taskCreated(taskName) {
        return this.show({
            type: 'success',
            title: 'Задача создана',
            message: `Задача "${taskName}" создана`,
            icon: 'add_task',
            className: 'bounce'
        });
    }

    taskUpdated(taskName) {
        return this.show({
            type: 'success',
            title: 'Задача обновлена',
            message: `Задача "${taskName}" обновлена`,
            icon: 'edit'
        });
    }

    taskDeleted(taskName) {
        return this.show({
            type: 'info',
            title: 'Задача удалена',
            message: `Задача "${taskName}" удалена`,
            icon: 'delete'
        });
    }

    teamCreated(teamName) {
        return this.show({
            type: 'success',
            title: 'Команда создана',
            message: `Команда "${teamName}" создана`,
            icon: 'groups',
            className: 'bounce'
        });
    }

    memberAdded(username, teamName) {
        return this.show({
            type: 'success',
            title: 'Участник добавлен',
            message: `${username} добавлен в команду "${teamName}"`,
            icon: 'person_add'
        });
    }

    memberRemoved(username, teamName) {
        return this.show({
            type: 'info',
            title: 'Участник удален',
            message: `${username} удален из команды "${teamName}"`,
            icon: 'person_remove'
        });
    }

    newNotification(count) {
        if (count === 1) {
            return this.show({
                type: 'info',
                title: 'Новое уведомление',
                message: 'У вас новое уведомление',
                icon: 'notifications',
                className: 'pulse',
                duration: 3000
            });
        } else {
            return this.show({
                type: 'info',
                title: 'Новые уведомления',
                message: `У вас ${count} новых уведомлений`,
                icon: 'notifications',
                className: 'pulse',
                duration: 3000
            });
        }
    }

    connectionLost() {
        return this.show({
            type: 'error',
            title: 'Соединение потеряно',
            message: 'Проверьте подключение к интернету',
            icon: 'wifi_off',
            persistent: true,
            className: 'pulse'
        });
    }

    connectionRestored() {
        return this.show({
            type: 'success',
            title: 'Соединение восстановлено',
            message: 'Подключение к серверу восстановлено',
            icon: 'wifi',
            className: 'bounce'
        });
    }

    newComment(authorName, taskTitle) {
        return this.show({
            type: 'info',
            title: 'Новый комментарий',
            message: `${authorName} оставил комментарий к задаче "${taskTitle}"`,
            icon: 'comment',
            className: 'pulse',
            duration: 4000
        });
    }

    taskAssigned(taskTitle, assigneeName) {
        return this.show({
            type: 'info',
            title: 'Назначена задача',
            message: `Вам назначена задача "${taskTitle}" от ${assigneeName}`,
            icon: 'assignment_ind',
            className: 'bounce',
            duration: 5000
        });
    }

    mentionReceived(authorName, message) {
        const truncatedMessage = message.length > 50 ? message.substring(0, 50) + '...' : message;
        return this.show({
            type: 'warning',
            title: 'Вас упомянули',
            message: `${authorName}: ${truncatedMessage}`,
            icon: 'alternate_email',
            className: 'pulse',
            duration: 5000
        });
    }

    statusChanged(taskTitle, oldStatus, newStatus) {
        return this.show({
            type: 'info',
            title: 'Статус изменен',
            message: `Задача "${taskTitle}" перемещена из "${oldStatus}" в "${newStatus}"`,
            icon: 'swap_horiz',
            duration: 4000
        });
    }

    deadlineReminder(taskTitle, hours) {
        let timeText;
        if (hours <= 1) {
            timeText = 'меньше часа';
        } else if (hours <= 24) {
            timeText = `${hours} часов`;
        } else {
            const days = Math.floor(hours / 24);
            timeText = `${days} дней`;
        }

        return this.show({
            type: 'warning',
            title: 'Напоминание о сроке',
            message: `Задача "${taskTitle}" должна быть выполнена через ${timeText}`,
            icon: 'schedule',
            className: 'pulse',
            duration: 6000
        });
    }

    // ========== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ДЛЯ РАЗЛИЧНЫХ ОПЕРАЦИЙ ==========

    // Операции с аватаркой
    avatarUploaded() {
        return this.show({
            type: 'success',
            title: 'Аватарка загружена',
            message: 'Ваша аватарка успешно загружена',
            icon: 'account_circle',
            className: 'avatar-updated bounce'
        });
    }

    avatarUploadError(reason = null) {
        return this.show({
            type: 'error',
            title: 'Ошибка загрузки аватарки',
            message: reason || 'Не удалось загрузить аватарку',
            icon: 'error',
            duration: 6000
        });
    }

    avatarSizeError() {
        return this.show({
            type: 'warning',
            title: 'Файл слишком большой',
            message: 'Максимальный размер аватарки: 5MB',
            icon: 'warning',
            duration: 5000
        });
    }



    avatarDeleteError(reason = null) {
        return this.show({
            type: 'error',
            title: 'Ошибка удаления аватарки',
            message: reason || 'Не удалось удалить аватарку',
            icon: 'error',
            duration: 5000
        });
    }

    // Операции с паролем
    passwordChangedSuccess() {
        return this.show({
            type: 'success',
            title: 'Пароль изменен',
            message: 'Ваш пароль успешно изменен',
            icon: 'lock',
            className: 'bounce'
        });
    }

    passwordChangeError(reason = null) {
        return this.show({
            type: 'error',
            title: 'Ошибка смены пароля',
            message: reason || 'Не удалось изменить пароль',
            icon: 'error',
            duration: 6000
        });
    }

    // Операции с командами
    teamUpdated(teamName) {
        return this.show({
            type: 'success',
            title: 'Команда обновлена',
            message: `Команда "${teamName}" успешно обновлена`,
            icon: 'edit',
            className: 'fade'
        });
    }

    teamDeleted(teamName) {
        return this.show({
            type: 'info',
            title: 'Команда удалена',
            message: `Команда "${teamName}" удалена`,
            icon: 'delete',
            duration: 4000
        });
    }

    teamMemberAdded(username, teamName) {
        return this.show({
            type: 'success',
            title: 'Участник добавлен',
            message: `${username} добавлен в команду "${teamName}"`,
            icon: 'person_add',
            className: 'bounce'
        });
    }

    teamMemberRemoved(username, teamName) {
        return this.show({
            type: 'info',
            title: 'Участник удален',
            message: `${username} удален из команды "${teamName}"`,
            icon: 'person_remove'
        });
    }

    teamLeaderChanged(newLeader, teamName) {
        return this.show({
            type: 'info',
            title: 'Лидер команды изменен',
            message: `${newLeader} назначен лидером команды "${teamName}"`,
            icon: 'admin_panel_settings',
            duration: 5000
        });
    }

    teamLeft(teamName) {
        return this.show({
            type: 'info',
            title: 'Вы покинули команду',
            message: `Вы покинули команду "${teamName}"`,
            icon: 'exit_to_app',
            duration: 4000
        });
    }

    // Операции со статусами
    statusCreated(statusName) {
        return this.show({
            type: 'success',
            title: 'Статус создан',
            message: `Статус "${statusName}" создан`,
            icon: 'add_circle',
            className: 'bounce'
        });
    }

    statusDeleted(statusName) {
        return this.show({
            type: 'info',
            title: 'Статус удален',
            message: `Статус "${statusName}" удален`,
            icon: 'remove_circle'
        });
    }

    // Ошибки сети и сервера
    networkError() {
        return this.show({
            type: 'error',
            title: 'Ошибка сети',
            message: 'Проверьте подключение к интернету',
            icon: 'signal_wifi_off',
            persistent: true
        });
    }

    serverError() {
        return this.show({
            type: 'error',
            title: 'Ошибка сервера',
            message: 'Попробуйте повторить действие позже',
            icon: 'error',
            duration: 6000
        });
    }

    permissionDenied() {
        return this.show({
            type: 'warning',
            title: 'Недостаточно прав',
            message: 'У вас недостаточно прав для выполнения этого действия',
            icon: 'block',
            duration: 5000
        });
    }

    dataNotFound(itemType = 'данные') {
        return this.show({
            type: 'warning',
            title: 'Данные не найдены',
            message: `Запрашиваемые ${itemType} не найдены`,
            icon: 'search_off',
            duration: 4000
        });
    }

    // Операции загрузки/сохранения
    dataSaving() {
        return this.show({
            type: 'loading',
            title: 'Сохранение...',
            message: 'Данные сохраняются',
            icon: 'sync',
            persistent: true,
            className: 'pulse'
        });
    }

    dataLoading() {
        return this.show({
            type: 'loading',
            title: 'Загрузка...',
            message: 'Данные загружаются',
            icon: 'sync',
            persistent: true,
            className: 'pulse'
        });
    }

    dataSaved() {
        return this.show({
            type: 'success',
            title: 'Данные сохранены',
            message: 'Ваши данные успешно сохранены',
            icon: 'save',
            className: 'bounce'
        });
    }

    dataLoaded() {
        return this.show({
            type: 'success',
            title: 'Данные загружены',
            message: 'Данные успешно загружены',
            icon: 'download_done',
            duration: 2000
        });
    }

    // Операции с изображениями
    imageUploaded() {
        return this.show({
            type: 'success',
            title: 'Изображение загружено',
            message: 'Изображение успешно загружено',
            icon: 'image',
            className: 'bounce'
        });
    }

    imageUploadError(reason = null) {
        return this.show({
            type: 'error',
            title: 'Ошибка загрузки изображения',
            message: reason || 'Не удалось загрузить изображение',
            icon: 'broken_image',
            duration: 5000
        });
    }

    // Операции с комментариями
    commentAdded() {
        return this.show({
            type: 'success',
            title: 'Комментарий добавлен',
            message: 'Ваш комментарий успешно добавлен',
            icon: 'comment',
            className: 'bounce'
        });
    }

    commentSent() {
        return this.show({
            type: 'success',
            title: 'Комментарий отправлен',
            message: 'Ваш комментарий успешно добавлен',
            icon: 'send',
            className: 'bounce',
            duration: 3000
        });
    }

    commentDeleted() {
        return this.show({
            type: 'info',
            title: 'Комментарий удален',
            message: 'Комментарий удален',
            icon: 'delete'
        });
    }

    // Валидационные ошибки
    validationError(field, message) {
        return this.show({
            type: 'warning',
            title: `Ошибка в поле "${field}"`,
            message: message,
            icon: 'warning',
            duration: 5000
        });
    }

    formValidationError() {
        return this.show({
            type: 'warning',
            title: 'Проверьте форму',
            message: 'Исправьте ошибки в форме и попробуйте снова',
            icon: 'error_outline',
            duration: 5000
        });
    }

    // Операции с задачами (дополнительные)
    taskDuplicateError() {
        return this.show({
            type: 'warning',
            title: 'Задача уже существует',
            message: 'Задача с таким названием уже существует',
            icon: 'content_copy',
            duration: 4000
        });
    }

    taskNotFound() {
        return this.show({
            type: 'warning',
            title: 'Задача не найдена',
            message: 'Запрашиваемая задача не найдена',
            icon: 'search_off',
            duration: 4000
        });
    }

    taskMoved(taskTitle, fromStatus, toStatus) {
        return this.show({
            type: 'info',
            title: 'Задача перемещена',
            message: `"${taskTitle}" перемещена из "${fromStatus}" в "${toStatus}"`,
            icon: 'compare_arrows',
            duration: 3000
        });
    }

    // Операции с TO-DO списком
    todoCompleted(todoText) {
        return this.show({
            type: 'success',
            title: 'Задача выполнена',
            message: `Задача "${todoText.substring(0, 30)}${todoText.length > 30 ? '...' : ''}" выполнена`,
            icon: 'task_alt',
            className: 'bounce'
        });
    }

    todoUncompleted(todoText) {
        return this.show({
            type: 'info',
            title: 'Задача возобновлена',
            message: `Задача "${todoText.substring(0, 30)}${todoText.length > 30 ? '...' : ''}" возобновлена`,
            icon: 'radio_button_unchecked'
        });
    }

    todoDeleted(todoText) {
        return this.show({
            type: 'info',
            title: 'TODO удален',
            message: `"${todoText.substring(0, 30)}${todoText.length > 30 ? '...' : ''}" удален`,
            icon: 'delete'
        });
    }

    // Очистить все toast'ы
    clear() {
        this.toasts.forEach((toast, id) => {
            this.hide(id);
        });
    }

    // Получить количество активных toast'ов
    getCount() {
        return this.toasts.size;
    }
}

// Создаем глобальный экземпляр
window.toast = new ToastNotifications();

// Экспортируем для использования в модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToastNotifications;
} 