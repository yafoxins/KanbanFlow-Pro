/* ===================== УНИВЕРСАЛЬНЫЕ МОДАЛКИ ===================== */

// Используем глобальную функцию getHeaders

// Функция для безопасного отключения всех сокетов
function disconnectAllSockets() {
    // Отключаем основной сокет
    if (window.socket && typeof window.socket.disconnect === 'function') {
        try {
            window.socket.disconnect();
        } catch (e) {
            console.log('[universal-modals] Socket disconnect error:', e);
        }
        window.socket = null;
    }

    // Отключаем сокет уведомлений если есть
    if (window.notificationsSocket && typeof window.notificationsSocket.disconnect === 'function') {
        try {
            window.notificationsSocket.disconnect();
        } catch (e) {
            console.log('[universal-modals] Notifications socket disconnect error:', e);
        }
        window.notificationsSocket = null;
    }

    // Отключаем глобальный сокет если есть
    if (window.globalSocket && typeof window.globalSocket.disconnect === 'function') {
        try {
            window.globalSocket.disconnect();
        } catch (e) {
            console.log('[universal-modals] Global socket disconnect error:', e);
        }
        window.globalSocket = null;
    }
}

// ========== МОДАЛКА ПРОФИЛЯ ==========
// Функции showProfileModal и closeProfileModal экспортируются из profile.js

// ========== МОДАЛКА СМЕНЫ ПАРОЛЯ ==========
function showChangePasswordModal() {
    const modal = document.getElementById('universal-change-password-modal');
    if (modal) {
        modal.classList.add('show');
        // Очищаем форму и ошибки
        const form = document.getElementById('universal-change-password-form');
        const error = document.getElementById('universal-change-password-error');
        if (form) form.reset();
        if (error) error.innerText = '';
    }
}

function closeChangePasswordModal() {
    const modal = document.getElementById('universal-change-password-modal');
    if (modal) {
        modal.classList.remove('show');
        // Очищаем форму и ошибки
        const form = document.getElementById('universal-change-password-form');
        const error = document.getElementById('universal-change-password-error');
        if (form) form.reset();
        if (error) error.innerText = '';
    }
}

// ========== МОДАЛКА "О ПРОЕКТЕ" ==========
function showAboutModal() {
    const modal = document.getElementById('universal-about-modal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeAboutModal() {
    const modal = document.getElementById('universal-about-modal');
    if (modal) {
        modal.classList.remove('show');
    }
}

// ========== УНИВЕРСАЛЬНЫЕ ОБРАБОТЧИКИ ==========

// Инициализация обработчиков модалок
function initUniversalModalHandlers() {
    // Обработчики кнопок в dropdown меню
    const profileBtn = document.getElementById('profile-btn');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const aboutBtn = document.getElementById('about-btn');
    const logoutBtn = document.getElementById('logout-btn');

    if (profileBtn) {
        profileBtn.onclick = () => {
            const userDropdown = document.getElementById('user-dropdown');
            if (userDropdown) userDropdown.classList.remove('open');
            if (typeof window.showProfileModal === 'function') {
                window.showProfileModal();
                // После открытия профиля обновляем Telegram-статус через telegram-link.js
                if (typeof window.updateTelegramOnProfileOpen === 'function') {
                    setTimeout(() => {
                        window.updateTelegramOnProfileOpen();
                    }, 200);
                }
            }
        };
    }

    if (changePasswordBtn) {
        changePasswordBtn.onclick = () => {
            const userDropdown = document.getElementById('user-dropdown');
            if (userDropdown) userDropdown.classList.remove('open');
            showChangePasswordModal();
        };
    }

    if (aboutBtn) {
        aboutBtn.onclick = () => {
            const userDropdown = document.getElementById('user-dropdown');
            if (userDropdown) userDropdown.classList.remove('open');
            showAboutModal();
        };
    }

    if (logoutBtn) {
        logoutBtn.onclick = () => {
            const userDropdown = document.getElementById('user-dropdown');
            if (userDropdown) userDropdown.classList.remove('open');

            if (typeof smoothNavigate === 'function') {
                smoothNavigate(`/${window.USERNAME}/logout`);
            } else {
                disconnectAllSockets();
                window.location.href = `/${window.USERNAME}/logout`;
            }
        };
    }

    // Обработчики закрытия модалок
    const closeButtons = [
        'close-universal-profile-modal-btn',
        'close-universal-change-password-modal-btn',
        'close-universal-about-modal-btn',
        'universal-cancel-change-password-btn'
    ];

    closeButtons.forEach(btnId => {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.onclick = (e) => {
                e.preventDefault();
                const modal = btn.closest('.modal');
                if (modal) {
                    modal.classList.remove('show');
                }
            };
        }
    });

    // Закрытие модалок по клику вне их области
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });

    // Закрытие модалок по Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                openModal.classList.remove('show');
            }
        }
    });

    // Универсальный обработчик для всех кнопок с классом modal-close
    document.addEventListener('click', (e) => {
        if (e.target.closest('.modal-close')) {
            e.preventDefault();
            const modal = e.target.closest('.modal');
            if (modal) {
                modal.classList.remove('show');
            }
        }
    });
}

