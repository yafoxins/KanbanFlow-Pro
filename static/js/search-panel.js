// Универсальная система поиска по задачам
(function () {
    let searchFiltersObj = {
        text: '',
        assignee: '',
        tags: [], // Изменили на массив для множественного выбора
        status: '',
        date: ''
    };

    // Сохраняем состояние поиска
    let searchState = {
        isActive: false,
        lastFilters: null
    };

    // Определяем тип страницы
    const isTeamBoard = window.location.pathname.includes('/team');
    const isKanbanBoard = window.location.pathname.includes('/kanban') && !isTeamBoard;

    // Инициализация поисковой панели
    function initSearchPanel() {
        const searchInput = document.getElementById('task-search');
        const clearSearchBtn = document.getElementById('clear-search');
        const toggleFiltersBtn = document.getElementById('toggle-filters');
        const searchFilters = document.getElementById('search-filters');
        const clearFiltersBtn = document.getElementById('clear-filters');

        // Поиск по тексту
        if (searchInput) {
            searchInput.addEventListener('input', debounce(function () {
                searchFiltersObj.text = this.value.trim();
                searchState.isActive = searchFiltersObj.text.length > 0 || hasOtherActiveFilters();
                searchState.lastFilters = { ...searchFiltersObj };
                performSearch();
                updateClearButton();
            }, 150));
        }

        // Кнопка очистки поиска
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', function () {
                searchInput.value = '';
                searchFiltersObj.text = '';
                searchState.isActive = hasOtherActiveFilters();
                searchState.lastFilters = searchState.isActive ? { ...searchFiltersObj } : null;
                performSearch();
                updateClearButton();
                searchInput.focus();
            });
        }

        // Переключение фильтров
        if (toggleFiltersBtn) {
            toggleFiltersBtn.addEventListener('click', function () {
                const isVisible = searchFilters.style.display !== 'none';
                searchFilters.style.display = isVisible ? 'none' : 'block';
                this.classList.toggle('active');
            });
        }

        // Фильтры
        const filterSelects = ['filter-tag', 'filter-status', 'filter-date'];
        filterSelects.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.addEventListener('change', function () {
                    const filterType = id.replace('filter-', '');

                    // Особая обработка для тегов с множественным выбором
                    if (filterType === 'tag' && this.multiple) {
                        searchFiltersObj.tags = Array.from(this.selectedOptions).map(option => option.value);
                    } else if (filterType === 'tag') {
                        // Совместимость со старой версией
                        searchFiltersObj.tags = this.value ? [this.value] : [];
                    } else {
                        searchFiltersObj[filterType] = this.value;
                    }

                    searchState.isActive = true;
                    searchState.lastFilters = { ...searchFiltersObj };
                    performSearch();
                });
            }
        });

        // Фильтр исполнителя обрабатывается прямо в функции автодополнения

        // Сброс всех фильтров
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', function () {
                resetAllFilters();
            });
        }

        // Инициализация фильтров
        populateFilters();
    }

    // Заполнение фильтров данными
    function populateFilters() {
        // Фильтр по статусам
        const statusSelect = document.getElementById('filter-status');
        if (statusSelect) {
            statusSelect.innerHTML = '<option value="">Все статусы</option>';
            if (isTeamBoard && window.STATUSES) {
                window.STATUSES.forEach(status => {
                    const option = document.createElement('option');
                    option.value = status.code;
                    option.textContent = status.title;
                    statusSelect.appendChild(option);
                });
            } else {
                // Для личной доски получаем статусы из DOM (только span внутри .kanban-col-title)
                const statusColumns = document.querySelectorAll('.kanban-column');
                statusColumns.forEach(column => {
                    const statusCode = column.dataset.statusCode;
                    const titleSpan = column.querySelector('.kanban-col-title span');
                    const statusTitle = titleSpan ? titleSpan.textContent.trim() : '';
                    if (statusCode && statusTitle) {
                        const option = document.createElement('option');
                        option.value = statusCode;
                        option.textContent = statusTitle;
                        statusSelect.appendChild(option);
                    }
                });
            }
        }

        // Фильтр по исполнителям (только для командной доски) - автодополнение
        const assigneeSelect = document.getElementById('filter-assignee');
        const assigneeFilterGroup = assigneeSelect ? assigneeSelect.parentElement : null;
        if (assigneeFilterGroup) {
            if (isTeamBoard) {

                // Создаем правильную структуру автодополнения как в модалках
                if (assigneeSelect && assigneeSelect.tagName === 'SELECT') {

                    // Создаем input
                    const assigneeInput = document.createElement('input');
                    assigneeInput.type = 'text';
                    assigneeInput.id = 'filter-assignee';
                    assigneeInput.className = 'filter-select';
                    assigneeInput.placeholder = 'Все исполнители';
                    assigneeInput.autocomplete = 'off';
                    assigneeInput.style.backgroundImage = 'none';
                    assigneeInput.style.paddingRight = '16px';

                    // Создаем скрытое поле
                    const assigneeHidden = document.createElement('input');
                    assigneeHidden.type = 'hidden';
                    assigneeHidden.id = 'filter-assignee-hidden';

                    // Создаем контейнер автодополнения
                    const autocomplete = document.createElement('div');
                    autocomplete.className = 'search-assignee-autocomplete autocomplete-dropdown';
                    autocomplete.id = 'search-assignee-autocomplete';
                    autocomplete.style.display = 'none';

                    // Заменяем select на input
                    assigneeSelect.parentNode.replaceChild(assigneeInput, assigneeSelect);
                    assigneeInput.parentNode.appendChild(assigneeHidden);
                    assigneeInput.parentNode.appendChild(autocomplete);

                    // Настраиваем автодополнение по принципу модалок
                    setupAssigneeAutocompleteSimple(assigneeInput, assigneeHidden, autocomplete);
                } else if (assigneeSelect && assigneeSelect.tagName === 'INPUT') {
                    const assigneeHidden = document.getElementById('filter-assignee-hidden');
                    const autocomplete = document.getElementById('search-assignee-autocomplete');
                    if (autocomplete && assigneeHidden) {
                        setupAssigneeAutocompleteSimple(assigneeSelect, assigneeHidden, autocomplete);
                    }
                }
            } else {
                // Для личной доски скрываем фильтр по исполнителям
                assigneeFilterGroup.style.display = 'none';
            }
        }

        // Фильтр по тегам - создаем кастомный селектор
        const tagSelect = document.getElementById('filter-tag');
        if (tagSelect) {
            const allTags = new Set();

            // Собираем теги из window.TASKS если есть
            if (window.TASKS) {
                window.TASKS.forEach(task => {
                    if (task.tags && Array.isArray(task.tags)) {
                        task.tags.forEach(tag => {
                            if (tag && tag.trim()) {
                                allTags.add(tag.trim());
                            }
                        });
                    }
                });
            }

            // Собираем теги из DOM
            const taskTags = document.querySelectorAll('.task-tag, .tag');
            taskTags.forEach(tag => {
                const tagText = tag.textContent.trim();
                if (tagText) {
                    allTags.add(tagText);
                }
            });

            // Добавляем стандартные теги
            const standardTags = ['Срочно', 'Баг', 'Улучшение', 'Обсудить', 'Документы'];
            standardTags.forEach(tag => allTags.add(tag));

            // Создаем кастомный селектор если его еще нет
            if (!tagSelect.parentElement.querySelector('.custom-tag-selector')) {
                createCustomTagSelector(tagSelect, Array.from(allTags).sort());
            }
        }

        // Восстанавливаем состояние фильтров после перезагрузки
        restoreSearchState();
    }

    // Восстановление состояния поиска
    function restoreSearchState() {
        if (searchState.isActive && searchState.lastFilters) {
            // Восстанавливаем значения полей
            const searchInput = document.getElementById('task-search');
            if (searchInput) {
                searchInput.value = searchState.lastFilters.text || '';
            }

            const filterSelects = ['filter-assignee', 'filter-tag', 'filter-status', 'filter-date'];
            filterSelects.forEach(id => {
                const element = document.getElementById(id);
                const filterType = id.replace('filter-', '');

                if (element && searchState.lastFilters[filterType]) {
                    if (filterType === 'tag' && Array.isArray(searchState.lastFilters.tags)) {
                        // Восстанавливаем кастомный селектор тегов
                        const customSelector = element.parentElement.querySelector('.custom-tag-selector');
                        if (customSelector) {
                            const selectedTags = searchState.lastFilters.tags;
                            customSelector.querySelectorAll('.tag-option').forEach(option => {
                                if (selectedTags.includes(option.dataset.value)) {
                                    option.classList.add('selected');
                                }
                            });
                            // Обновляем кнопку селектора
                            if (customSelector.updateButton) {
                                customSelector.updateButton();
                            }
                        }
                    } else if (filterType === 'assignee') {
                        // Восстанавливаем фильтр исполнителя (input или select)
                        element.value = searchState.lastFilters[filterType];
                        // Применяем стили для активного фильтра если это input
                        if (element.tagName === 'INPUT' && searchState.lastFilters[filterType]) {
                            element.classList.add('has-value');
                            const filterGroup = element.closest('.filter-group');
                            if (filterGroup) {
                                filterGroup.classList.add('assignee-active');
                            }
                        }
                    } else {
                        element.value = searchState.lastFilters[filterType];
                    }
                }
            });

            // Восстанавливаем объект фильтров
            searchFiltersObj = { ...searchState.lastFilters };

            // Обновляем UI
            updateClearButton();

            // Выполняем поиск с восстановленными фильтрами
            setTimeout(() => {
                performSearch();
            }, 100);
        }
    }

    // Показывать только одну колонку при фильтре по статусу
    function filterColumnsByStatus() {
        const statusValue = searchFiltersObj.status;
        const board = document.getElementById('kanban-board');
        const columns = document.querySelectorAll('.kanban-column');
        if (!statusValue) {
            columns.forEach(col => col.style.display = '');
            if (board) board.classList.remove('single-column');
        } else {
            columns.forEach(col => {
                if (col.dataset.statusCode === statusValue) {
                    col.style.display = '';
                } else {
                    col.style.display = 'none';
                }
            });
            if (board) board.classList.add('single-column');
        }
    }

    // Выполнение поиска
    function performSearch() {
        // Проверяем, есть ли активные фильтры
        if (!hasActiveFilters()) {
            // Если нет активных фильтров, показываем все задачи
            const tasks = document.querySelectorAll('.kanban-task');
            tasks.forEach(task => {
                task.classList.remove('search-hidden', 'filtered-out');
            });

            // Показываем все колонки
            const columns = document.querySelectorAll('.kanban-column');
            columns.forEach(col => col.style.display = '');
            const board = document.getElementById('kanban-board');
            if (board) board.classList.remove('single-column');

            // Всегда обновляем статистику задач
            updateSearchStats(tasks.length, tasks.length);
            hideNoResultsMessage();

            // Убираем индикатор активных фильтров
            const searchPanel = document.querySelector('.search-panel');
            if (searchPanel) {
                searchPanel.classList.remove('has-active-filters');
            }

            return;
        }

        // Добавляем индикатор активных фильтров
        const searchPanel = document.querySelector('.search-panel');
        if (searchPanel) {
            searchPanel.classList.add('has-active-filters');
        }

        filterColumnsByStatus(); // Сначала скрываем/показываем колонки
        const tasks = document.querySelectorAll('.kanban-task');
        let visibleCount = 0;
        let totalCount = tasks.length;

        tasks.forEach(task => {
            const taskData = getTaskData(task);
            const isVisible = matchesFilters(taskData);

            if (isVisible) {
                task.classList.remove('search-hidden', 'filtered-out');
                visibleCount++;
            } else {
                task.classList.add('search-hidden', 'filtered-out');
            }
        });

        // Всегда обновляем статистику задач
        updateSearchStats(visibleCount, totalCount);
        showNoResultsMessage(visibleCount);
    }

    // Получение данных задачи из DOM
    function getTaskData(taskElement) {
        const taskId = taskElement.dataset.taskId;
        // Сначала пытаемся найти в window.TASKS
        if (window.TASKS && Array.isArray(window.TASKS) && window.TASKS.length > 0) {
            const task = window.TASKS.find(t => String(t.id) === String(taskId));
            if (task) {
                // Для совместимости добавляем поля из DOM если их нет
                if (!task.text) {
                    const title = taskElement.querySelector('.task-title')?.textContent || taskElement.querySelector('.task-text')?.textContent || '';
                    task.text = title;
                }
                if (!task.tags) {
                    task.tags = Array.from(taskElement.querySelectorAll('.task-tag, .tag')).map(tag => tag.textContent.trim());
                }
                if (!task.status) {
                    task.status = taskElement.closest('.kanban-column')?.dataset.statusCode || taskElement.closest('.kanban-column')?.dataset.status || '';
                }
                if (!task.due_date) {
                    const dateEl = taskElement.querySelector('.task-date-badge') || taskElement.querySelector('.due-date');
                    task.due_date = dateEl ? dateEl.textContent.trim() : '';
                }
                if (!task.assignee_id && !task.assignee_name) {
                    const assignee = taskElement.querySelector('.assignee-name')?.textContent || taskElement.querySelector('.assignee')?.textContent || '';
                    task.assignee_id = assignee;
                    task.assignee_name = assignee;
                }
                if (!task.description) {
                    const descEl = taskElement.querySelector('.task-desc');
                    task.description = descEl ? descEl.textContent.trim() : '';
                }
                return task;
            }
        }
        // Если не найдено, извлекаем данные из DOM
        const title = taskElement.querySelector('.task-title')?.textContent ||
            taskElement.querySelector('.task-text')?.textContent || '';
        const assignee = taskElement.querySelector('.assignee-name')?.textContent ||
            taskElement.querySelector('.assignee')?.textContent || '';
        const tags = Array.from(taskElement.querySelectorAll('.task-tag, .tag')).map(tag => tag.textContent.trim());
        const status = taskElement.closest('.kanban-column')?.dataset.statusCode ||
            taskElement.closest('.kanban-column')?.dataset.status || '';
        const dateEl = taskElement.querySelector('.task-date-badge') || taskElement.querySelector('.due-date');
        const dueDate = dateEl ? dateEl.textContent.trim() : '';
        const descEl = taskElement.querySelector('.task-desc');
        const description = descEl ? descEl.textContent.trim() : '';
        return {
            id: taskId,
            text: title,
            description: description,
            assignee_id: assignee,
            assignee_name: assignee,
            tags: tags,
            status: status,
            due_date: dueDate
        };
    }

    // Проверка соответствия фильтрам
    function matchesFilters(taskData) {
        // Поиск по тексту
        if (searchFiltersObj.text) {
            const searchText = searchFiltersObj.text.toLowerCase().trim();
            const taskText = (taskData.text || '').toLowerCase();
            const taskDesc = (taskData.description || '').toLowerCase();

            // Поддержка поиска по нескольким словам
            const searchWords = searchText.split(/\s+/);
            const hasAllWords = searchWords.every(word =>
                taskText.includes(word) || taskDesc.includes(word)
            );

            if (!hasAllWords) {
                return false;
            }
        }

        // Фильтр по исполнителю (только для командной доски)
        if (searchFiltersObj.assignee && isTeamBoard) {
            if (searchFiltersObj.assignee === '__none__') {
                // Только задачи без исполнителя
                if (taskData.assignee_id || taskData.assignee_name) return false;
            } else if (searchFiltersObj.assignee === '__all__') {
                // Показываем все задачи
                // ничего не фильтруем
            } else {
                let searchAssignee = searchFiltersObj.assignee;
                let searchId = '', searchUsername = '';
                if (typeof searchAssignee === 'object' && searchAssignee !== null) {
                    searchId = String(searchAssignee.id || '').toLowerCase().trim();
                    searchUsername = String(searchAssignee.username || '').toLowerCase().trim();
                } else {
                    searchUsername = String(searchAssignee).toLowerCase().trim();
                }
                const taskAssigneeId = String(taskData.assignee_id || '').toLowerCase().trim();
                const taskAssigneeName = String(taskData.assignee_name || '').toLowerCase().trim();
                if (
                    (searchId && taskAssigneeId !== searchId && taskAssigneeName !== searchId) &&
                    (searchUsername && taskAssigneeId !== searchUsername && taskAssigneeName !== searchUsername)
                ) {
                    return false;
                }
            }
        }

        // Фильтр по тегам
        if (searchFiltersObj.tags && searchFiltersObj.tags.length > 0) {
            const taskTags = taskData.tags || [];
            const hasAllTags = searchFiltersObj.tags.every(filterTag =>
                taskTags.some(taskTag => taskTag.toLowerCase().trim() === filterTag.toLowerCase().trim())
            );
            if (!hasAllTags) {
                return false;
            }
        }

        // Фильтр по статусу
        if (searchFiltersObj.status) {
            const taskStatus = (taskData.status || '').toLowerCase();
            if (taskStatus !== searchFiltersObj.status.toLowerCase()) {
                return false;
            }
        }

        // Фильтр по дате
        if (searchFiltersObj.date) {
            const dueDate = taskData.due_date;
            if (!dueDate) {
                if (searchFiltersObj.date !== 'no-date') return false;
            } else {
                const date = new Date(dueDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);

                switch (searchFiltersObj.date) {
                    case 'overdue':
                        if (date >= today) return false;
                        break;
                    case 'today':
                        const tomorrow = new Date(today);
                        tomorrow.setDate(tomorrow.getDate() + 1);
                        if (date < today || date >= tomorrow) return false;
                        break;
                    case 'week':
                        const weekEnd = new Date(today);
                        weekEnd.setDate(weekEnd.getDate() + 7);
                        if (date < today || date >= weekEnd) return false;
                        break;
                    case 'month':
                        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                        if (date < today || date > monthEnd) return false;
                        break;
                }
            }
        }

        return true;
    }

    // Обновление статистики поиска
    function updateSearchStats(visibleCount, totalCount) {
        const statsElement = document.getElementById('search-results-count');
        if (statsElement) {
            if (visibleCount === totalCount) {
                statsElement.textContent = `Всего задач: ${totalCount}`;
            } else {
                statsElement.textContent = `Найдено: ${visibleCount} из ${totalCount}`;
            }
        }
    }

    // Обновление статистики при первой загрузке
    function updateInitialStats() {
        const tasks = document.querySelectorAll('.kanban-task');
        // Убеждаемся, что все задачи видимы по умолчанию
        tasks.forEach(task => {
            task.classList.remove('search-hidden', 'filtered-out');
        });
        updateSearchStats(tasks.length, tasks.length);
    }

    // Показ notification об отсутствии результатов
    function showNoResultsMessage(visibleCount) {
        // Показываем уведомление если нет результатов
        if (visibleCount === 0 && hasActiveFilters()) {
            // Используем toast уведомления
            if (window.toast) {
                const query = searchFiltersObj.text || 'заданным критериям';
                window.toast.searchNoResults(query);
            }
        }
    }

    // Скрытие уведомления об отсутствии результатов
    function hideNoResultsMessage() {
        const existingNotification = document.querySelector('.search-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
    }

    // Проверка наличия активных фильтров
    function hasActiveFilters() {
        return searchFiltersObj.text !== '' ||
            searchFiltersObj.assignee !== '' ||
            (searchFiltersObj.tags && searchFiltersObj.tags.length > 0) ||
            searchFiltersObj.status !== '' ||
            searchFiltersObj.date !== '';
    }

    // Проверка наличия активных фильтров кроме текста
    function hasOtherActiveFilters() {
        return searchFiltersObj.assignee !== '' ||
            (searchFiltersObj.tags && searchFiltersObj.tags.length > 0) ||
            searchFiltersObj.status !== '' ||
            searchFiltersObj.date !== '';
    }

    // Сброс всех фильтров
    function resetAllFilters() {
        // Сброс полей
        const searchInput = document.getElementById('task-search');
        if (searchInput) searchInput.value = '';

        const filterSelects = ['filter-assignee', 'filter-tag', 'filter-status', 'filter-date'];
        filterSelects.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                // Очищаем кастомный селектор тегов если есть
                if (id === 'filter-tag') {
                    const customSelector = element.parentElement.querySelector('.custom-tag-selector');
                    if (customSelector && customSelector.resetSelection) {
                        customSelector.resetSelection();
                    }
                }

                // Очищаем фильтр исполнителя (input или select)
                if (id === 'filter-assignee') {
                    element.value = '';
                    // Очищаем скрытое поле исполнителя
                    const assigneeHidden = document.getElementById('filter-assignee-hidden');
                    if (assigneeHidden) {
                        assigneeHidden.value = '';
                    }
                    // Сбрасываем стили для input
                    if (element.tagName === 'INPUT') {
                        element.classList.remove('has-value');
                        const filterGroup = element.closest('.filter-group');
                        if (filterGroup) {
                            filterGroup.classList.remove('assignee-active');
                        }
                    }
                } else if (element.multiple) {
                    // Очищаем множественный выбор
                    Array.from(element.options).forEach(option => option.selected = false);
                } else {
                    element.value = '';
                }
            }
        });

        // Сброс объекта фильтров
        searchFiltersObj = {
            text: '',
            assignee: '',
            tags: [],
            status: '',
            date: ''
        };

        // Сброс состояния поиска
        searchState.isActive = false;
        searchState.lastFilters = null;

        // Показываем все задачи
        const tasks = document.querySelectorAll('.kanban-task');
        tasks.forEach(task => {
            task.classList.remove('search-hidden', 'filtered-out');
        });

        // Показываем все колонки
        const columns = document.querySelectorAll('.kanban-column');
        columns.forEach(col => col.style.display = '');
        const board = document.getElementById('kanban-board');
        if (board) board.classList.remove('single-column');

        // Убираем индикатор активных фильтров
        const searchPanel = document.querySelector('.search-panel');
        if (searchPanel) {
            searchPanel.classList.remove('has-active-filters');
        }

        // Обновление UI
        updateSearchStats(tasks.length, tasks.length);
        updateClearButton();
        hideNoResultsMessage();
    }

    // Обновление кнопки очистки поиска
    function updateClearButton() {
        const clearBtn = document.getElementById('clear-search');
        const searchInput = document.getElementById('task-search');

        if (clearBtn && searchInput) {
            clearBtn.style.display = searchInput.value ? 'block' : 'none';
        }
    }

    // Debounce функция
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func.apply(this, args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Горячие клавиши
    function initHotkeys() {
        document.addEventListener('keydown', function (e) {
            // Ctrl/Cmd + K для фокуса на поиск
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = document.getElementById('task-search');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }

            // Escape для очистки поиска или снятия фокуса
            if (e.key === 'Escape') {
                const searchInput = document.getElementById('task-search');
                if (searchInput && document.activeElement === searchInput) {
                    if (searchInput.value) {
                        searchInput.value = '';
                        searchFiltersObj.text = '';
                        searchState.isActive = hasOtherActiveFilters();
                        searchState.lastFilters = searchState.isActive ? { ...searchFiltersObj } : null;
                        performSearch();
                        updateClearButton();
                    } else {
                        searchInput.blur();
                    }
                }
            }
        });
    }

    // Добавление CSS стилей для поиска
    function addSearchStyles() {
        if (document.getElementById('search-panel-styles')) return;

        const style = document.createElement('style');
        style.id = 'search-panel-styles';
        style.textContent = `
            .kanban-task.search-hidden {
                display: none !important;
            }
            
            .search-panel.has-active-filters {
                border: 1px solid rgba(82, 113, 255, 0.2);
                margin-bottom: 10px;
            }
            
            .kanban-board.single-column {
                justify-content: center;
            }
            
            .kanban-board.single-column .kanban-column {
                max-width: 400px;
            }
            
            .no-search-results {
                text-align: center;
                padding: 40px;
                color: #666;
                grid-column: 1 / -1;
            }
            
            .no-search-results .material-icons {
                font-size: 48px;
                margin-bottom: 16px;
                color: #ccc;
            }
        `;
        document.head.appendChild(style);
    }

    // Инициализация при загрузке страницы
    document.addEventListener('DOMContentLoaded', function () {
        addSearchStyles();
        initSearchPanel();
        initHotkeys();

        // Переинициализация фильтров после загрузки данных
        setTimeout(() => {
            populateFilters();
            // Обновляем статистику при первой загрузке
            updateInitialStats();
        }, 1000);

        // Дополнительная проверка каждые 500мс первые 5 секунд
        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            if (window.TASKS && window.TASKS.length > 0) {
                populateFilters();
                updateInitialStats();
                clearInterval(checkInterval);
            } else if (attempts >= 10) {
                clearInterval(checkInterval);
            }
        }, 500);
    });

    // Также инициализируем после загрузки данных через Socket.IO
    if (typeof socket !== 'undefined') {
        socket.on('connect', function () {
            setTimeout(() => {
                populateFilters();
            }, 2000);
        });
    }

    // Инициализация при изменении данных
    if (typeof window !== 'undefined') {
        window.addEventListener('teamDataLoaded', function () {
            setTimeout(() => {
                populateFilters();
            }, 300);
        });
    }

    // После каждого рендера доски вызываем обновление фильтров
    if (typeof window !== 'undefined') {
        window.addEventListener('kanbanBoardRendered', function () {
            setTimeout(() => {
                populateFilters();
            }, 100);
        });

        // НОВЫЙ слушатель для события загрузки данных команды
        window.addEventListener('teamDataLoaded', function () {
            populateFilters();
        });
    }

    // ДОПОЛНИТЕЛЬНАЯ инициализация для командной доски
    if (isTeamBoard) {
        // Проверяем каждые 1 секунду первые 5 секунд
        let teamBoardAttempts = 0;
        const teamBoardCheckInterval = setInterval(() => {
            teamBoardAttempts++;

            if (window.MEMBERS && Array.isArray(window.MEMBERS) && window.MEMBERS.length > 0) {
                populateFilters();
                clearInterval(teamBoardCheckInterval);
            } else if (teamBoardAttempts >= 5) {
                clearInterval(teamBoardCheckInterval);
            }
        }, 1000);
    }

    // Создание кастомного селектора тегов
    function createCustomTagSelector(originalSelect, tags) {
        // Скрываем оригинальный select
        originalSelect.style.display = 'none';

        // Создаем контейнер
        const container = document.createElement('div');
        container.className = 'custom-tag-selector';

        // Создаем кнопку
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'tag-selector-button';
        button.innerHTML = `
            <div class="tag-selector-text">
                <span class="placeholder-text">Выберите теги</span>
                <div class="selected-tags" style="display: none;"></div>
            </div>
            <span class="material-icons tag-selector-arrow">keyboard_arrow_down</span>
        `;

        // Создаем dropdown
        const dropdown = document.createElement('div');
        dropdown.className = 'tag-selector-dropdown';

        tags.forEach(tag => {
            const option = document.createElement('div');
            option.className = 'tag-option';
            option.dataset.value = tag;
            option.dataset.tag = tag; // ДОБАВЛЕНО: для цветового оформления
            option.innerHTML = `
                <div class="tag-checkbox">
                    <span class="material-icons">check</span>
                </div>
                <span class="tag-label">${tag}</span>
            `;
            dropdown.appendChild(option);
        });

        container.appendChild(button);
        container.appendChild(dropdown);
        originalSelect.parentElement.appendChild(container);

        // Состояние
        let selectedTags = [];
        let isOpen = false;

        // Обработчики событий
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleDropdown();
        });

        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
            const option = e.target.closest('.tag-option');
            if (option) {
                toggleTag(option.dataset.value);
            }
        });

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                closeDropdown();
            }
        });

        function toggleDropdown() {
            isOpen = !isOpen;
            button.classList.toggle('open', isOpen);
            dropdown.classList.toggle('show', isOpen);
        }

        function closeDropdown() {
            isOpen = false;
            button.classList.remove('open');
            dropdown.classList.remove('show');
        }

        function toggleTag(tagValue) {
            const index = selectedTags.indexOf(tagValue);
            const option = dropdown.querySelector(`[data-value="${tagValue}"]`);

            if (index > -1) {
                selectedTags.splice(index, 1);
                option.classList.remove('selected');
            } else {
                selectedTags.push(tagValue);
                option.classList.add('selected');
            }

            updateButton();
            updateOriginalSelect();

            // Обновляем фильтры
            searchFiltersObj.tags = [...selectedTags];
            searchState.isActive = true;
            searchState.lastFilters = { ...searchFiltersObj };
            performSearch();
        }

        function updateButton() {
            const placeholderText = button.querySelector('.placeholder-text');
            const selectedTagsContainer = button.querySelector('.selected-tags');

            if (selectedTags.length === 0) {
                placeholderText.style.display = 'block';
                selectedTagsContainer.style.display = 'none';
                button.classList.remove('has-selections');
            } else {
                placeholderText.style.display = 'none';
                selectedTagsContainer.style.display = 'flex';
                button.classList.add('has-selections');

                selectedTagsContainer.innerHTML = selectedTags.map(tag =>
                    `<span class="selected-tag-badge" data-tag="${tag}">${tag}</span>`
                ).join('');
            }
        }

        function updateOriginalSelect() {
            // Обновляем скрытый select для совместимости
            Array.from(originalSelect.options).forEach(option => {
                option.selected = selectedTags.includes(option.value);
            });
        }

        // Метод для сброса
        container.resetSelection = function () {
            selectedTags = [];
            dropdown.querySelectorAll('.tag-option').forEach(option => {
                option.classList.remove('selected');
            });
            updateButton();
            updateOriginalSelect();
        };

        // Обработка кликов по дополнительным пунктам
        const extra = originalSelect.parentNode.querySelector('.assignee-filter-extra');
        if (extra) {
            extra.querySelectorAll('.autocomplete-item').forEach(item => {
                item.onclick = function () {
                    if (item.dataset.id === '__none__') {
                        originalSelect.value = 'Не назначено';
                        assigneeHidden.value = '__none__';
                        searchFiltersObj.assignee = '__none__';
                    } else if (item.dataset.id === '__all__') {
                        originalSelect.value = '';
                        assigneeHidden.value = '';
                        searchFiltersObj.assignee = '';
                    }
                    searchState.isActive = hasOtherActiveFilters();
                    searchState.lastFilters = { ...searchFiltersObj };
                    performSearch();
                };
            });
        }

        return container;
    }

    // Показ уведомления поиска
    function showSearchNotification(title, message, icon = 'info') {
        // Удаляем существующее уведомление
        const existing = document.querySelector('.search-notification');
        if (existing) {
            existing.remove();
        }

        // Создаем новое уведомление
        const notification = document.createElement('div');
        notification.className = 'search-notification';
        notification.innerHTML = `
            <span class="material-icons notification-icon">${icon}</span>
            <div class="notification-content">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
            <button class="notification-close">
                <span class="material-icons">close</span>
            </button>
        `;

        document.body.appendChild(notification);

        // Показываем с анимацией
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);

        // Автоскрытие через 4 секунды
        setTimeout(() => {
            if (notification.parentElement) {
                notification.classList.remove('show');
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 4000);

        // Обработчик кнопки закрытия
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        });
    }

    // Простое автодополнение для фильтра исполнителя (как в модалках)
    function setupAssigneeAutocompleteSimple(assigneeInput, assigneeHidden, autocomplete) {
        assigneeInput.oninput = function () {
            let val = assigneeInput.value.toLowerCase();
            let list = [];
            if (window.MEMBERS && Array.isArray(window.MEMBERS)) {
                list = window.MEMBERS.filter((m) => m && m.username && m.username.toLowerCase().includes(val));
            }
            list = list.slice(0, 5); // Ограничиваем до 5 совпадений
            // --- Формируем выпадающий список ---
            let html = '';
            // Всегда первым — Все исполнители
            html += `<div class='autocomplete-item' data-id='__all__'><span class='material-icons'>group</span> Все исполнители</div>`;
            // Вторым — Не назначено
            html += `<div class='autocomplete-item' data-id='__none__'><span class='material-icons'>person_off</span> Не назначено</div>`;
            if (list.length > 0) {
                html += `<div class='autocomplete-divider'></div>`;
                html += list.map((m) => {
                    let avatarHtml = '';
                    if (m.avatar_url) {
                        avatarHtml = `<img src='${m.avatar_url}' alt='${m.username}' class='autocomplete-avatar-img' />`;
                    } else {
                        const color = window.getAvatarColor ? window.getAvatarColor(m.username) : '#bbb';
                        const initials = window.getInitials ? window.getInitials(m.username) : (m.username || '?')[0].toUpperCase();
                        avatarHtml = `<span class='autocomplete-avatar-initial' style='background:${color}'>${initials}</span>`;
                    }
                    return `<div class='autocomplete-item' data-id='${m.id}'>${avatarHtml} ${m.username}</div>`;
                }).join('');
            }
            autocomplete.innerHTML = html;
            autocomplete.style.display = 'block';
            // --- Обработка выбора ---
            autocomplete.querySelectorAll('.autocomplete-item').forEach((item) => {
                item.onclick = function () {
                    if (item.dataset.id === '__all__') {
                        assigneeInput.value = '';
                        assigneeHidden.value = '';
                        searchFiltersObj.assignee = '';
                    } else if (item.dataset.id === '__none__') {
                        assigneeInput.value = 'Не назначено';
                        assigneeHidden.value = '__none__';
                        searchFiltersObj.assignee = '__none__';
                    } else {
                        assigneeInput.value = item.textContent.trim();
                        assigneeHidden.value = item.dataset.id;
                        searchFiltersObj.assignee = { id: item.dataset.id, username: item.textContent.trim() };
                    }
                    searchState.isActive = hasOtherActiveFilters();
                    searchState.lastFilters = { ...searchFiltersObj };
                    autocomplete.style.display = 'none';
                    performSearch();
                };
            });
        };
        assigneeInput.onfocus = function () {
            assigneeInput.oninput();
        };
        assigneeInput.onblur = function () {
            setTimeout(() => {
                autocomplete.style.display = 'none';
            }, 120);
        };
    }

    // Экспорт функций для внешнего использования
    window.searchPanel = {
        performSearch,
        resetAllFilters,
        populateFilters,
        restoreSearchState,
        hasActiveFilters,
        updateInitialStats
    };

})(); 