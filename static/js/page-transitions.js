/* ===================== ПЛАВНЫЕ ПЕРЕХОДЫ МЕЖДУ СТРАНИЦАМИ ===================== */

// Функция для плавного перехода на другую страницу
function smoothNavigate(url, options = {}) {
    const {
        duration = 300,
        fadeOut = true,
        showLoading = true
    } = options;

    // Отключаем все сокеты перед переходом
    if (typeof disconnectAllSockets === 'function') {
        disconnectAllSockets();
    }

    // Показываем индикатор загрузки
    if (showLoading) {
        showPageLoader();
    }

    // Плавное исчезновение страницы
    if (fadeOut) {
        const mainContent = document.querySelector('main') || document.body;
        mainContent.classList.add('page-transition', 'fade-out');
    }

    // Переход на новую страницу
    setTimeout(() => {
        window.location.href = url;
    }, duration);
}

// Показ индикатора загрузки страницы
function showPageLoader() {
    // Если уже есть лоадер — не добавляем второй
    if (document.getElementById('page-loader')) return;

    // Создаем индикатор загрузки
    const loader = document.createElement('div');
    loader.id = 'page-loader';
    loader.className = 'page-loader';
    loader.innerHTML = `
        <div class="loader-content">
            <div class="page-loader-spinner"></div>
            <p>Загрузка...</p>
        </div>
    `;

    // Базовые стили для фона (остальное — в CSS)
    loader.style.position = 'fixed';
    loader.style.top = '0';
    loader.style.left = '0';
    loader.style.width = '100%';
    loader.style.height = '100%';
    loader.style.display = 'flex';
    loader.style.alignItems = 'center';
    loader.style.justifyContent = 'center';
    loader.style.zIndex = '9999';
    loader.style.opacity = '0';
    loader.style.transition = 'opacity 0.4s cubic-bezier(.4,1.4,.6,1)';
    loader.style.background = 'rgba(255,255,255,0.92)';
    loader.style.backdropFilter = 'blur(10px)';

    document.body.appendChild(loader);

    // Показываем с анимацией
    setTimeout(() => {
        loader.style.opacity = '1';
    }, 10);
}

// Скрытие индикатора загрузки
function hidePageLoader() {
    const loader = document.getElementById('page-loader');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.remove();
        }, 300);
    }
}

// Функция для плавного появления контента при загрузке страницы
function fadeInContent() {
    const mainContent = document.querySelector('main') || document.body;
    mainContent.classList.add('fade-in');
}

// Обработчик для кнопок навигации с плавными переходами
function initSmoothNavigation() {
    // Находим все кнопки навигации
    const navButtons = document.querySelectorAll('[data-smooth-nav]');

    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const url = btn.getAttribute('data-smooth-nav');
            if (url) {
                smoothNavigate(url);
            }
        });
    });

    // Обработчик для обычных ссылок с классом smooth-link
    const smoothLinks = document.querySelectorAll('.smooth-link');
    smoothLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const url = link.href;
            smoothNavigate(url);
        });
    });
}

// Функция для красивого отображения ошибок
function showError(message, duration = 5000) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification';
    errorDiv.innerHTML = `
        <div class="error-content">
            <span class="material-icons">error</span>
            <span>${message}</span>
        </div>
    `;

    // Стили для уведомления об ошибке
    errorDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ff4757;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 8px 25px rgba(255, 71, 87, 0.3);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 300px;
        font-weight: 500;
    `;

    const errorContent = errorDiv.querySelector('.error-content');
    errorContent.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
    `;

    document.body.appendChild(errorDiv);

    // Показываем с анимацией
    setTimeout(() => {
        errorDiv.style.transform = 'translateX(0)';
    }, 10);

    // Скрываем через указанное время
    setTimeout(() => {
        errorDiv.style.transform = 'translateX(400px)';
        setTimeout(() => {
            errorDiv.remove();
        }, 300);
    }, duration);
}