// Инициализация формы смены пароля
function initChangePasswordForm() {
    const form = document.getElementById('universal-change-password-form');
    if (!form) return;

    form.onsubmit = async function (e) {
        e.preventDefault();

        const oldPassword = document.getElementById('old_password').value;
        const newPassword = document.getElementById('new_password').value;
        const newPassword2 = document.getElementById('new_password2').value;
        const errorEl = document.getElementById('universal-change-password-error');

        // Валидация
        if (!oldPassword || !newPassword || !newPassword2) {
            errorEl.innerText = 'Все поля обязательны для заполнения';
            return;
        }

        if (newPassword !== newPassword2) {
            errorEl.innerText = 'Новые пароли не совпадают';
            return;
        }

        if (newPassword.length < 6) {
            errorEl.innerText = 'Новый пароль должен содержать минимум 6 символов';
            return;
        }

        try {
            const response = await fetch(`/${window.USERNAME}/api/change_password`, {
                method: 'POST',
                headers: window.getHeaders(),
                body: JSON.stringify({
                    old_password: oldPassword,
                    new_password: newPassword
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                closeChangePasswordModal();
                if (window.toast) {
                    window.toast.passwordChanged();
                } else {
                    alert('Пароль успешно изменен!');
                }
            } else {
                errorEl.innerText = data.error || 'Ошибка смены пароля';
            }
        } catch (error) {
            errorEl.innerText = 'Ошибка сети';
        }
    };
}

// Инициализация user dropdown
function initUserDropdown() {
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userDropdown = document.getElementById('user-dropdown');

    if (userMenuBtn && userDropdown) {
        userMenuBtn.onclick = function (e) {
            e.stopPropagation();
            userDropdown.classList.toggle('open');
        };

        document.body.addEventListener('click', function () {
            userDropdown.classList.remove('open');
        });

        userDropdown.onclick = function (e) {
            e.stopPropagation();
        };
    }
}

// Экспорт функций для использования в других файлах
// showProfileModal и closeProfileModal экспортируются из profile.js
window.showChangePasswordModal = showChangePasswordModal;
window.closeChangePasswordModal = closeChangePasswordModal;
window.showAboutModal = showAboutModal;
window.closeAboutModal = closeAboutModal;
window.disconnectAllSockets = disconnectAllSockets;
window.getHeaders = window.getHeaders;
window.initUniversalModalHandlers = initUniversalModalHandlers;
window.initChangePasswordForm = initChangePasswordForm;
window.initUserDropdown = initUserDropdown;

// Автоматическая инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function () {
    initUniversalModalHandlers();
    initChangePasswordForm();
    initUserDropdown();
}); 