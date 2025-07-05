// Универсальное определение USERNAME
window.USERNAME = window.USERNAME || document.body.getAttribute('data-username');
// Используем глобальную функцию getHeaders

// Управление Telegram привязкой
class TelegramLink {
    constructor() {
        // Не вызываем checkTelegramStatus() автоматически в конструкторе
        // Это будет вызвано отдельно при необходимости
        this.lastStatus = null; // Сохраняем последний статус для предотвращения ненужных обновлений
    }

    isEditMode() {
        const modal = document.getElementById('universal-profile-modal');
        return modal && modal.classList.contains('profile-editing');
    }

    getControlsElement() {
        // В зависимости от режима возвращаем нужный контейнер
        if (this.isEditMode()) {
            return document.getElementById('universal-telegram-controls-edit');
        } else {
            return document.getElementById('universal-telegram-controls');
        }
    }

    getStatusElement() {
        return document.getElementById('universal-profile-telegram-status') || document.getElementById('universal-profile-telegram');
    }

    async checkTelegramStatus() {
        try {
            const username = window.USERNAME || document.body.getAttribute('data-username');
            const response = await fetch(`/${username}/api/telegram/status`, {
                headers: window.getHeaders()
            });
            if (response.ok) {
                const data = await response.json();

                // Проверяем, был ли статус изменен с "не привязан" на "привязан"
                const wasUnlinked = this.lastStatus && this.lastStatus.startsWith('false-');
                const isNowLinked = data.is_linked;

                // Обновляем UI
                this.updateTelegramUI(data);

                // Обновляем telegram_id в памяти профиля, если он есть
                if (data.telegram_id && window.profileData && window.profileData.lastProfileData) {
                    window.profileData.lastProfileData.telegram_id = data.telegram_id;

                    // Также обновляем input поле
                    const telegramInput = document.getElementById('universal-profile-telegram-input');
                    if (telegramInput) {
                        telegramInput.value = data.telegram_id;
                    }
                }

                // Показываем уведомление если статус изменился на "привязан"
                if (wasUnlinked && isNowLinked && window.toast) {
                    setTimeout(() => {
                        window.toast.telegramLinked();
                    }, 100);
                }
            }
        } catch (error) {
            console.error('Ошибка проверки статуса Telegram:', error);
        }
    }

    updateTelegramUI(status) {
        const statusElement = this.getStatusElement();
        const controlsElement = this.getControlsElement();
        if (!statusElement) return;

        // Создаем уникальный ключ для текущего состояния
        const currentStatusKey = `${status.is_linked}-${status.telegram_username || ''}-${this.isEditMode()}-${controlsElement ? 'controls' : 'no-controls'}`;

        // Проверяем, изменился ли статус - если нет, то не обновляем UI
        if (this.lastStatus === currentStatusKey) {
            return; // Статус не изменился, избегаем ненужных обновлений
        }

        // Сохраняем новый статус
        this.lastStatus = currentStatusKey;

        // Удаляем скелетон, если он есть
        const skeleton = statusElement.querySelector('.telegram-status-skeleton');
        if (skeleton) skeleton.remove();

        // --- Новый способ: если .telegram-status-text уже есть, обновляем только содержимое ---
        let statusTextBlock = statusElement.querySelector('.telegram-status-text');
        let isFirst = false;
        if (!statusTextBlock) {
            statusTextBlock = document.createElement('span');
            statusTextBlock.className = 'telegram-status-text';
            statusTextBlock.style.opacity = '0';
            isFirst = true;
            statusElement.innerHTML = '';
            statusElement.appendChild(statusTextBlock);
        }
        // Формируем содержимое
        if (status.is_linked) {
            let usernameHtml = '';
            if (status.telegram_username) {
                usernameHtml = `<a href='https://t.me/${status.telegram_username}' target='_blank' class='telegram-username'>@${status.telegram_username}</a>`;
            }
            statusTextBlock.innerHTML = `<span class=\"material-icons telegram-link-icon\">check_circle</span>Привязан${usernameHtml}`;
            statusTextBlock.classList.add('telegram-linked-row');
            statusTextBlock.classList.remove('telegram-unlinked-row');
            // Обновляем input, если есть telegram_id
            const telegramInput = document.getElementById('universal-profile-telegram-input');
            if (telegramInput && status.telegram_id) telegramInput.value = status.telegram_id;
        } else {
            statusTextBlock.innerHTML = `<span class=\"material-icons telegram-link-icon not-linked\">link_off</span>Не привязан`;
            statusTextBlock.classList.add('telegram-unlinked-row');
            statusTextBlock.classList.remove('telegram-linked-row');
        }
        // Плавное появление только при первом рендере
        if (isFirst) {
            requestAnimationFrame(() => {
                statusTextBlock.style.opacity = '1';
            });
        } else {
            statusTextBlock.style.opacity = '1';
        }

        // Управляем кнопками в зависимости от режима
        if (controlsElement) {
            if (this.isEditMode()) {
                controlsElement.style.display = 'flex';
                if (status.is_linked) {
                    controlsElement.innerHTML = `
                        <button type="button" class="btn btn-danger btn-sm telegram-unlink-btn" id="telegram-unlink-btn">
                            <span class="material-icons">link_off</span>
                            Отвязать Telegram
                        </button>
                    `;
                    setTimeout(() => {
                        const unlinkBtn = document.getElementById('telegram-unlink-btn');
                        if (unlinkBtn) unlinkBtn.onclick = () => this.unlinkTelegram();
                    }, 0);
                } else {
                    controlsElement.innerHTML = `
                        <button type="button" class="btn btn-primary btn-sm telegram-link-btn" id="telegram-link-btn">
                            <span class="material-icons">telegram</span>
                            Привязать Telegram
                        </button>
                    `;
                    setTimeout(() => {
                        const linkBtn = document.getElementById('telegram-link-btn');
                        if (linkBtn) linkBtn.onclick = () => this.generateTokenAndOpenBot();
                    }, 0);
                }
            } else {
                // В режиме просмотра скрываем кнопки
                controlsElement.style.display = 'none';
            }
        }
    }