// Функция для красивого отображения успешных операций
function showSuccess(message, duration = 3000) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-notification';
    successDiv.innerHTML = `
        <div class="success-content">
            <span class="material-icons">check_circle</span>
            <span>${message}</span>
        </div>
    `;

    // Стили для уведомления об успехе
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #2ed573;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 8px 25px rgba(46, 213, 115, 0.3);
        z-index: 10000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 300px;
        font-weight: 500;
    `;

    const successContent = successDiv.querySelector('.success-content');
    successContent.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
    `;

    document.body.appendChild(successDiv);

    // Показываем с анимацией
    setTimeout(() => {
        successDiv.style.transform = 'translateX(0)';
    }, 10);

    // Скрываем через указанное время
    setTimeout(() => {
        successDiv.style.transform = 'translateX(400px)';
        setTimeout(() => {
            successDiv.remove();
        }, 300);
    }, duration);
}

// Функция для плавного обновления контента без перезагрузки страницы
function smoothUpdateContent(container, newContent) {
    const element = typeof container === 'string' ? document.querySelector(container) : container;
    if (!element) return;

    // Плавное исчезновение
    element.style.opacity = '0';
    element.style.transform = 'translateY(-20px)';

    setTimeout(() => {
        // Обновляем контент
        element.innerHTML = newContent;

        // Плавное появление
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    }, 300);
}

// Функция для красивого подтверждения действий
function confirmAction(message, onConfirm, onCancel) {
    const confirmDiv = document.createElement('div');
    confirmDiv.className = 'confirm-dialog';
    confirmDiv.innerHTML = `
        <div class="confirm-content">
            <div class="confirm-header">
                <span class="material-icons">help</span>
                <h3>Подтверждение</h3>
            </div>
            <div class="confirm-message">
                ${message}
            </div>
            <div class="confirm-buttons">
                <button class="btn btn-secondary cancel-btn">Отмена</button>
                <button class="btn btn-primary confirm-btn">Подтвердить</button>
            </div>
        </div>
    `;

    // Стили для диалога подтверждения
    confirmDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(5px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    `;

    const confirmContent = confirmDiv.querySelector('.confirm-content');
    confirmContent.style.cssText = `
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 400px;
        width: 90%;
        transform: scale(0.9);
        transition: transform 0.3s ease;
    `;

    const confirmHeader = confirmDiv.querySelector('.confirm-header');
    confirmHeader.style.cssText = `
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 20px;
        color: #333;
    `;

    const confirmMessage = confirmDiv.querySelector('.confirm-message');
    confirmMessage.style.cssText = `
        margin-bottom: 25px;
        color: #666;
        line-height: 1.5;
    `;

    const confirmButtons = confirmDiv.querySelector('.confirm-buttons');
    confirmButtons.style.cssText = `
        display: flex;
        gap: 10px;
        justify-content: flex-end;
    `;

    document.body.appendChild(confirmDiv);

    // Показываем с анимацией
    setTimeout(() => {
        confirmDiv.style.opacity = '1';
        confirmContent.style.transform = 'scale(1)';
    }, 10);

    // Обработчики кнопок
    const cancelBtn = confirmDiv.querySelector('.cancel-btn');
    const confirmBtn = confirmDiv.querySelector('.confirm-btn');

    cancelBtn.addEventListener('click', () => {
        hideConfirmDialog(confirmDiv);
        if (onCancel) onCancel();
    });

    confirmBtn.addEventListener('click', () => {
        hideConfirmDialog(confirmDiv);
        if (onConfirm) onConfirm();
    });

    // Закрытие по клику вне диалога
    confirmDiv.addEventListener('click', (e) => {
        if (e.target === confirmDiv) {
            hideConfirmDialog(confirmDiv);
            if (onCancel) onCancel();
        }
    });
}

// Скрытие диалога подтверждения
function hideConfirmDialog(dialog) {
    const content = dialog.querySelector('.confirm-content');
    content.style.transform = 'scale(0.9)';
    dialog.style.opacity = '0';

    setTimeout(() => {
        dialog.remove();
    }, 300);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    // Плавное появление контента
    fadeInContent();

    // Инициализация плавной навигации
    initSmoothNavigation();

    // Скрываем индикатор загрузки если он есть
    hidePageLoader();
});

// Экспортируем функции для использования в других файлах
window.smoothNavigate = smoothNavigate;
window.showPageLoader = showPageLoader;
window.hidePageLoader = hidePageLoader;
window.fadeInContent = fadeInContent;
window.showError = showError;
window.showSuccess = showSuccess;
window.smoothUpdateContent = smoothUpdateContent;
window.confirmAction = confirmAction; 