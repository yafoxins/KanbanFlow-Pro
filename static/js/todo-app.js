// Версия 4.0 — фикс: просмотр после сохранения/отмены, страна всегда актуальна, красивый select

(function () {
    const USERNAME = window.USERNAME || (document.body.dataset.username || '');

    // Инициализация CSRF токена
    window.CSRF_TOKEN = document.body.dataset.csrfToken || '';

    // ========== Utility Functions ==========
    function getHeaders(contentType = 'application/json') {
        const headers = {
            'X-CSRF-Token': window.CSRF_TOKEN || ''
        };
        if (contentType) {
            headers['Content-Type'] = contentType;
        }
        return headers;
    }

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

    // ========== Profile Modal ==========
    function initProfileModal() {
        // === Централизованный режим редактирования профиля ===
        let profileEditMode = false;
        const profileForm = document.getElementById('profile-form');
        const saveBtn = document.getElementById('save-profile-btn');
        const cancelBtn = document.getElementById('cancel-profile-btn');
        const errorDiv = document.getElementById('profile-error');
        const fields = ['email', 'country', 'fullname'];

        function setProfileEditMode(on) {
            profileEditMode = on;
            const profileForm = document.getElementById('profile-form');
            const profileInfo = document.getElementById('profile-info-block');
            if (profileInfo) profileInfo.style.display = on ? 'none' : 'flex';
            if (profileForm) profileForm.style.display = on ? 'block' : 'none';
            fields.forEach(f => {
                const input = document.getElementById(`profile-${f}-input`);
                const display = document.getElementById(`profile-${f}`);
                const select = document.getElementById(`profile-country-select`);
                if (f === 'country' && select) {
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

        // Инициализация данных профиля
        window.lastProfileData = {
            email: '',
            country: '',
            fullname: ''
        };
        setProfileEditMode(false);

        // Обработчик кнопки закрытия профиля
        const closeProfileBtn = document.getElementById('close-profile-modal-btn');
        if (closeProfileBtn) {
            closeProfileBtn.onclick = function () {
                closeProfileModal();
            };
        }

        // Обработчик кнопки профиля
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

                    // Проверяем, что функция updateProfileAvatar доступна
                    if (typeof window.updateProfileAvatar === 'function') {
                        window.updateProfileAvatar(data.avatar_url);
                    }

                    // Устанавливаем режим просмотра
                    setProfileEditMode(false);

                    showProfileModal();
                } catch (error) {
                    // Ошибка загрузки профиля
                }
            };
        }

        // Инициализация селектора стран
        function initializeCountrySelect() {
            const countrySelect = document.getElementById('profile-country-select');
            if (countrySelect && window.COUNTRIES) {
                fillCountryOptions(countrySelect, countrySelect.value || '');
            }
        }

        // Инициализируем селектор стран при загрузке
        setTimeout(initializeCountrySelect, 100);

        // Также инициализируем после загрузки countries.js
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeCountrySelect);
        } else {
            initializeCountrySelect();
        }

        // Также инициализируем при открытии модалки профиля
        const originalShowProfileModal = showProfileModal;
        showProfileModal = function () {
            const profileModal = document.getElementById('profile-modal');
            if (profileModal) {
                profileModal.classList.add('show');
            }
            setTimeout(initializeCountrySelect, 100); // Небольшая задержка для гарантии загрузки DOM
        };
    }

    // ========== Navigation ==========
    function initNavigation() {
        const kanbanBtn = document.getElementById("kanban-btn");
        const todoBtn = document.getElementById("todo-btn");

        if (kanbanBtn) {
            kanbanBtn.onclick = () => (location.href = `/${USERNAME}/kanban`);
        }

        if (todoBtn) {
            todoBtn.onclick = () => (location.href = `/${USERNAME}/todo`);
        }

        if (window.location.pathname.includes("/kanban")) {
            if (kanbanBtn) kanbanBtn.classList.add("active");
        } else {
            if (todoBtn) todoBtn.classList.add("active");
        }
    }

    // ========== Logout ==========
    function initLogout() {
        const logoutBtn = document.getElementById("logout-btn");
        if (logoutBtn) {
            logoutBtn.onclick = function () {
                const userDropdown = document.getElementById("user-dropdown");
                if (userDropdown) userDropdown.classList.remove("show");
                const logoutUrl = `/${USERNAME}/logout`;
                window.location.href = logoutUrl;
            };
        }
    }

    // ========== Avatar Handling ==========
    function initAvatarHandling() {
        // === Функция обновления аватарки в профиле ===
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

        // Делаем функцию глобальной
        window.updateProfileAvatar = updateProfileAvatar;

        // === Функция обновления аватарки в topbar ===
        function updateTopbarAvatar(avatarUrl) {
            const userMenuBtn = document.getElementById("user-menu-btn");
            if (userMenuBtn) {
                const avatarSpan = userMenuBtn.querySelector(".material-icons");
                if (avatarUrl) {
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
                    avatarSpan.style.display = "inline-block";
                    const avatarImg = userMenuBtn.querySelector(".user-avatar-img");
                    if (avatarImg) {
                        avatarImg.style.display = "none";
                    }
                }
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
                            'X-CSRF-Token': window.CSRF_TOKEN || ''
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
                    // Ошибка загрузки аватарки
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

        // Загружаем аватарку при загрузке страницы
        async function loadUserAvatar() {
            try {
                const response = await fetch(`/api/avatar/${USERNAME}`, { headers: getHeaders() });
                const data = await response.json();
                if (data.avatar_url) {
                    updateTopbarAvatar(data.avatar_url);
                    // Также обновляем аватарку в профиле, если модалка открыта
                    updateProfileAvatar(data.avatar_url);
                }
            } catch (error) {
                // Ошибка загрузки аватарки
            }
        }

        // Вызываем загрузку аватарки при инициализации
        loadUserAvatar();

        // Функция заполнения стран
        function fillCountryOptions(select, currentValue) {
            if (window.COUNTRIES) {
                select.innerHTML = '<option value="">Выберите страну</option>';
                window.COUNTRIES.forEach(country => {
                    const option = document.createElement('option');
                    option.value = country;
                    option.textContent = country;
                    if (country === currentValue) {
                        option.selected = true;
                    }
                    select.appendChild(option);
                });
            }
        }

        // Делаем функцию глобальной
        window.fillCountryOptions = fillCountryOptions;

        // Инициализация select для страны
        const countrySelect = document.getElementById('profile-country-select');
        if (countrySelect) {
            fillCountryOptions(countrySelect, '');
        }
    }

    // ========== Change Password Modal ==========
    function initChangePasswordModal() {
        const changePasswordBtn = document.getElementById("change-password-btn");
        if (changePasswordBtn) {
            changePasswordBtn.onclick = function () {
                const userDropdown = document.getElementById("user-dropdown");
                if (userDropdown) userDropdown.classList.remove("show");
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

        // Специальный обработчик для кнопки отмены в модалке смены пароля
        const cancelChangePasswordBtn = document.getElementById("cancel-change-password-btn");
        if (cancelChangePasswordBtn) {
            cancelChangePasswordBtn.onclick = function () {
                closeChangePasswordModal();
            };
        }
    }

    // ========== About Modal ==========
    function initAboutModal() {
        const aboutBtn = document.getElementById("about-btn");
        if (aboutBtn) {
            aboutBtn.onclick = function () {
                const userDropdown = document.getElementById("user-dropdown");
                if (userDropdown) userDropdown.classList.remove("show");
                const aboutModal = document.getElementById("about-modal");
                if (aboutModal) aboutModal.classList.add("show");
            };
        }
    }

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
                    todos[i].done = !todos[i].done;
                    saveTodos();
                    renderTodos();
                } else if (e.target.closest(".remove-btn")) {
                    let i = parseInt(e.target.closest(".remove-btn").dataset.i);
                    todos.splice(i, 1);
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
    function closeProfileModal() {
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) profileModal.classList.remove('show');
    }

    function closeChangePasswordModal() {
        const changePasswordModal = document.getElementById('change-password-modal');
        if (changePasswordModal) changePasswordModal.classList.remove('show');
    }

    function closeAboutModal() {
        const aboutModal = document.getElementById('about-modal');
        if (aboutModal) aboutModal.classList.remove('show');
    }

    function showProfileModal() {
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) profileModal.classList.add('show');
    }

    // === Универсальные обработчики крестиков и кнопок отмены для всех модалок ===
    function initUniversalModalHandlers() {
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.onclick = function () {
                const modal = btn.closest('.modal');
                if (modal) modal.classList.remove('show');
            };
        });

        // Для кнопок отмены (id заканчивается на -cancel, -btn, -close и т.д.)
        // Исключаем cancel-profile-btn и cancel-change-password-btn, так как у них есть специальные обработчики
        ['cancel-task-modal-btn', 'close-task-modal-btn', 'close-status-modal-btn', 'close-view-task-modal-btn', 'close-about-modal-btn'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.onclick = function () {
                const modal = btn.closest('.modal');
                if (modal) modal.classList.remove('show');
            };
        });
    }

    // Делаем функции глобальными
    window.closeProfileModal = closeProfileModal;
    window.closeChangePasswordModal = closeChangePasswordModal;
    window.closeAboutModal = closeAboutModal;
    window.showProfileModal = showProfileModal;

    // ========== Инициализация ==========
    document.addEventListener('DOMContentLoaded', function () {
        initUserDropdown();
        initAvatarHandling(); // Сначала инициализируем аватарку
        initProfileModal(); // Потом профиль
        initChangePasswordModal();
        initAboutModal();
        initNavigation();
        initLogout();
        initTodoList();
        initUniversalModalHandlers();
    });
})();