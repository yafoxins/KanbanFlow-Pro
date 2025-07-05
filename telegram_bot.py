#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import asyncio
import logging
from typing import Optional
import psycopg2
from telegram import Update, Bot, InlineKeyboardMarkup, InlineKeyboardButton
from telegram.ext import Application, CommandHandler, ContextTypes
import signal
import sys
import requests
import schedule
import time
import threading
from datetime import datetime, timedelta

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class TelegramBot:
    def __init__(self, *args, **kwargs):
        self.logger = logging.getLogger(__name__)
        self.application: Optional[Application] = None
        self.bot: Optional[Bot] = None
        self.running = False
        
    def get_bot_token(self):
        """Получение токена бота из переменных окружения"""
        return os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
    
    def get_database_url(self):
        """Получение URL базы данных из переменных окружения"""
        return os.environ.get('DATABASE_URL', 'postgres://kanban_user:kanban_pass@localhost:5432/kanban_db')
        
    def get_db_connection(self):
        """Получение соединения с базой данных"""
        try:
            database_url = self.get_database_url()
            conn = psycopg2.connect(database_url)
            return conn
        except Exception as e:
            self.logger.error(f"🔴 БД: Ошибка подключения к базе данных: {e}")
            return None
    
    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Обработчик команды /start"""
        try:
            user_id = update.effective_user.id
            username = update.effective_user.username
            
            # Проверяем, есть ли токен привязки
            if context.args and len(context.args) > 0:
                link_token = context.args[0]
                self.logger.info(f"🔗 КОМАНДА: /start с токеном привязки от @{username} (ID: {user_id})")
                success = await self.process_link_token(user_id, username, link_token)
                if success:
                    await update.message.reply_text(
                        "✅ **Привязка успешно выполнена!**\n\n"
                        "Теперь вы будете получать уведомления о:\n"
                        "• Назначении новых задач\n"
                        "• Упоминаниях в комментариях\n"
                        "• Важных событиях в команде\n\n"
                        f"Ваш Telegram ID: `{user_id}`",
                        parse_mode='Markdown'
                    )
                    return
                else:
                    await update.message.reply_text(
                        "❌ **Ошибка привязки**\n\n"
                        "Токен недействителен или истёк.\n"
                        "Попробуйте сгенерировать новый токен в профиле на сайте.",
                        parse_mode='Markdown'
                    )
                    return
            
            # Обычное приветствие без токена
            self.logger.info(f"👋 КОМАНДА: /start от @{username} (ID: {user_id})")
            await update.message.reply_text(
                f"Привет! Я бот канбан-доски.\n"
                f"Ваш Telegram ID: `{user_id}`\n\n"
                f"🔗 **Для получения уведомлений:**\n"
                f"1. Зайдите в профиль на канбан-доске\n"
                f"2. Нажмите кнопку '🔗 Привязать Telegram'\n"
                f"3. Перейдите по ссылке и нажмите 'Start'\n\n"
                f"📋 **Команды:**\n"
                f"/start - начать работу\n"
                f"/myid - показать ваш ID",
                parse_mode='Markdown'
            )
            
        except Exception as e:
            self.logger.error(f"🔴 ОШИБКА: Команда /start: {e}")
    
    async def process_link_token(self, telegram_user_id: int, telegram_username: str, link_token: str):
        """Обработка токена привязки"""
        try:
            conn = self.get_db_connection()
            if not conn:
                self.logger.error("🔴 БД: Не удалось подключиться к БД для обработки токена")
                return False
            
            cur = conn.cursor()
            
            # Ищем действительный токен
            cur.execute('''
                SELECT user_id FROM telegram_link_tokens 
                WHERE token=%s AND NOT used AND expires_at > NOW()
            ''', (link_token,))
            
            token_row = cur.fetchone()
            if not token_row:
                self.logger.warning(f"⚠️ ТОКЕН: Недействительный или истёкший токен: {link_token}")
                cur.close()
                conn.close()
                return False
            
            user_id = token_row[0]
            
            # Проверяем, не привязан ли уже этот Telegram ID к другому пользователю
            cur.execute('SELECT username FROM users WHERE telegram_id=%s AND id!=%s', (str(telegram_user_id), user_id))
            existing_user = cur.fetchone()
            if existing_user:
                self.logger.warning(f"⚠️ ПРИВЯЗКА: Telegram ID {telegram_user_id} уже привязан к пользователю {existing_user[0]}")
                cur.close()
                conn.close()
                return False
            
            # Привязываем Telegram ID и username к пользователю
            cur.execute('UPDATE users SET telegram_id=%s, telegram_username=%s WHERE id=%s', (str(telegram_user_id), telegram_username, user_id))
            
            # Отмечаем токен как использованный
            cur.execute('UPDATE telegram_link_tokens SET used=TRUE WHERE token=%s', (link_token,))
            
            # Получаем имя пользователя для логирования
            cur.execute('SELECT username FROM users WHERE id=%s', (user_id,))
            username_row = cur.fetchone()
            username = username_row[0] if username_row else 'неизвестный'
            
            conn.commit()
            cur.close()
            conn.close()
            
            self.logger.info(f"✅ ПРИВЯЗКА: Успешно привязан пользователь {username} -> @{telegram_username} (ID: {telegram_user_id})")
            return True
            
        except Exception as e:
            self.logger.error(f"🔴 ОШИБКА: Обработка токена привязки: {e}")
            if 'conn' in locals() and conn:
                try:
                    conn.rollback()
                    conn.close()
                except Exception:
                    pass
            return False
    
    async def myid_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        """Показать ID пользователя"""
        try:
            user_id = update.effective_user.id
            username = update.effective_user.username
            self.logger.info(f"🆔 КОМАНДА: /myid от @{username} (ID: {user_id})")
            await update.message.reply_text(
                f"Ваш Telegram ID: `{user_id}`\n\n"
                f"🔗 **Для привязки аккаунта:**\n"
                f"1. Зайдите в профиль на канбан-доске\n"
                f"2. Нажмите кнопку '🔗 Привязать Telegram'\n"
                f"3. Перейдите по ссылке и нажмите 'Start'",
                parse_mode='Markdown'
            )
        except Exception as e:
            self.logger.error(f"🔴 ОШИБКА: Команда /myid: {e}")
    
    def format_notification(self, notif_type, message, link=None, from_username=None, team_name=None, task_text=None):
        """Формирует красивое уведомление для Telegram по типу"""
        if notif_type == 'assigned':
            # Назначена задача
            text = (
                f"📝 *Вам назначена задача!*\n"
                f"*Задача:* _{task_text}_\n"
                f"*Команда:* _{team_name}_"
            )
            if from_username:
                text += f"\n*Назначил:* @{from_username}"
            if link:
                text += f"\n\n[Открыть задачу]({link})"
            return text
        elif notif_type == 'mention':
            # Упоминание в комментарии
            text = (
                f"💬 *Вас упомянули в комментарии!*\n"
                f"*Задача:* _{task_text}_\n"
                f"*Команда:* _{team_name}_"
            )
            if from_username:
                text += f"\n*Кто упомянул:* @{from_username}"
            if link:
                text += f"\n\n[Перейти к задаче]({link})"
            return text
        else:
            # По умолчанию — просто текст
            text = f"🔔 *Уведомление*\n\n{message}"
            if link:
                text += f"\n\n[Открыть]({link})"
            return text
    
    async def send_notification(self, telegram_id: str, message: str, link: Optional[str] = None, notif_type: Optional[str] = None, from_username: Optional[str] = None, team_name: Optional[str] = None, task_text: Optional[str] = None):
        """Отправка красивого уведомления пользователю с кнопкой"""
        if not self.bot:
            self.logger.error("🔴 БОТ: Бот не инициализирован")
            return False
        try:
            if telegram_id.startswith('@'):
                self.logger.warning(f"⚠️ ОТПРАВКА: Нельзя отправить уведомление по username: {telegram_id}")
                return False
            try:
                chat_id = int(telegram_id)
            except ValueError:
                self.logger.error(f"🔴 ОТПРАВКА: Неверный формат Telegram ID: {telegram_id}")
                return False
            # Формируем красивое сообщение
            full_message = self.format_notification(notif_type, message, link, from_username, team_name, task_text)
            # Кнопка, если есть ссылка
            reply_markup = None
            if link:
                if link.startswith('/'):
                    base_url = os.environ.get('BASE_URL', 'http://localhost:5000')
                    link = f"{base_url}{link}"
                reply_markup = InlineKeyboardMarkup([
                    [InlineKeyboardButton("Открыть задачу", url=link)]
                ])
            await self.bot.send_message(
                chat_id=chat_id,
                text=full_message,
                parse_mode='Markdown',
                disable_web_page_preview=True,
                reply_markup=reply_markup
            )
            self.logger.info(f"📨 ОТПРАВКА: Уведомление отправлено пользователю {telegram_id}")
            return True
        except Exception as e:
            self.logger.error(f"🔴 ОШИБКА: Отправка уведомления в Telegram: {e}")
            return False
    
    async def process_notifications_queue(self):
        """Обработка очереди уведомлений из базы данных"""
        self.logger.info("🔄 ОЧЕРЕДЬ: Запуск обработки очереди уведомлений")
        while self.running:
            try:
                conn = self.get_db_connection()
                if not conn:
                    await asyncio.sleep(10)
                    continue
                cur = conn.cursor()
                # Получаем необработанные уведомления
                cur.execute("""
                    SELECT n.id, n.type, n.message, n.link, u.telegram_id, u.telegram_username, u.username, n.team_id, n.task_id
                    FROM notifications n
                    JOIN users u ON n.user_id = u.id
                    WHERE u.telegram_id IS NOT NULL 
                    AND u.telegram_id != ''
                    AND NOT EXISTS (
                        SELECT 1 FROM telegram_notifications tn 
                        WHERE tn.notification_id = n.id
                    )
                    ORDER BY n.created_at ASC
                    LIMIT 10
                """)
                notifications = cur.fetchall()
                if notifications:
                    self.logger.info(f"📋 ОЧЕРЕДЬ: Обрабатываем {len(notifications)} уведомлений")
                for notification in notifications:
                    notif_id, notif_type, message, link, telegram_id, telegram_username, to_username, team_id, task_id = notification
                    # Получаем from_username, team_name, task_text для шаблона
                    from_username = None
                    team_name = None
                    task_text = None
                    # from_user_id
                    cur.execute('SELECT from_user_id FROM notifications WHERE id=%s', (notif_id,))
                    row = cur.fetchone()
                    from_user_id = row[0] if row else None
                    if from_user_id:
                        cur.execute('SELECT username FROM users WHERE id=%s', (from_user_id,))
                        row = cur.fetchone()
                        if row:
                            from_username = row[0]
                    if team_id:
                        cur.execute('SELECT name FROM teams WHERE id=%s', (team_id,))
                        row = cur.fetchone()
                        if row:
                            team_name = row[0]
                    if task_id:
                        cur.execute('SELECT text FROM team_tasks WHERE id=%s', (task_id,))
                        row = cur.fetchone()
                        if row:
                            task_text = row[0]
                    # Отправляем красивое уведомление
                    success = await self.send_notification(telegram_id, message, link, notif_type, from_username, team_name, task_text)
                    # Записываем результат в таблицу telegram_notifications
                    cur.execute("""
                        INSERT INTO telegram_notifications (notification_id, telegram_id, sent_at, success)
                        VALUES (%s, %s, NOW(), %s)
                        ON CONFLICT (notification_id) DO NOTHING
                    """, (notif_id, telegram_id, success))
                conn.commit()
                cur.close()
                conn.close()
            except Exception as e:
                self.logger.error(f"🔴 ОШИБКА: Обработка очереди уведомлений: {e}")
                if 'conn' in locals() and conn:
                    try:
                        conn.close()
                    except Exception:
                        pass
            await asyncio.sleep(5)  # Проверяем каждые 5 секунд
    
    async def start_bot(self):
        """Запуск бота"""
        bot_token = self.get_bot_token()
        
        if not bot_token:
            self.logger.error("🔴 ТОКЕН: TELEGRAM_BOT_TOKEN не задан")
            self.logger.info("🔍 ПРОВЕРКА: Доступные переменные окружения:")
            for key, value in os.environ.items():
                if 'TELEGRAM' in key.upper():
                    self.logger.info(f"  {key}={value[:10]}..." if len(value) > 10 else f"  {key}={value}")
            return False
        
        self.logger.info(f"🔑 ТОКЕН: Используем токен: {bot_token[:10]}...{bot_token[-4:]}")
        
        # Проверяем подключение к базе данных
        database_url = self.get_database_url()
        self.logger.info(f"🗄️ БД: Подключение к базе данных: {database_url[:50]}...")
        
        try:
            # Создаем приложение
            self.application = Application.builder().token(bot_token).build()
            self.bot = self.application.bot
            
            # Проверяем токен
            bot_info = await self.bot.get_me()
            self.logger.info(f"🤖 БОТ: Инициализирован @{bot_info.username} ({bot_info.first_name})")
            
            # Добавляем обработчики команд
            self.application.add_handler(CommandHandler("start", self.start_command))
            self.application.add_handler(CommandHandler("myid", self.myid_command))
            
            self.running = True
            
            # Создаем таблицу для отслеживания отправленных уведомлений
            await self.create_telegram_notifications_table()
            
            # Запускаем бота
            self.logger.info("🚀 ЗАПУСК: Запуск Telegram бота...")
            await self.application.initialize()
            await self.application.start()
            
            # Запускаем обработку уведомлений в фоне
            asyncio.create_task(self.process_notifications_queue())
            
            # Начинаем polling
            await self.application.updater.start_polling()
            
            self.logger.info("✅ ГОТОВ: Telegram бот запущен успешно!")
            
            # Ждем сигнала для остановки
            await self.wait_for_shutdown()
            
            return True
            
        except Exception as e:
            self.logger.error(f"🔴 ОШИБКА: Запуск бота: {e}")
            return False
    
    async def create_telegram_notifications_table(self):
        """Создание таблицы для отслеживания отправленных уведомлений"""
        try:
            conn = self.get_db_connection()
            if not conn:
                self.logger.warning("⚠️ БД: Не удалось подключиться к БД для создания таблицы")
                return
            
            cur = conn.cursor()
            cur.execute("""
                CREATE TABLE IF NOT EXISTS telegram_notifications (
                    id SERIAL PRIMARY KEY,
                    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
                    telegram_id TEXT NOT NULL,
                    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
                    success BOOLEAN NOT NULL DEFAULT FALSE,
                    UNIQUE(notification_id)
                )
            """)
            conn.commit()
            cur.close()
            conn.close()
            self.logger.info("✅ БД: Таблица telegram_notifications готова")
        except Exception as e:
            self.logger.error(f"🔴 ОШИБКА: Создание таблицы telegram_notifications: {e}")
    
    async def wait_for_shutdown(self):
        """Ожидание сигнала для остановки"""
        shutdown_event = asyncio.Event()
        
        def signal_handler():
            self.logger.info("⏹️ СИГНАЛ: Получен сигнал остановки")
            shutdown_event.set()
        
        # Настраиваем обработчики сигналов
        for sig in (signal.SIGTERM, signal.SIGINT):
            signal.signal(sig, lambda s, f: signal_handler())
        
        await shutdown_event.wait()
        await self.stop_bot()
    
    async def stop_bot(self):
        """Остановка бота"""
        self.logger.info("🛑 ОСТАНОВКА: Останавливаем бота...")
        self.running = False
        
        if self.application:
            try:
                await self.application.updater.stop()
                await self.application.stop()
                await self.application.shutdown()
                self.logger.info("✅ ОСТАНОВЛЕН: Telegram бот остановлен успешно")
            except Exception as e:
                self.logger.error(f"🔴 ОШИБКА: Остановка бота: {e}")

    def send_deadline_reminders(self):
        """Отправляет автоматические напоминания о дедлайнах (только командные задачи)"""
        self.logger.info("📅 ДЕДЛАЙНЫ: Проверка напоминаний о дедлайнах (БД)")
        try:
            conn = self.get_db_connection()
            if not conn:
                self.logger.error("🔴 БД: Не удалось подключиться к БД для дедлайнов")
                return
            cur = conn.cursor()
            cur.execute("""
                SELECT tt.id, tt.text, tt.due_date, tt.assignee_id, t.name as team_name, u.username as assignee_username, u.telegram_id
                FROM team_tasks tt
                JOIN users u ON tt.assignee_id = u.id
                JOIN teams t ON tt.team_id = t.id
                WHERE tt.due_date IS NOT NULL
                  AND tt.due_date >= CURRENT_DATE
                  AND tt.due_date <= CURRENT_DATE + INTERVAL '3 days'
                  AND tt.status NOT IN ('completed', 'done', 'finished')
                  AND u.telegram_id IS NOT NULL
            """)
            tasks = cur.fetchall()
            today = datetime.now().date()
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                for task in tasks:
                    due_date = task[2]
                    if isinstance(due_date, str):
                        due_date = datetime.strptime(due_date, '%Y-%m-%d').date()
                    days_until = (due_date - today).days
                    if days_until == 1:
                        emoji = "🚨"
                        urgency = "*КРИТИЧЕСКИЙ ДЕДЛАЙН!* Завтра"
                    elif days_until == 2:
                        emoji = "⚠️"
                        urgency = "*СРОЧНЫЙ ДЕДЛАЙН!* Через 2 дня"
                    else:
                        emoji = "📅"
                        urgency = "*Напоминание о дедлайне* Через 3 дня"
                    message = (
                        f"{emoji} {urgency}\n\n"
                        f"*Задача:* _{task[1]}_\n"
                        f"*Дедлайн:* {task[2]}\n"
                        f"*Команда:* {task[4]}\n\n"
                        f"💡 Не забудьте завершить задачу вовремя!"
                    )
                    try:
                        loop.run_until_complete(self.bot.send_message(
                            chat_id=task[6],
                            text=message,
                            parse_mode='Markdown',
                            disable_web_page_preview=True
                        ))
                        self.logger.info(f"📅 Напоминание отправлено для задачи {task[0]}")
                    except Exception as e:
                        self.logger.error(f"🔴 ОШИБКА: Отправка напоминания: {e}")
            finally:
                loop.close()
            cur.close()
            conn.close()
        except Exception as e:
            self.logger.error(f"🔴 ОШИБКА: Отправка напоминаний о дедлайнах (БД): {e}")

    def send_stuck_tasks_notification(self):
        """Отправить уведомления о зависших задачах (только командные задачи)"""
        self.logger.info("🕐 ЗАВИСШИЕ: Проверка зависших задач (БД)")
        try:
            conn = self.get_db_connection()
            if not conn:
                self.logger.error("🔴 БД: Не удалось подключиться к БД для зависших задач")
                return
            cur = conn.cursor()
            cur.execute("""
                SELECT tt.id, tt.text, tt.updated_at, tt.assignee_id, t.name as team_name, u.username as assignee_username, u.telegram_id
                FROM team_tasks tt
                JOIN users u ON tt.assignee_id = u.id
                JOIN teams t ON tt.team_id = t.id
                WHERE tt.updated_at < (CURRENT_DATE - INTERVAL '3 days')
                  AND tt.status NOT IN ('completed', 'done', 'finished')
                  AND u.telegram_id IS NOT NULL
            """)
            tasks = cur.fetchall()
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                for task in tasks:
                    updated_at = task[2]
                    if isinstance(updated_at, str):
                        updated_at = datetime.strptime(updated_at, '%Y-%m-%d %H:%M:%S')
                    days_stuck = (datetime.now() - updated_at).days
                    message = (
                        f"🚨 *Зависшая задача!*\n\n"
                        f"📋 *Задача:* _{task[1]}_\n"
                        f"👤 *Исполнитель:* {task[5]}\n"
                        f"🏢 *Команда:* {task[4]}\n"
                        f"⏰ *Не обновлялась:* {days_stuck} дней\n"
                        f"📅 *Последнее обновление:* {updated_at.strftime('%Y-%m-%d')}\n\n"
                        f"💡 *Рекомендуем обновить статус задачи или связаться с командой*"
                    )
                    try:
                        loop.run_until_complete(self.bot.send_message(
                            chat_id=task[6],
                            text=message,
                            parse_mode='Markdown',
                            disable_web_page_preview=True
                        ))
                        self.logger.info(f"🕐 Зависшая задача отправлена для {task[0]}")
                    except Exception as e:
                        self.logger.error(f"🔴 ОШИБКА: Отправка зависшей задачи: {e}")
            finally:
                loop.close()
            cur.close()
            conn.close()
        except Exception as e:
            self.logger.error(f"🔴 ОШИБКА: Отправка уведомлений о зависших задачах (БД): {e}")

    def send_weekly_reports(self):
        """Отправить еженедельные отчёты владельцам команд (только командные задачи)"""
        self.logger.info("📊 ОТЧЁТЫ: Проверка еженедельных отчётов (БД)")
        try:
            conn = self.get_db_connection()
            if not conn:
                self.logger.error("🔴 БД: Не удалось подключиться к БД для отчётов")
                return
            cur = conn.cursor()
            # Получаем все команды с их владельцами и telegram_id
            cur.execute("""
                SELECT t.id, t.name, u.username as leader_name, u.telegram_id
                FROM teams t
                JOIN users u ON t.leader_id = u.id
                WHERE u.telegram_id IS NOT NULL
            """)
            teams = cur.fetchall()
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                for team in teams:
                    team_id, team_name, team_leader, telegram_id = team
                    week_ago = (datetime.now() - timedelta(days=7))
                    # Всего задач
                    cur.execute("SELECT COUNT(*) FROM team_tasks WHERE team_id = %s", (team_id,))
                    total_tasks = cur.fetchone()[0]
                    # Завершено за неделю
                    cur.execute("""
                        SELECT COUNT(*) FROM team_tasks 
                        WHERE team_id = %s AND status IN ('completed', 'done', 'finished')
                        AND updated_at >= %s
                    """, (team_id, week_ago))
                    completed_this_week = cur.fetchone()[0]
                    # Новых за неделю
                    cur.execute("""
                        SELECT COUNT(*) FROM team_tasks 
                        WHERE team_id = %s AND updated_at >= %s
                    """, (team_id, week_ago))
                    new_this_week = cur.fetchone()[0]
                    # Зависших
                    cur.execute("""
                        SELECT COUNT(*) FROM team_tasks 
                        WHERE team_id = %s AND updated_at < (CURRENT_DATE - INTERVAL '3 days')
                        AND status NOT IN ('completed', 'done', 'finished')
                    """, (team_id,))
                    stuck_tasks = cur.fetchone()[0]
                    # Дедлайны на неделе
                    cur.execute("""
                        SELECT COUNT(*) FROM team_tasks 
                        WHERE team_id = %s AND due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '7 days')
                        AND status NOT IN ('completed', 'done', 'finished')
                    """, (team_id,))
                    due_this_week = cur.fetchone()[0]
                    # Топ-3 активных участника
                    cur.execute("""
                        SELECT u.username, COUNT(tt.id) as task_count
                        FROM users u
                        LEFT JOIN team_tasks tt ON u.id = tt.assignee_id AND tt.team_id = %s
                        WHERE u.id IN (SELECT user_id FROM team_members WHERE team_id = %s)
                        GROUP BY u.username
                        ORDER BY task_count DESC
                        LIMIT 3
                    """, (team_id, team_id))
                    top_members = cur.fetchall()
                    completion_rate = round((completed_this_week / max(total_tasks, 1)) * 100, 1)
                    completion_emoji = "🟢" if completion_rate >= 80 else "🟡" if completion_rate >= 50 else "🔴"
                    message = f"""📊 *Еженедельный отчёт команды*