    async generateTokenAndOpenBot() {
        try {
            const username = window.USERNAME || document.body.getAttribute('data-username');
            const response = await fetch(`/${username}/api/telegram/generate_link_token`, {
                method: 'POST',
                headers: window.getHeaders()
            });
            if (response.ok) {
                const data = await response.json();
                if (data.bot_link) {
                    window.open(data.bot_link, '_blank');

                    // Показываем уведомление пользователю
                    if (window.toast) {
                        window.toast.info("Telegram", "Перейдите в бот и нажмите /start для привязки аккаунта");
                    }

                    // Начинаем более частую проверку статуса после открытия бота
                    this.startFastPollingAfterBotOpen();
                } else {
                    this.showNotification('error', 'Ошибка генерации ссылки для Telegram');
                }
            } else {
                const error = await response.json();
                this.showNotification('error', error.error || 'Ошибка генерации токена');
            }
        } catch (error) {
            this.showNotification('error', 'Ошибка сети');
        }
    }

    // Быстрая проверка статуса после открытия бота
    startFastPollingAfterBotOpen() {
        let attempts = 0;
        const maxAttempts = 20; // Проверяем 20 раз по 3 секунды = 1 минута

        const fastPoll = setInterval(() => {
            attempts++;
            this.forceRefresh();

            if (attempts >= maxAttempts) {
                clearInterval(fastPoll);
            }
        }, 3000); // Каждые 3 секунды
    }

    // Обработка успешной привязки
    onTelegramLinked(telegramData) {
        // Обновляем данные профиля
        if (window.profileData && window.profileData.lastProfileData) {
            window.profileData.lastProfileData.telegram_id = telegramData.telegram_id;
            window.profileData.lastProfileData.telegram_username = telegramData.telegram_username;
        }
        // Обновляем input
        const telegramInput = document.getElementById('universal-profile-telegram-input');
        if (telegramInput) telegramInput.value = telegramData.telegram_id || '';

        // Принудительно обновляем UI
        this.forceRefresh();

        // Показываем уведомление
        if (window.toast) {
            window.toast.telegramLinked();
        }
    }

    async unlinkTelegram() {
        if (!confirm('Вы уверены, что хотите отвязать Telegram?')) return;
        try {
            const username = window.USERNAME || document.body.getAttribute('data-username');
            const response = await fetch(`/${username}/api/update_profile`, {
                method: 'POST',
                headers: window.getHeaders(),
                body: JSON.stringify({
                    email: window.profileData.lastProfileData.email,
                    country: window.profileData.lastProfileData.country,
                    fullname: window.profileData.lastProfileData.fullname,
                    telegram_id: ''
                })
            });
            if (response.ok) {
                window.profileData.lastProfileData.telegram_id = '';
                // Очищаем input, если он есть
                const telegramInput = document.getElementById('universal-profile-telegram-input');
                if (telegramInput) telegramInput.value = '';
                this.forceRefresh(); // Принудительно обновляем статус
                // Показываем toast уведомление
                if (window.toast) {
                    window.toast.telegramUnlinked();
                }
            } else {
                const error = await response.json();
                this.showNotification('error', error.error || 'Ошибка отвязки');
            }
        } catch (error) {
            this.showNotification('error', 'Ошибка сети');
        }
    }

    showNotification(type, message) {
        if (window.toast) {
            if (type === 'success') {
                window.toast.telegramLinked();
            } else if (type === 'error') {
                window.toast.error("Telegram", message);
            }
        } else {
            alert(message);
        }
    }

    startPolling() {
        // Разумный интервал polling - 10 секунд
        setInterval(() => {
            this.checkTelegramStatus();
        }, 10000);
    }

    // Принудительное обновление статуса (например, после привязки)
    forceRefresh() {
        // Сохраняем предыдущий статус для определения изменений
        const previousStatus = this.lastStatus;
        this.lastStatus = null; // Сбрасываем кэш статуса

        // Проверяем статус заново
        this.checkTelegramStatus();
    }
}

let telegramLink = null;

