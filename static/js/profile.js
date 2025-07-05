/**
 * Универсальная логика профиля для всех страниц
 * Используется в team_board.html, kanban.html, todo.html
 */

(function () {
    'use strict';

    // Глобальные переменные профиля
    window.profileData = {
        lastProfileData: {
            email: '',
            country: '',
            fullname: '',
            telegram_id: ''
        }
    };

    const PROFILE_FIELDS = ['email', 'country', 'fullname', 'telegram_id'];

    // ========== Основные функции профиля ==========

    /**
     * Переключение режима редактирования профиля
     */
    function setProfileEditMode(on) {
        const profileModal = document.getElementById('universal-profile-modal');
        const profileInfo = document.getElementById('universal-profile-info-block');
        const editBtn = document.getElementById('universal-edit-profile-btn');
        const deleteBtn = document.getElementById('universal-delete-avatar-btn');

        // Используем CSS классы для переключения режимов
        if (profileModal) {
            if (on) {
                profileModal.classList.add('profile-editing');
            } else {
                profileModal.classList.remove('profile-editing');
            }
        }

        // Переключение полей
        PROFILE_FIELDS.forEach(fieldName => {
            const input = document.getElementById(`universal-profile-${fieldName}-input`);
            const display = document.getElementById(`universal-profile-${fieldName}`);
            const select = document.getElementById('universal-profile-country-select');

            if (fieldName === 'country' && select) {
                if (on) fillCountryOptions(select, select.value || '');
                select.disabled = !on;
                select.style.display = on ? 'block' : 'none';
                if (display) display.style.display = on ? 'none' : 'block';
                select.classList.toggle('active', on);
            } else if (input && display) {
                input.disabled = !on;
                input.style.display = on ? 'block' : 'none';
                display.style.display = on ? 'none' : 'block';
                input.classList.toggle('active', on);
            }
        });

        // Переключение кнопок
        const saveBtn = document.getElementById('universal-save-profile-btn');
        const cancelBtn = document.getElementById('universal-cancel-profile-btn');
        const profileForm = document.getElementById('universal-profile-form');

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

        // Обновляем Telegram статус при переключении режимов
        if (typeof updateTelegramOnProfileOpen === 'function') {
            setTimeout(() => {
                updateTelegramOnProfileOpen();
            }, 50);
        }
    }

    /**
     * Сброс полей редактирования к исходным данным
     */
    function resetProfileEditFields(data) {
        PROFILE_FIELDS.forEach(fieldName => {
            const input = document.getElementById(`universal-profile-${fieldName}-input`);
            const display = document.getElementById(`universal-profile-${fieldName}`);
            const select = document.getElementById('universal-profile-country-select');

            if (fieldName === 'country' && select) {
                if (select) select.value = data[fieldName] || '';
                if (display) display.textContent = data[fieldName] || '';
            } else if (fieldName === 'telegram_id') {
                if (input) input.value = data[fieldName] || '';
                // Отображение telegram статуса обрабатывается через telegram-link.js
            } else {
                if (input) input.value = data[fieldName] || '';
                if (display) display.textContent = data[fieldName] || '';
            }
        });
    }

    /**
     * Обновление аватарки в профиле
     */
    function updateProfileAvatar(avatarUrl) {
        const avatarImg = document.getElementById("universal-profile-avatar-img");
        const avatarInitial = document.getElementById("universal-profile-avatar-initial");
        const deleteBtn = document.getElementById("universal-delete-avatar-btn");
        const avatarContainer = document.getElementById("universal-profile-avatar-container");

        if (!avatarImg || !avatarInitial) return;

        if (avatarUrl && avatarUrl.trim() !== '') {
            // ЕСТЬ АВАТАРКА - показываем картинку, максимально надежно скрываем span
            avatarImg.src = avatarUrl;
            avatarImg.style.display = "block";
            avatarImg.style.visibility = "visible";
            avatarImg.style.opacity = "1";
            avatarImg.style.position = "relative";
            avatarImg.style.left = "auto";

            // ТРОЙНАЯ ЗАЩИТА - полностью скрываем span с инициалами
            avatarInitial.style.display = "none";
            avatarInitial.style.visibility = "hidden";
            avatarInitial.style.opacity = "0";
            avatarInitial.style.position = "absolute";
            avatarInitial.style.left = "-9999px";
            avatarInitial.style.zIndex = "-1";

            // Дополнительные классы для CSS
            avatarInitial.classList.add('hidden-avatar');
            avatarInitial.setAttribute('data-hidden', 'true');

            // Добавляем CSS классы к контейнеру
            if (avatarContainer) {
                avatarContainer.classList.add('has-image');
                avatarContainer.classList.remove('no-image');
                avatarContainer.setAttribute('data-has-avatar', 'true');
            }

            if (deleteBtn) {
                deleteBtn.style.display = "inline-flex";
                deleteBtn.classList.add('has-avatar');
                deleteBtn.dataset.hasAvatar = 'true';
            }
        } else {
            // НЕТ АВАТАРКИ - скрываем картинку, показываем span с инициалами
            avatarImg.style.display = "none";
            avatarImg.style.visibility = "hidden";
            avatarImg.style.opacity = "0";
            avatarImg.style.position = "absolute";
            avatarImg.style.left = "-9999px";
            avatarImg.src = "";

            // Показываем span с инициалами
            avatarInitial.style.display = "block";
            avatarInitial.style.visibility = "visible";
            avatarInitial.style.opacity = "1";
            avatarInitial.style.position = "relative";
            avatarInitial.style.left = "auto";
            avatarInitial.style.zIndex = "auto";

            // Убираем дополнительные классы
            avatarInitial.classList.remove('hidden-avatar');
            avatarInitial.removeAttribute('data-hidden');

            // Добавляем CSS классы к контейнеру
            if (avatarContainer) {
                avatarContainer.classList.add('no-image');
                avatarContainer.classList.remove('has-image');
                avatarContainer.setAttribute('data-has-avatar', 'false');
            }

            if (deleteBtn) {
                deleteBtn.style.display = "none";
                deleteBtn.classList.remove('has-avatar');
                deleteBtn.dataset.hasAvatar = 'false';
            }
        }
    }

    /**
     * Обновление аватарки в topbar
     */
    function updateTopbarAvatar(avatarUrl) {
        const userMenuBtn = document.getElementById("user-menu-btn");
        if (userMenuBtn) {
            const avatarSpan = userMenuBtn.querySelector(".material-icons");
            let avatarImg = userMenuBtn.querySelector(".user-avatar-img");

            if (avatarUrl && avatarUrl.trim() !== '') {
                // ЕСТЬ АВАТАРКА - показываем картинку, максимально надежно скрываем иконку
                if (!avatarImg) {
                    avatarImg = document.createElement("img");
                    avatarImg.className = "user-avatar-img";
                    avatarImg.style.cssText = "width: 28px; height: 28px; border-radius: 50%; object-fit: cover; margin-right: 8px;";
                    userMenuBtn.insertBefore(avatarImg, avatarSpan);
                }
                avatarImg.src = avatarUrl;
                avatarImg.style.display = "block";
                avatarImg.style.visibility = "visible";
                avatarImg.style.opacity = "1";
                avatarImg.style.position = "relative";
                avatarImg.style.left = "auto";

                // ТРОЙНАЯ ЗАЩИТА - полностью скрываем иконку
                if (avatarSpan) {
                    avatarSpan.style.display = "none";
                    avatarSpan.style.visibility = "hidden";
                    avatarSpan.style.opacity = "0";
                    avatarSpan.style.position = "absolute";
                    avatarSpan.style.left = "-9999px";
                    avatarSpan.style.zIndex = "-1";
                    avatarSpan.classList.add('hidden-icon');
                    avatarSpan.setAttribute('data-hidden', 'true');
                }
            } else {
                // НЕТ АВАТАРКИ - скрываем картинку, показываем иконку
                if (avatarImg) {
                    avatarImg.style.display = "none";
                    avatarImg.style.visibility = "hidden";
                    avatarImg.style.opacity = "0";
                    avatarImg.style.position = "absolute";
                    avatarImg.style.left = "-9999px";
                    avatarImg.src = "";
                }

                if (avatarSpan) {
                    avatarSpan.style.display = "inline-block";
                    avatarSpan.style.visibility = "visible";
                    avatarSpan.style.opacity = "1";
                    avatarSpan.style.position = "relative";
                    avatarSpan.style.left = "auto";
                    avatarSpan.style.zIndex = "auto";
                    avatarSpan.classList.remove('hidden-icon');
                    avatarSpan.removeAttribute('data-hidden');
                }
            }
        }
    }

    /**
     * Заполнение селектора стран
     */
    function fillCountryOptions(select, selectedValue) {
        if (!window.COUNTRIES) return;
        select.innerHTML = '<option value="">Выберите страну</option>';
        window.COUNTRIES.forEach(country => {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = country;
            if (country === selectedValue) {
                option.selected = true;
            }
            select.appendChild(option);
        });
    }

    /**
     * Инициализация селектора стран
     */
    function initializeCountrySelect() {
        const countrySelect = document.getElementById('universal-profile-country-select');
        if (countrySelect && window.COUNTRIES) {
            fillCountryOptions(countrySelect, countrySelect.value || '');
        }
    }

    /**
     * Открытие модалки профиля
     */
    function showProfileModal() {
        const profileModal = document.getElementById('universal-profile-modal');
        if (profileModal) profileModal.classList.add('show');
        setTimeout(initializeCountrySelect, 100);

        // Обновляем аватарку в модалке при открытии
        if (window.USER_AVATAR_URL && window.USER_AVATAR_URL.trim() !== '') {
            updateProfileAvatar(window.USER_AVATAR_URL);
        }

        // Обновляем статус Telegram при открытии через telegram-link.js
        if (typeof window.updateTelegramOnProfileOpen === 'function') {
            setTimeout(() => {
                window.updateTelegramOnProfileOpen();
            }, 200);
        }
    }

    /**
     * Закрытие модалки профиля
     */
    function closeProfileModal() {
        const profileModal = document.getElementById("universal-profile-modal");
        if (profileModal) {
            profileModal.classList.remove("show");
        }
    }

    /**
     * Загрузка данных профиля
     */
    async function loadProfile() {
        const USERNAME = window.USERNAME || document.body.getAttribute('data-username');
        if (!USERNAME) return null;

        try {
            const response = await fetch(`/api/profile/${USERNAME}`, {
                headers: window.getHeaders ? window.getHeaders() : {}
            });
            const data = await response.json();

            // Заполняем username
            const usernameEl = document.getElementById("universal-profile-username");
            if (usernameEl) usernameEl.innerHTML = `<span>${data.username || ""}</span>`;

            // Обновляем глобальные данные профиля
            // Сохраняем telegram_id только если он есть в данных с сервера И не null, иначе оставляем текущий
            const telegramId = (data.telegram_id && data.telegram_id !== null) ? data.telegram_id : (window.profileData.lastProfileData.telegram_id || '');

            window.profileData.lastProfileData = {
                email: data.email || '',
                country: data.country || '',
                fullname: data.fullname || '',
                telegram_id: telegramId
            };

            // Заполняем поля отображения
            const emailEl = document.getElementById("universal-profile-email");
            const countryEl = document.getElementById("universal-profile-country");
            const fullnameEl = document.getElementById("universal-profile-fullname");
            // Не заполняем Telegram напрямую - это сделает telegram-link.js
            // const telegramEl = document.getElementById("profile-telegram");

            if (emailEl) emailEl.textContent = data.email || '';
            if (countryEl) countryEl.textContent = data.country || '';
            if (fullnameEl) fullnameEl.textContent = data.fullname || '';
            // Telegram заполняется через telegram-link.js

            // Заполняем поля ввода
            const emailInput = document.getElementById("universal-profile-email-input");
            const countrySelect = document.getElementById("universal-profile-country-select");
            const fullnameInput = document.getElementById("universal-profile-fullname-input");
            const telegramInput = document.getElementById("universal-profile-telegram-input");

            if (emailInput) emailInput.value = data.email || '';
            if (countrySelect) countrySelect.value = data.country || '';
            if (fullnameInput) fullnameInput.value = data.fullname || '';
            if (telegramInput) telegramInput.value = data.telegram_id || '';

            // Обновляем аватарки
            updateProfileAvatar(data.avatar_url);
            updateTopbarAvatar(data.avatar_url);

            return data;
        } catch (error) {
            return null;
        }
    }

    /**
     * Сохранение профиля
     */
    async function saveProfile() {
        const USERNAME = window.USERNAME || document.body.getAttribute('data-username');
        if (!USERNAME) return false;

        const email = document.getElementById('universal-profile-email-input')?.value?.trim() || '';
        const country = document.getElementById('universal-profile-country-select')?.value?.trim() || '';
        const fullname = document.getElementById('universal-profile-fullname-input')?.value?.trim() || '';
        // telegram_id больше не отправляем при сохранении профиля!
        // const telegram_id = document.getElementById('universal-profile-telegram-input')?.value?.trim() || '';

        // Валидация email
        const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (!emailPattern.test(email)) {
            throw new Error('Введите корректный e-mail');
        }

        try {
            const requestBody = { email, country, fullname };

            const response = await fetch(`/${USERNAME}/api/update_profile`, {
                method: 'POST',
                headers: window.getHeaders ? window.getHeaders() : { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Обновляем отображаемые значения
                const emailEl = document.getElementById('universal-profile-email');
                const countryEl = document.getElementById('universal-profile-country');
                const fullnameEl = document.getElementById('universal-profile-fullname');
                // Telegram обновляется через telegram-link.js

                if (emailEl) emailEl.textContent = email;
                if (countryEl) countryEl.textContent = country;
                if (fullnameEl) fullnameEl.textContent = fullname;
                // Telegram заполняется через telegram-link.js

                // Показываем toast уведомление
                if (window.toast) {
                    window.toast.profileUpdated();
                }

                // Обновляем глобальные данные
                window.profileData.lastProfileData = {
                    email,
                    country,
                    fullname,
                    telegram_id: window.profileData.lastProfileData.telegram_id // сохраняем текущее значение telegram_id
                };

                // Telegram статус обновляется автоматически при необходимости

                return true;
            } else {
                throw new Error(data.error || 'Ошибка обновления профиля');
            }
        } catch (error) {
            throw error;
        }
    }

    // ========== Обработчики аватарки ==========

    /**
     * Инициализация обработчиков аватарки
     */
    function initAvatarHandlers() {
        // Обработчик загрузки аватарки
        const avatarUpload = document.getElementById("avatar-upload");
        if (avatarUpload) {
            avatarUpload.onchange = async function (e) {
                const file = e.target.files[0];
                if (!file) return;

                if (file.size > 5 * 1024 * 1024) {
                    if (window.toast) {
                        window.toast.avatarSizeError();
                    } else {
                        alert("Файл слишком большой. Максимальный размер: 5MB");
                    }
                    return;
                }

                const formData = new FormData();
                formData.append("avatar", file);

                try {
                    const USERNAME = window.USERNAME || document.body.getAttribute('data-username');
                    const response = await fetch(`/${USERNAME}/api/upload_avatar`, {
                        method: "POST",
                        headers: window.getHeaders ? window.getHeaders(null) : {},
                        body: formData,
                    });

                    const data = await response.json();

                    if (response.ok && data.success) {
                        updateProfileAvatar(data.avatar_url);
                        updateTopbarAvatar(data.avatar_url);

                        // Обновляем avatar_url в MEMBERS если есть
                        if (window.MEMBERS && Array.isArray(window.MEMBERS)) {
                            const me = window.MEMBERS.find(m => m.username === USERNAME);
                            if (me) me.avatar_url = data.avatar_url;
                        }

                        // Перерисовываем доску если есть функция
                        if (typeof window.renderBoard === 'function') {
                            window.renderBoard();
                        }

                        if (window.toast) {
                            window.toast.avatarUploaded();
                        }

                        // Сбрасываем значение input для возможности повторной загрузки
                        avatarUpload.value = '';
                    } else {
                        if (window.toast) {
                            window.toast.avatarUploadError(data.error);
                        } else {
                            alert(data.error || "Ошибка загрузки аватарки");
                        }
                    }
                } catch (error) {
                    if (window.toast) {
                        window.toast.avatarUploadError("Ошибка загрузки аватарки");
                    } else {
                        alert("Ошибка загрузки аватарки");
                    }
                } finally {
                    // Всегда сбрасываем значение input
                    avatarUpload.value = '';
                }
            };
        }

        // Обработчик удаления аватарки через модалку
        const deleteAvatarBtn = document.getElementById("universal-delete-avatar-btn");
        if (deleteAvatarBtn) {
            deleteAvatarBtn.onclick = function () {
                // Открываем модалку подтверждения
                const modal = document.getElementById('universal-confirm-delete-avatar-modal');
                const avatarImg = document.getElementById('confirm-delete-avatar-img');
                const userAvatarImg = document.getElementById('universal-profile-avatar-img');
                if (modal) {
                    // Показываем актуальную аватарку
                    if (avatarImg && userAvatarImg) {
                        avatarImg.src = userAvatarImg.src;
                    }
                    modal.classList.add('show');
                    // Очищаем ошибку
                    const err = document.getElementById('universal-delete-avatar-error');
                    if (err) err.innerText = '';
                }
            };
        }
        // Кнопка отмены
        const cancelDeleteAvatarBtn = document.getElementById('cancel-delete-avatar-btn');
        if (cancelDeleteAvatarBtn) {
            cancelDeleteAvatarBtn.onclick = function () {
                const modal = document.getElementById('universal-confirm-delete-avatar-modal');
                if (modal) modal.classList.remove('show');
            };
        }
        // Кнопка закрытия
        const closeDeleteAvatarModalBtn = document.getElementById('close-universal-confirm-delete-avatar-modal-btn');
        if (closeDeleteAvatarModalBtn) {
            closeDeleteAvatarModalBtn.onclick = function () {
                const modal = document.getElementById('universal-confirm-delete-avatar-modal');
                if (modal) modal.classList.remove('show');
            };
        }
        // Кнопка подтверждения удаления
        const confirmDeleteAvatarBtn = document.getElementById('confirm-delete-avatar-btn');
        if (confirmDeleteAvatarBtn) {
            confirmDeleteAvatarBtn.onclick = async function () {
                confirmDeleteAvatarBtn.disabled = true;
                const err = document.getElementById('universal-delete-avatar-error');
                if (err) err.innerText = '';
                try {
                    const USERNAME = window.USERNAME || document.body.getAttribute('data-username');
                    const response = await fetch(`/${USERNAME}/api/delete_avatar`, {
                        method: "POST",
                        headers: window.getHeaders ? window.getHeaders() : { 'Content-Type': 'application/json' },
                    });
                    const data = await response.json();
                    if (response.ok && data.success) {
                        updateProfileAvatar(null);
                        updateTopbarAvatar(null);
                        // Обновляем avatar_url в MEMBERS если есть
                        if (window.MEMBERS && Array.isArray(window.MEMBERS)) {
                            const me = window.MEMBERS.find(m => m.username === USERNAME);
                            if (me) me.avatar_url = null;
                        }
                        if (typeof window.renderBoard === 'function') {
                            window.renderBoard();
                        }
                        if (window.toast) {
                            window.toast.avatarDeleted();
                        }
                        // Закрываем модалку
                        const modal = document.getElementById('universal-confirm-delete-avatar-modal');
                        if (modal) modal.classList.remove('show');
                    } else {
                        if (window.toast) {
                            window.toast.avatarDeleteError(data.error);
                        }
                        if (err) err.innerText = data.error || 'Ошибка удаления аватарки';
                    }
                } catch (error) {
                    if (window.toast) {
                        window.toast.avatarDeleteError('Ошибка удаления аватарки');
                    }
                    if (err) err.innerText = 'Ошибка удаления аватарки';
                } finally {
                    confirmDeleteAvatarBtn.disabled = false;
                }
            };
        }
    }

    // ========== Инициализация обработчиков ==========

    /**
     * Инициализация всех обработчиков профиля
     */
    function initProfileHandlers() {
        // Кнопка открытия профиля
        const profileBtn = document.getElementById("profile-btn");
        if (profileBtn) {
            profileBtn.onclick = async function () {
                const userDropdown = document.getElementById("user-dropdown");
                if (userDropdown) userDropdown.classList.remove("open");

                // Загружаем профиль только если данных ещё нет
                if (!window.profileData.lastProfileData.email) {
                    const data = await loadProfile();
                    if (!data) return;
                } else {
                    // Если данные уже есть, просто заполняем поля из памяти
                    resetProfileEditFields(window.profileData.lastProfileData);
                }

                setProfileEditMode(false);
                showProfileModal();

                // Telegram обновится автоматически в showProfileModal()
            };
        }

        // Кнопка редактирования
        const editProfileBtn = document.getElementById('universal-edit-profile-btn');
        if (editProfileBtn) {
            editProfileBtn.onclick = function () {
                setProfileEditMode(true);
            };
        }

        // Кнопка отмены
        const cancelBtn = document.getElementById('universal-cancel-profile-btn');
        if (cancelBtn) {
            cancelBtn.onclick = function () {
                setProfileEditMode(false);
                resetProfileEditFields(window.profileData.lastProfileData || {});

                const errorDiv = document.getElementById('universal-profile-error');
                if (errorDiv) {
                    errorDiv.textContent = '';
                    errorDiv.className = 'profile-error';
                }
            };
        }

        // Форма сохранения
        const profileForm = document.getElementById('universal-profile-form');
        const saveBtn = document.getElementById('universal-save-profile-btn');

        if (profileForm && saveBtn) {
            profileForm.onsubmit = async function (e) {
                e.preventDefault();

                saveBtn.disabled = true;
                const errorDiv = document.getElementById('universal-profile-error');
                if (errorDiv) {
                    errorDiv.textContent = '';
                    errorDiv.className = 'profile-error';
                }

                try {
                    await saveProfile();
                    setProfileEditMode(false);
                } catch (error) {
                    // Показываем toast уведомление об ошибке
                    if (window.toast) {
                        window.toast.profileUpdateError(error.message);
                    } else if (errorDiv) {
                        errorDiv.textContent = error.message;
                        errorDiv.className = 'profile-error visible';
                    }
                } finally {
                    saveBtn.disabled = false;
                }
            };
        }

        // Инициализируем обработчики аватарки
        initAvatarHandlers();

        // Инициализируем селектор стран
        setTimeout(initializeCountrySelect, 100);

        // Инициализируем аватарку в профиле, если есть USER_AVATAR_URL
        if (window.USER_AVATAR_URL && window.USER_AVATAR_URL.trim() !== '') {
            updateProfileAvatar(window.USER_AVATAR_URL);
        }
    }

    // ========== Экспорт в глобальную область ==========

    // Экспортируем функции в window для обратной совместимости
    window.setProfileEditMode = setProfileEditMode;
    window.updateProfileAvatar = updateProfileAvatar;
    window.updateTopbarAvatar = updateTopbarAvatar;
    window.showProfileModal = showProfileModal;
    window.closeProfileModal = closeProfileModal;
    window.loadProfile = loadProfile;
    window.fillCountryOptions = fillCountryOptions;
    window.initializeCountrySelect = initializeCountrySelect;
    window.initAvatarHandlers = initAvatarHandlers;
    window.initProfileHandlers = initProfileHandlers;
    window.loadInitialAvatar = loadInitialAvatar;

    // Инициализация при загрузке DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            initProfileHandlers();
            // Загружаем аватарку при загрузке страницы
            setTimeout(loadInitialAvatar, 100);
        });
    } else {
        initProfileHandlers();
        // Загружаем аватарку при загрузке страницы
        setTimeout(loadInitialAvatar, 100);
    }

    // Функция загрузки аватарки при инициализации
    async function loadInitialAvatar() {
        // Сначала проверяем, есть ли уже USER_AVATAR_URL
        if (window.USER_AVATAR_URL && window.USER_AVATAR_URL.trim() !== '') {
            updateTopbarAvatar(window.USER_AVATAR_URL);
            updateProfileAvatar(window.USER_AVATAR_URL);
            return;
        }

        const USERNAME = window.USERNAME || document.body.getAttribute('data-username');
        if (!USERNAME) return;

        try {
            const response = await fetch(`/api/avatar/${USERNAME}`, {
                headers: window.getHeaders ? window.getHeaders() : {}
            });
            const data = await response.json();

            if (data.avatar_url) {
                updateTopbarAvatar(data.avatar_url);
                updateProfileAvatar(data.avatar_url);
            }
        } catch (error) {
        }
    }

    // ========== УНИВЕРСАЛЬНЫЕ ФУНКЦИИ ==========

    // Функция для безопасного отключения всех сокетов
    function disconnectAllSockets() {
        // Отключаем основной сокет
        if (window.socket && typeof window.socket.disconnect === 'function') {
            try {
                window.socket.disconnect();
            } catch (e) {
            }
            window.socket = null;
        }

        // Отключаем сокет уведомлений если есть
        if (window.notificationsSocket && typeof window.notificationsSocket.disconnect === 'function') {
            try {
                window.notificationsSocket.disconnect();
            } catch (e) {
            }
            window.notificationsSocket = null;
        }

        // Отключаем глобальный сокет если есть
        if (window.globalSocket && typeof window.globalSocket.disconnect === 'function') {
            try {
                window.globalSocket.disconnect();
            } catch (e) {
            }
            window.globalSocket = null;
        }
    }

    // Функция logout
    function initLogout() {
        const logoutBtn = document.getElementById('logout-btn');
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
                    headers: window.getHeaders ? window.getHeaders() : { 'Content-Type': 'application/json' },
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

    // Функции для работы с модалками
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

    // Инициализация обработчиков профиля (переименовано для избежания конфликтов)
    function initProfileUniversalHandlers() {
        // Обработчики кнопок в dropdown меню
        const profileBtn = document.getElementById('profile-btn');
        const changePasswordBtn = document.getElementById('change-password-btn');
        const aboutBtn = document.getElementById('about-btn');

        if (profileBtn) {
            profileBtn.onclick = () => {
                const userDropdown = document.getElementById('user-dropdown');
                if (userDropdown) userDropdown.classList.remove('open');
                showProfileModal();
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

        // Обработчики закрытия модалок (используем правильные ID)
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
    }

    // Экспорт новых функций
    window.disconnectAllSockets = disconnectAllSockets;
    window.initLogout = initLogout;
    window.initChangePasswordForm = initChangePasswordForm;
    window.showChangePasswordModal = showChangePasswordModal;
    window.closeChangePasswordModal = closeChangePasswordModal;
    window.showAboutModal = showAboutModal;
    window.closeAboutModal = closeAboutModal;
    window.initProfileUniversalHandlers = initProfileUniversalHandlers;

})(); 