🏢 *Команда:* {team_name}
👑 *Владелец:* {team_leader}
📅 *Период:* {week_ago.strftime('%Y-%m-%d')} - {datetime.now().strftime('%Y-%m-%d')}

📈 *Статистика:*
• 📋 Всего задач: {total_tasks}
• ✅ Завершено за неделю: {completed_this_week}
• 🆕 Новых задач: {new_this_week}
• 🚨 Зависших задач: {stuck_tasks}
• ⏰ Дедлайнов на неделю: {due_this_week}
• {completion_emoji} Процент выполнения: {completion_rate}%

🏆 *Топ участники:*\n"""
                    for i, member in enumerate(top_members, 1):
                        medal = "🥇" if i == 1 else "🥈" if i == 2 else "🥉"
                        message += f"{medal} {member[0]}: {member[1]} задач\n"
                    if stuck_tasks > 0:
                        message += f"\n⚠️ *Рекомендации:*\n• Обратите внимание на {stuck_tasks} зависших задач"
                    if completion_rate < 50:
                        message += f"\n• Увеличьте темп выполнения задач"
                    try:
                        loop.run_until_complete(self.bot.send_message(
                            chat_id=telegram_id,
                            text=message,
                            parse_mode='Markdown',
                            disable_web_page_preview=True
                        ))
                        self.logger.info(f"📊 Отчёт отправлен для команды {team_name}")
                    except Exception as e:
                        self.logger.error(f"🔴 ОШИБКА: Отправка отчёта: {e}")
            finally:
                loop.close()
            cur.close()
            conn.close()
        except Exception as e:
            self.logger.error(f"🔴 ОШИБКА: Отправка еженедельных отчётов (БД): {e}")

    def schedule_notifications(self):
        """Настроить расписание уведомлений"""
        # Дедлайны и зависшие задачи каждый день в 9:00
        schedule.every().day.at("09:00").do(self.send_deadline_reminders)
        schedule.every().day.at("09:00").do(self.send_stuck_tasks_notification)
        # Еженедельные отчёты только по понедельникам в 9:00
        schedule.every().monday.at("09:00").do(self.send_weekly_reports)
        self.logger.info("📅 РАСПИСАНИЕ: Настроено расписание уведомлений:")
        self.logger.info("   🕘 Напоминания о дедлайнах: каждый день в 9:00")
        self.logger.info("   🕘 Уведомления о зависших задачах: каждый день в 9:00")
        self.logger.info("   📊 Еженедельные отчёты: только по понедельникам в 9:00")
        # Запускаем планировщик в отдельном потоке
        def run_schedule():
            while True:
                schedule.run_pending()
                time.sleep(60)  # Проверяем каждую минуту
        scheduler_thread = threading.Thread(target=run_schedule, daemon=True)
        scheduler_thread.start()
        self.logger.info("✅ ПЛАНИРОВЩИК: Запущен в фоновом режиме")

async def main():
    """Главная функция"""
    logger.info("🚀 ИНИЦИАЛИЗАЦИЯ: Запуск Telegram бота...")
    
    # Проверяем переменные окружения при запуске
    bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
    if not bot_token:
        logger.error("🔴 ТОКЕН: TELEGRAM_BOT_TOKEN не задан. Бот не может быть запущен.")
        logger.info("🔍 ПРОВЕРКА: Убедитесь что:")
        logger.info("  1. Файл .env содержит TELEGRAM_BOT_TOKEN=ваш_токен")
        logger.info("  2. Переменная окружения установлена: export TELEGRAM_BOT_TOKEN=ваш_токен")
        sys.exit(1)
    
    logger.info(f"🔑 ТОКЕН: Используем токен: {bot_token[:10]}...{bot_token[-4:]}")
    
    # Проверяем подключение к базе данных
    database_url = os.environ.get('DATABASE_URL', 'postgres://kanban_user:kanban_pass@localhost:5432/kanban_db')
    logger.info(f"🗄️ БД: Подключение к базе данных: {database_url[:50]}...")
    
    try:
        # Создаем экземпляр бота
        bot = TelegramBot()
        
        # Запускаем планировщик напоминаний
        bot.schedule_notifications()
        
        # Запускаем бота
        await bot.start_bot()
        
    except KeyboardInterrupt:
        logger.info("⏹️ ПРЕРЫВАНИЕ: Получен сигнал остановки")
    except Exception as e:
        logger.error(f"🔴 КРИТИЧЕСКАЯ ОШИБКА: Запуск бота: {e}")
        sys.exit(1)
    finally:
        await bot.stop_bot()

if __name__ == "__main__":
    asyncio.run(main()) 