// Функция для получения или создания единственного экземпляра
function getTelegramLink() {
    if (!telegramLink) {
        telegramLink = new TelegramLink();
    }
    return telegramLink;
}

document.addEventListener('DOMContentLoaded', function () {
    if (document.getElementById('universal-telegram-controls') || document.getElementById('universal-telegram-controls-edit')) {
        telegramLink = getTelegramLink();
        // Делаем первичную проверку статуса только один раз при загрузке страницы
        telegramLink.checkTelegramStatus();
        telegramLink.startPolling();
    }
});

// Защита от частых повторных вызовов
let lastTelegramUpdate = 0;
function updateTelegramOnProfileOpen() {
    // Ограничиваем частоту обновлений до одного раза в 500мс
    const now = Date.now();
    if (now - lastTelegramUpdate < 500) {
        return; // Игнорируем слишком частые вызовы
    }
    lastTelegramUpdate = now;

    // Обновляем статус без пересоздания экземпляра
    if (document.getElementById('universal-telegram-controls') || document.getElementById('universal-telegram-controls-edit')) {
        const link = getTelegramLink();
        // Просто обновляем статус без мерцания, только если есть элементы
        if (link.getStatusElement()) {
            link.checkTelegramStatus();
        }
    }
}

// Функция для принудительного обновления (без защиты от частых вызовов)
function forceTelegramRefresh() {
    if (document.getElementById('universal-telegram-controls') || document.getElementById('universal-telegram-controls-edit')) {
        const link = getTelegramLink();
        link.forceRefresh();
    }
}

// Глобальная функция для обновления после действий с ботом
window.refreshTelegramAfterBotAction = function () {
    forceTelegramRefresh();
    if (window.toast) {
        window.toast.telegramLinked();
    }
};

// Toast-уведомление
function showTelegramToast(message, type = 'success') {
    let toast = document.getElementById('telegram-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'telegram-toast';
        toast.style.position = 'fixed';
        toast.style.bottom = '32px';
        toast.style.left = '50%';
        toast.style.transform = 'translateX(-50%)';
        toast.style.zIndex = '9999';
        toast.style.minWidth = '220px';
        toast.style.maxWidth = '90vw';
        toast.style.padding = '16px 32px';
        toast.style.borderRadius = '14px';
        toast.style.fontSize = '1.08em';
        toast.style.fontWeight = '600';
        toast.style.boxShadow = '0 4px 24px #5271ff22, 0 1.5px 8px #0001';
        toast.style.textAlign = 'center';
        toast.style.transition = 'opacity 0.3s';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.background = type === 'success' ? '#e8fff3' : '#fff0f0';
    toast.style.color = type === 'success' ? '#10b981' : '#ef4444';
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2600);
}

// Функция для обновления Telegram-статуса в профиле
async function refreshTelegramStatus() {
    try {
        const resp = await fetch(`/${USERNAME}/api/telegram/status`, { headers: { 'X-CSRF-Token': (window.CSRF_TOKEN || '') } });
        const data = await resp.json();
        if (telegramLink) {
            telegramLink.updateTelegramUI(data);
        }
    } catch (e) {
        showTelegramToast('Ошибка обновления Telegram-статуса', 'error');
    }
}

// После успешной привязки Telegram — обновляем статус мгновенно и показываем toast
if (telegramLink) {
    const origOnSuccess = telegramLink.onSuccess;
    telegramLink.onSuccess = function (status) {
        if (typeof origOnSuccess === 'function') origOnSuccess.call(this, status);
        refreshTelegramStatus();
        showTelegramToast('Telegram успешно привязан!', 'success');
    };
}

// Слушатель удален - Telegram обновляется через updateTelegramOnProfileOpen() в profile.js

// Глобальная функция для уведомления об успешной привязке из бота
window.onTelegramBotLinked = function (telegramData) {
    const link = getTelegramLink();
    if (link) {
        link.onTelegramLinked(telegramData);
    }
};

// Периодическая проверка обновлений от бота (например, через localStorage)
function checkForBotUpdates() {
    // Проверяем, есть ли флаг об обновлении от бота
    const botUpdate = localStorage.getItem('telegram_bot_update');
    if (botUpdate) {
        try {
            const updateData = JSON.parse(botUpdate);
            if (updateData.action === 'linked') {
                window.onTelegramBotLinked(updateData.data);
            }
            localStorage.removeItem('telegram_bot_update');
        } catch (e) {
            console.warn('Ошибка парсинга обновления от бота:', e);
            localStorage.removeItem('telegram_bot_update');
        }
    }
}

// Запускаем проверку обновлений от бота каждые 2 секунды
setInterval(checkForBotUpdates, 2000);

// Обновляем статус при фокусе на окно (пользователь вернулся после работы с ботом)
let lastFocusUpdate = 0;
window.addEventListener('focus', function () {
    const now = Date.now();
    // Ограничиваем обновления при фокусе до одного раза в 3 секунды
    if (now - lastFocusUpdate < 3000) {
        return;
    }
    lastFocusUpdate = now;

    setTimeout(() => {
        // Используем обычную проверку вместо принудительной
        updateTelegramOnProfileOpen();
    }, 1000);
}); 