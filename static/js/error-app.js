// ========== ERROR PAGE FUNCTIONALITY ==========

document.addEventListener('DOMContentLoaded', function () {
    initErrorPage();
});

function initErrorPage() {
    const phrases = [
        "Всё получится! Даже если не с первого раза",
        "Мы рядом, если что-то пошло не так!",
        "Ошибки — это опыт. А опыт — это сила!",
        "Сделаем этот день лучше вместе!",
        "Пусть сегодня всё получится!",
        "Вдох-выдох. Всё под контролем!",
        "Ты не один — мы всегда поможем!",
        "Каждая ошибка — шаг к успеху!",
        "Улыбнись, всё будет хорошо!",
        "Главное — не сдаваться!"
    ];

    const supportPhraseElement = document.getElementById('support-phrase');
    if (supportPhraseElement) {
        const randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
        supportPhraseElement.innerText = randomPhrase;
    }
} 