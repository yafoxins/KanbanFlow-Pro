// ===== Список стран =====
const COUNTRIES = [
    "Россия",
    "Украина",
    "Беларусь",
    "Казахстан",
    "США",
    "Германия",
    "Франция",
    "Италия",
    "Испания",
    "Великобритания",
    "Китай",
    "Япония",
    "Южная Корея",
    "Канада",
    "Польша",
    "Латвия",
    "Литва",
    "Эстония",
    "Армения",
    "Грузия",
    "Израиль",
    "Турция",
    "Бразилия",
    "Аргентина",
    "Индия",
    "Австралия",
    "Швеция",
    "Норвегия",
    "Дания",
    "Финляндия",
    "Швейцария",
    "Австрия",
    "Бельгия",
    "Чехия",
    "Словакия",
    "Венгрия",
    "Румыния",
    "Болгария",
    "Хорватия",
    "Сербия",
    "Словения",
    "Черногория",
    "Кипр",
    "Греция",
    "Португалия",
    "Нидерланды",
    "Ирландия",
    "Мексика",
    "ЮАР",
];

// -- Селект стран: правильный placeholder --
function fillCountryOptions(sel) {
    sel.innerHTML =
        '<option value="" disabled selected hidden>Страна...</option>' +
        COUNTRIES.map((c) => `<option>${c}</option>`).join("");
}

// ======= UX-логика: Username check, Login, Register =======
const userForm = document.getElementById("user-form");
const usernameInput = document.getElementById("username-input");
const loginArea = document.getElementById("login-area");
const loginPassword = document.getElementById("login-password");
const usernameNextBtn = document.getElementById("username-next-btn");
const loginBtn = document.getElementById("login-btn");
const loginError = document.getElementById("login-error");
let currentUser = null;

// После проверки username — показываем логин или регистрацию
userForm.onsubmit = async function (e) {
    e.preventDefault();
    if (loginArea.classList.contains("visible")) {
        return;
    }
    const username = usernameInput.value.trim();
    if (!username.match(/^[a-zA-Z0-9_-]{2,32}$/)) return;

    try {
        let r = await fetch(`/api/check_user/${username}`);
        let { exists } = await r.json();
        if (exists) {
            loginArea.classList.add("visible");
            usernameNextBtn.style.display = "none";
            loginPassword.value = "";
            loginError.innerText = "";
            setTimeout(() => loginPassword.focus(), 50);
            currentUser = username;
        } else {
            openRegisterModal(username);
        }
    } catch (error) {
        // В случае ошибки показываем форму регистрации
        openRegisterModal(username);
    }
};

loginBtn.onclick = async function (e) {
    e.preventDefault();
    loginBtn.disabled = true;
    loginBtn.innerHTML =
        '<span class="material-icons">hourglass_top</span><span class="btn-text">Вход...</span>';
    loginError.innerText = "";
    const password = loginPassword.value;
    let resp = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: currentUser, password }),
    });
    loginBtn.disabled = false;
    loginBtn.innerHTML =
        '<span class="material-icons">login</span><span class="btn-text">Войти в доску</span>';
    if (resp.ok) {
        window.location.href = `/${currentUser}/kanban`;
    } else {
        loginError.innerText = "Неверный пароль!";
        loginPassword.value = "";
        loginPassword.focus();
    }
};

loginPassword.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
        loginBtn.click();
    }
});

function openRegisterModal(username) {
    const modal = document.getElementById("register-modal");
    const title = document.getElementById("register-title");
    const form = document.getElementById("register-form");

    if (!modal || !title || !form) {
        return;
    }

    modal.style.display = "flex";
    title.innerText = `Создать доску для "${username}"`;
    form.reset();
    document.getElementById("register-error").innerText = "";
    fillCountryOptions(document.querySelector("#register-form select"));
    document.querySelector("#register-form [name=fullname]").value = username;
}

function closeRegisterModal() {
    document.getElementById("register-modal").style.display = "none";
    usernameNextBtn.style.display = "";
    loginArea.classList.remove("visible");
    loginPassword.value = "";
    loginError.innerText = "";
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    // Заполняем селект стран
    fillCountryOptions(document.querySelector("#register-form select"));

    // Обработчик формы регистрации
    document.getElementById("register-form").onsubmit = async function (e) {
        e.preventDefault();
        let f = this;
        let password = f.password.value;
        let password2 = f.password2.value;
        if (password !== password2) {
            document.getElementById("register-error").innerText =
                "Пароли не совпадают!";
            return;
        }
        let btn = document.getElementById("register-btn-text");
        btn.innerText = "Создание...";
        let body = {
            username: (() => {
                const titleText = document.querySelector("#register-title").innerText;
                const match = titleText.match(/"([^"]+)"/);
                return match ? match[1] : usernameInput.value.trim();
            })(),
            password,
            email: f.email.value,
            country: f.country.value,
            fullname: f.fullname.value,
        };
        let resp = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        btn.innerText = "Создать";
        if (resp.ok) {
            window.location.href = `/${body.username}/kanban`;
        } else {
            // Получаем конкретное сообщение об ошибке от сервера
            try {
                const errorData = await resp.json();
                document.getElementById("register-error").innerText = errorData.error || "Ошибка регистрации!";
            } catch (e) {
                document.getElementById("register-error").innerText = "Ошибка регистрации!";
            }
        }
    };

    // Закрытие модалки по клику вне её
    document.getElementById("register-modal").onclick = function (e) {
        if (e.target === this) closeRegisterModal();
    };

    // Сброс формы при изменении username
    usernameInput.oninput = function () {
        usernameNextBtn.style.display = "";
        loginArea.classList.remove("visible");
        loginPassword.value = "";
        loginError.innerText = "";
    };

    // Анимации при загрузке
    const heroContent = document.querySelector('.hero-content');
    const featuresSection = document.querySelector('.features-section');

    setTimeout(() => {
        heroContent.classList.add('animate-in');
    }, 100);

    setTimeout(() => {
        featuresSection.classList.add('animate-in');
    }, 300);
});

// Глобальные функции для inline-обработчиков
window.closeRegisterModal = closeRegisterModal; 