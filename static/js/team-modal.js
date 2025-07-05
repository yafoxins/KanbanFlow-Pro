// ===================== TEAM MODAL UNIVERSAL =====================
// Универсальный JS для работы с модалкой команд (Kanban + Team Board)

(function () {
    // --- Глобальные переменные ---
    let TEAMS = [];
    let USERNAME = window.USERNAME || (document.body ? document.body.getAttribute('data-username') : null);
    // Используем глобальную функцию getHeaders
    let CURRENT_EDIT_TEAM = null;

    // --- Получение списка команд ---
    async function fetchTeams() {
        // Проверяем и инициализируем USERNAME если нужно
        if (!USERNAME) {
            if (typeof initUsername === 'function') {
                initUsername();
            }
            if (!USERNAME) {
                return;
            }
        }

        try {
            let resp = await fetch(`/${USERNAME}/api/teams/list`, { headers: window.getHeaders() });
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
        } catch (error) {
            TEAMS = [];
            renderTeams();
        }
    }

    // --- Рендер списка команд ---
    function renderTeams() {
        const list = document.getElementById("universal-teams-list");
        if (!list) return;
        list.innerHTML = "";
        if (!TEAMS || TEAMS.length === 0) {
            list.innerHTML = `<div style='padding: 18px 0; text-align: center; color: var(--text-soft); font-size: 1.08em;'>Нет команд</div>`;
            return;
        }
        TEAMS.forEach((team) => {
            const card = document.createElement("div");
            card.className = "team-card";
            card.dataset.teamId = team.id;
            let isLeader = team.leader_name === USERNAME || team.leader === USERNAME || team.is_leader;
            function plural(n) {
                if (n % 10 === 1 && n % 100 !== 11) return 'участник';
                if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'участника';
                return 'участников';
            }
            // --- Подсчёт участников ---
            function normalizeName(name) {
                if (!name) return '';
                if (typeof name === 'string') return name.trim().toLowerCase();
                if (typeof name === 'object' && name.username) return String(name.username).trim().toLowerCase();
                return String(name).trim().toLowerCase();
            }
            const leaderName = normalizeName(team.leader_name || team.leader);
            const membersNormalized = (team.members || []).map(normalizeName);
            let membersCount = 1;
            if (Array.isArray(team.members)) {
                if (leaderName && !membersNormalized.includes(leaderName)) {
                    membersCount = team.members.length + 1;
                } else {
                    membersCount = team.members.length;
                }
            }
            card.innerHTML = `
                <div class="team-card-title-badge" style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);color:#fff;padding:8px 16px;border-radius:20px;font-size:1.3em;font-weight:700;margin-bottom:12px;margin-top:4px;display:inline-block;box-shadow:0 4px 12px rgba(102,126,234,0.3);text-align:center;letter-spacing:-0.3px;">${escapeHTML(team.name || team.title || "Без названия")}</div>
                <div class="team-leader-row" style="display:flex;align-items:center;gap:8px;color:#888;font-size:1em;margin-bottom:4px;">
                    <span class="material-icons" style="font-size:1.1em;vertical-align:middle;color:#ff9800;">star</span>
                    <span>Лидер:</span>
                    <span style="font-weight:600;color:#222;">${escapeHTML(team.leader_name || team.leader || "-")}</span>
                </div>
                ${team.description ? `<div class="team-description" style="color:#666;font-size:1em;margin:6px 0 2px 0;">${escapeHTML(team.description)}</div>` : ''}
                <div class="team-meta" style="color:#888;font-size:0.98em;display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                  <span class="material-icons" style="font-size:1.1em;vertical-align:middle;">people</span>
                  <span>${membersCount} ${plural(membersCount)}</span>
                </div>
                <div class="team-card-actions" style="display:flex;gap:10px;align-items:center;">
                  <button class="btn btn-primary team-enter-btn" data-team-id="${team.id}" style="display:inline-flex;align-items:center;gap:6px;font-weight:500;font-size:1em;">
                    <span class="material-icons" style="font-size:1.1em;">open_in_new</span>Открыть
                  </button>
                  ${isLeader ? `
                    <button class="team-edit-link" data-team-id="${team.id}" style="display:inline-flex;align-items:center;gap:6px;font-weight:500;font-size:0.97em;margin-left:16px;">
                      <span class="material-icons" style="font-size:1.1em;">edit</span>Редактировать
                    </button>
                  ` : ''}
                </div>
              `;
            list.appendChild(card);
        });
        // Обработчики кнопок
        bindTeamCardHandlers();
    }

    // --- Модалка редактирования команды ---
    async function openEditTeamModal(teamId) {
        CURRENT_EDIT_TEAM = teamId;
        try {
            const response = await fetch(`/${USERNAME}/api/teams/${teamId}/info`, { headers: window.getHeaders() });
            const data = await response.json();
            const editTeamName = document.getElementById("edit-team-name");
            const editTeamMembers = document.getElementById("edit-team-members");
            const editTeamModal = document.getElementById("universal-edit-team-modal");
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
                // Остальные участники (универсально: строка или объект)
                (data.members || []).forEach((member) => {
                    const username = typeof member === 'string' ? member : member.username;
                    if (username !== leader) {
                        editTeamMembers.innerHTML += `
              <div class="edit-team-member" style="display:flex;align-items:center;gap:10px;">
                <span class="material-icons member-icon" style="color:var(--accent);font-size:1.3em;">person</span>
                <span class="member-info">${username}</span>
                <button class="remove-member" onclick="window.removeMember && window.removeMember('${username}')">
                  <span class="material-icons">close</span>
                </button>
                <button class="make-leader" onclick="window.makeLeader && window.makeLeader('${username}')">
                  <span class="material-icons">star</span>
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
        const editTeamModal = document.getElementById("universal-edit-team-modal");
        if (editTeamModal) {
            editTeamModal.classList.remove("show");
            delete editTeamModal.dataset.teamId; // Очищаем ID команды
        }
        CURRENT_EDIT_TEAM = null;

        // Сбрасываем форму
        const editTeamForm = document.getElementById("edit-team-form");
        if (editTeamForm) editTeamForm.reset();

        // Очищаем список участников
        const editTeamMembers = document.getElementById("edit-team-members");
        if (editTeamMembers) editTeamMembers.innerHTML = "";
    }

    // --- Вспомогательные функции ---
    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    // --- Экспортируем в window ---
    window.fetchTeams = fetchTeams;
    window.renderTeams = renderTeams;
    window.openEditTeamModal = openEditTeamModal;
    window.closeEditTeamModal = closeEditTeamModal;
    window.removeMember = removeMember;
    window.makeLeader = makeLeader;

    // ========== Обработчики событий ==========

    /**
     * Привязывает обработчики к кнопкам карточек команд
     */
    function bindTeamCardHandlers() {
        document.querySelectorAll(".team-edit-link").forEach((btn) => {
            btn.onclick = function (e) {
                e.preventDefault();
                const teamId = +btn.dataset.teamId;
                const team = TEAMS.find((t) => t.id === teamId);
                const isLeader = team && (team.leader_name === USERNAME || team.leader === USERNAME || team.is_leader);
                if (!isLeader) return;
                openEditTeamModal(teamId);
            };
        });

        document.querySelectorAll(".team-enter-btn").forEach((btn) => {
            btn.onclick = function () {
                const teamId = btn.dataset.teamId;
                window.location = `/${USERNAME}/team?team_id=${teamId}`;
            };
        });
    }

    /**
     * Удаляет участника из команды
     */
    function removeMember(username) {
        if (!CURRENT_EDIT_TEAM) {
            alert('Ошибка: команда не выбрана!');
            return;
        }
        if (!confirm(`Удалить участника ${username}?`)) return;

        fetch(`/${USERNAME}/api/teams/${CURRENT_EDIT_TEAM}/members`, {
            method: "POST",
            headers: window.getHeaders(),
            body: JSON.stringify({ username, remove: true }),
        }).then(async (resp) => {
            if (resp.ok) {
                // Мгновенно убираем участника из DOM
                // Находим все элементы edit-team-member
                const members = document.querySelectorAll('.edit-team-member');
                members.forEach(memberDiv => {
                    const info = memberDiv.querySelector('.member-info');
                    if (info && info.textContent === username) {
                        memberDiv.remove();
                    }
                });
                if (window.toast) {
                    const team = TEAMS.find(t => t.id == CURRENT_EDIT_TEAM);
                    const teamName = team ? team.name : '';
                    if (window.toast.memberRemoved) {
                        window.toast.memberRemoved(username, teamName);
                    } else if (window.toast.teamEdited) {
                        window.toast.teamEdited(teamName);
                    }
                }
                // fetch для актуализации (оставляем для синхронизации, но DOM уже обновлён)
                fetch(`/${USERNAME}/api/teams/${CURRENT_EDIT_TEAM}/info`, { headers: window.getHeaders() })
                    .then(r => r.json())
                    .then(data => updateEditTeamMembers(data));
            } else {
                alert("Ошибка удаления участника");
            }
        }).catch(error => {
            alert("Ошибка сети при удалении участника");
        });
    }

    /**
     * Назначает нового лидера команды
     */
    function makeLeader(username) {
        if (!CURRENT_EDIT_TEAM) {
            alert('Ошибка: команда не выбрана!');
            return;
        }
        if (!confirm(`Сделать ${username} лидером команды?`)) return;
        fetch(`/${USERNAME}/api/teams/${CURRENT_EDIT_TEAM}/make_leader`, {
            method: "POST",
            headers: window.getHeaders(),
            body: JSON.stringify({ username }),
        }).then(async (resp) => {
            if (resp.ok) {
                if (window.toast) {
                    window.toast.leaderChanged ? window.toast.leaderChanged(username) : window.toast.teamEdited();
                }
                openEditTeamModal(CURRENT_EDIT_TEAM);
            } else {
                alert("Ошибка смены лидера");
            }
        }).catch(error => {
            alert("Ошибка сети при смене лидера");
        });
    }

    // ========== Обработчики событий ==========

    /**
     * Инициализирует все обработчики событий для модалок команд
     */
    function initTeamModalHandlers() {
        // Кнопки закрытия
        const closeTeamsModalBtn = document.getElementById("close-universal-teams-modal-btn");
        const closeCreateTeamModalBtn = document.getElementById("close-universal-create-team-modal-btn");
        const closeEditTeamModalBtn = document.getElementById("close-universal-edit-team-modal-btn");
        if (closeTeamsModalBtn) closeTeamsModalBtn.onclick = function (e) { e.preventDefault(); closeTeamsModal(); };
        if (closeCreateTeamModalBtn) closeCreateTeamModalBtn.onclick = function (e) { e.preventDefault(); closeCreateTeamModal(); };
        if (closeEditTeamModalBtn) closeEditTeamModalBtn.onclick = function (e) { e.preventDefault(); closeEditTeamModal(); };
        // Кнопка открытия создания
        const openCreateTeamBtn = document.getElementById("open-create-team-modal");
        if (openCreateTeamBtn) openCreateTeamBtn.onclick = function () {
            const createTeamModal = document.getElementById("universal-create-team-modal");
            const createTeamError = document.getElementById("universal-create-team-error");
            const teamNameInput = document.getElementById("team-name-input");
            if (createTeamModal) createTeamModal.classList.add("show");
            if (createTeamError) createTeamError.innerText = "";
            if (teamNameInput) teamNameInput.value = "";
        };
        // Кнопка добавления участника
        const addMemberBtn = document.getElementById("add-member-btn");
        if (addMemberBtn) {
            addMemberBtn.onclick = async function () {
                if (!CURRENT_EDIT_TEAM) {
                    alert('Ошибка: команда не выбрана!');
                    return;
                }
                const addMemberInput = document.getElementById("add-member-input");
                const editTeamError = document.getElementById("universal-edit-team-error");
                if (!addMemberInput) return;
                let username = addMemberInput.value.trim();
                if (!username) return;
                try {
                    let resp = await fetch(
                        `/${USERNAME}/api/teams/${CURRENT_EDIT_TEAM}/members`,
                        {
                            method: "POST",
                            headers: window.getHeaders(),
                            body: JSON.stringify({ username }),
                        }
                    );
                    if (resp.ok) {
                        if (window.toast) {
                            const team = TEAMS.find(t => t.id == CURRENT_EDIT_TEAM);
                            const teamName = team ? team.name : '';
                            window.toast.memberAdded(username, teamName);
                        }
                        addMemberInput.value = "";
                        fetch(`/${USERNAME}/api/teams/${CURRENT_EDIT_TEAM}/info`, { headers: window.getHeaders() })
                            .then(r => r.json())
                            .then(data => updateEditTeamMembers(data));
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
        // Кнопка удаления команды
        const deleteTeamBtn = document.getElementById("delete-team-btn");
        if (deleteTeamBtn) {
            deleteTeamBtn.onclick = function () {
                // Получаем название команды
                const team = TEAMS.find(t => t.id == CURRENT_EDIT_TEAM);
                const teamName = team ? team.name : '';
                // Заполняем название в модалке
                const confirmModal = document.getElementById("universal-confirm-delete-team-modal");
                const confirmName = document.getElementById("confirm-delete-team-name");
                if (confirmName) confirmName.textContent = teamName;
                if (confirmModal) confirmModal.classList.add("show");
            };
        }
        // Кнопка отмены удаления
        const cancelDeleteTeamBtn = document.getElementById("cancel-delete-team-btn");
        if (cancelDeleteTeamBtn) {
            cancelDeleteTeamBtn.onclick = function () {
                const confirmModal = document.getElementById("universal-confirm-delete-team-modal");
                if (confirmModal) confirmModal.classList.remove("show");
            };
        }
        // Кнопка закрытия модалки подтверждения
        const closeConfirmDeleteTeamModalBtn = document.getElementById("close-universal-confirm-delete-team-modal-btn");
        if (closeConfirmDeleteTeamModalBtn) {
            closeConfirmDeleteTeamModalBtn.onclick = function () {
                const confirmModal = document.getElementById("universal-confirm-delete-team-modal");
                if (confirmModal) confirmModal.classList.remove("show");
            };
        }
        // Кнопка подтверждения удаления
        const confirmDeleteTeamBtn = document.getElementById("confirm-delete-team-btn");
        if (confirmDeleteTeamBtn) {
            confirmDeleteTeamBtn.onclick = async function () {
                confirmDeleteTeamBtn.disabled = true;
                const editTeamError = document.getElementById("universal-edit-team-error");
                try {
                    let resp = await fetch(
                        `/${USERNAME}/api/teams/${CURRENT_EDIT_TEAM}/delete`,
                        {
                            method: "POST",
                            headers: window.getHeaders(),
                        }
                    );
                    if (resp.ok) {
                        if (window.toast) {
                            const team = TEAMS.find(t => t.id == CURRENT_EDIT_TEAM);
                            const teamName = team ? team.name : '';
                            window.toast.teamDeleted(teamName);
                        }
                        closeEditTeamModal();
                        const confirmModal = document.getElementById("universal-confirm-delete-team-modal");
                        if (confirmModal) confirmModal.classList.remove("show");
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
                } finally {
                    confirmDeleteTeamBtn.disabled = false;
                }
            };
        }
        // Форма редактирования команды
        const editTeamForm = document.getElementById("universal-edit-team-form");
        if (editTeamForm) {
            editTeamForm.onsubmit = async function (e) {
                e.preventDefault();
                const editTeamName = document.getElementById("edit-team-name");
                const editTeamError = document.getElementById("universal-edit-team-error");
                if (!editTeamName) return;
                let name = editTeamName.value.trim();
                if (!name) {
                    if (editTeamError) editTeamError.innerText = "Название команды не может быть пустым";
                    return;
                }
                try {
                    const url = `/${USERNAME}/api/teams/${CURRENT_EDIT_TEAM}/edit`;
                    const body = JSON.stringify({ name });
                    const headers = window.getHeaders();
                    let resp = await fetch(url, {
                        method: "POST",
                        headers,
                        body,
                    });
                    let text = await resp.text();
                    let data = null;
                    try {
                        data = JSON.parse(text);
                    } catch (e) {
                        data = null;
                    }
                    if (resp.ok && data && (data.success || data.id || data.team || data.name)) {
                        if (window.toast && typeof window.toast.teamEdited === 'function') {
                            window.toast.teamEdited(name);
                        } else if (window.toast && typeof window.toast.success === 'function') {
                            window.toast.success('Команда сохранена');
                        } else {
                            alert('Команда сохранена!');
                        }
                        closeEditTeamModal();
                        fetchTeams();
                    } else {
                        if (editTeamError) {
                            editTeamError.innerText = (data && data.error) || "Ошибка сохранения!";
                        }
                    }
                } catch (error) {
                    if (editTeamError) {
                        editTeamError.innerText = "Ошибка сети!";
                    }
                }
            };
        }

        // Форма создания команды
        const createTeamForm = document.getElementById("universal-create-team-form");
        if (createTeamForm) {
            createTeamForm.onsubmit = async function (e) {
                e.preventDefault();

                // Проверяем USERNAME
                if (!USERNAME) {
                    return;
                }

                let name = document.getElementById("team-name-input").value.trim();
                if (!name) return;

                try {
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
                        closeCreateTeamModal();
                        fetchTeams();
                    } else {
                        let data = await resp.json();
                        const createTeamError = document.getElementById("universal-create-team-error");
                        if (createTeamError) {
                            createTeamError.innerText = data.error || "Ошибка создания команды!";
                        }
                    }
                } catch (error) {
                    const createTeamError = document.getElementById("universal-create-team-error");
                    if (createTeamError) {
                        createTeamError.innerText = "Ошибка сети!";
                    }
                }
            };
        }
    }

    /**
     * Закрывает модалку создания команды
     */
    function closeCreateTeamModal() {
        const createTeamModal = document.getElementById("universal-create-team-modal");
        if (createTeamModal) createTeamModal.classList.remove("show");
    }

    /**
     * Закрывает модалку списка команд
     */
    function closeTeamsModal() {
        const teamsModal = document.getElementById("universal-teams-modal");
        if (teamsModal) teamsModal.classList.remove("show");
    }

    // Экспортируем функции для использования в HTML
    window.closeTeamsModal = closeTeamsModal;
    window.closeCreateTeamModal = closeCreateTeamModal;

    // ========== Инициализация ==========

    // Инициализируем обработчики при загрузке DOM
    document.addEventListener('DOMContentLoaded', function () {
        initTeamModalHandlers();

        // Обработчик кнопки "Команды"
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

        // Дополнительная инициализация с задержкой
        setTimeout(() => {
            const teamsBtnDelayed = document.getElementById("teams-btn");
            if (teamsBtnDelayed && !teamsBtnDelayed.onclick) {
                teamsBtnDelayed.onclick = function () {
                    const userDropdown = document.getElementById("user-dropdown");
                    if (userDropdown) userDropdown.classList.remove("open");
                    const teamsModal = document.getElementById("universal-teams-modal");
                    if (teamsModal) {
                        teamsModal.classList.add("show");
                        fetchTeams();
                    }
                };
            }
        }, 100);

        // Загружаем список команд при инициализации
        fetchTeams();
    });

    /**
     * Обновляет список участников в модалке редактирования команды
     */
    function updateEditTeamMembers(data) {
        const editTeamMembers = document.getElementById("edit-team-members");
        if (!editTeamMembers) return;
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
        // Остальные участники (универсально: строка или объект)
        (data.members || []).forEach((member) => {
            const username = typeof member === 'string' ? member : member.username;
            if (username !== leader) {
                editTeamMembers.innerHTML += `
                    <div class="edit-team-member" style="display:flex;align-items:center;gap:10px;">
                        <span class="material-icons member-icon" style="color:var(--accent);font-size:1.3em;">person</span>
                        <span class="member-info">${username}</span>
                        <button class="remove-member" onclick="window.removeMember && window.removeMember('${username}')">
                            <span class="material-icons">close</span>
                        </button>
                        <button class="make-leader" onclick="window.makeLeader && window.makeLeader('${username}')">
                            <span class="material-icons">star</span>
                        </button>
                    </div>
                `;
            }
        });
    }
})(); 