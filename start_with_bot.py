#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
import sys
import subprocess
import threading
import time
import signal
import logging

# Загружаем переменные из .env файла если он существует
def load_env_file():
    """Загрузка переменных окружения из .env файла"""
    env_file = '.env'
    if os.path.exists(env_file):
        print(f"📁 Найден файл {env_file}")
        loaded_vars = {}
        with open(env_file, 'r', encoding='utf-8') as f:
            for line_num, line in enumerate(f, 1):
                original_line = line
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    
                    # Специальная диагностика для TELEGRAM_BOT_TOKEN
                    if key == 'TELEGRAM_BOT_TOKEN':
                        print(f"🔍 Строка {line_num}: найден TELEGRAM_BOT_TOKEN")
                        print(f"   Исходная строка: '{original_line.strip()}'")
                        print(f"   Ключ: '{key}'")
                        print(f"   Значение: '{value[:10]}...{value[-4:]}' (длина: {len(value)})")
                    
                    if key not in os.environ:  # Не перезаписываем уже установленные переменные
                        os.environ[key] = value
                        loaded_vars[key] = value
                    else:
                        print(f"⚠️  Переменная {key} уже установлена в системе, пропускаем")
        
        print(f"✅ Загружено {len(loaded_vars)} переменных из {env_file}")
        
        # Проверяем что TELEGRAM_BOT_TOKEN действительно загружен
        final_token = os.environ.get('TELEGRAM_BOT_TOKEN', '')
        if final_token:
            print(f"✅ TELEGRAM_BOT_TOKEN установлен: {final_token[:10]}...{final_token[-4:]} (длина: {len(final_token)})")
        else:
            print(f"❌ TELEGRAM_BOT_TOKEN не установлен после загрузки")
            
    else:
        print(f"⚠️  Файл {env_file} не найден, используются значения по умолчанию")
        
    # Показываем все переменные связанные с Telegram
    print("🔍 Все переменные TELEGRAM_*:")
    telegram_vars = {k: v for k, v in os.environ.items() if 'TELEGRAM' in k.upper()}
    if telegram_vars:
        for key, value in telegram_vars.items():
            if len(value) > 10:
                print(f"   {key}={value[:10]}...{value[-4:]} (длина: {len(value)})")
            else:
                print(f"   {key}={value}")
    else:
        print("   (переменные не найдены)")

# Загружаем переменные окружения в самом начале
load_env_file()

# Настройка логирования
logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

class ProjectLauncher:
    def __init__(self):
        self.flask_process = None
        self.telegram_process = None
        self.running = True
        self.setup_environment()
        
    def setup_environment(self):
        """Настройка переменных окружения с значениями по умолчанию"""
        defaults = {
            'FLASK_HOST': '0.0.0.0',
            'FLASK_PORT': '5000',
            'FLASK_DEBUG': 'false',
            'DATABASE_URL': 'postgres://kanban_user:kanban_pass@db:5432/kanban_db',
            'SECRET_KEY': 'your-secret-key-change-this-in-production',
            'SESSION_LIFETIME': '1800',
            'UPLOAD_FOLDER': 'uploads',
            'MAX_CONTENT_LENGTH': '16777216'
        }
        
        for key, default_value in defaults.items():
            if key not in os.environ:
                os.environ[key] = default_value
                logger.debug(f"Установлено значение по умолчанию: {key}={default_value}")
        
    def start_flask_app(self):
        """Запуск Flask приложения"""
        try:
            logger.info("🌐 Запуск Flask приложения...")
            
            # Создаем директорию uploads если её нет
            upload_dir = os.environ.get('UPLOAD_FOLDER', 'uploads')
            if not os.path.exists(upload_dir):
                os.makedirs(upload_dir)
                logger.info(f"📁 Создана директория: {upload_dir}")
            
            env = os.environ.copy()
            self.flask_process = subprocess.Popen(
                [sys.executable, 'app.py'],
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1
            )
            
            # Читаем вывод Flask приложения
            for line in iter(self.flask_process.stdout.readline, ''):
                if line.strip():
                    logger.info(f"🌐 FLASK: {line.strip()}")
                if not self.running:
                    break
                    
        except Exception as e:
            logger.error(f"🔴 Ошибка запуска Flask: {e}")
    
    def start_telegram_bot(self):
        """Запуск Telegram бота"""
        try:
            # Проверяем наличие токена
            bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
            if not bot_token:
                logger.warning("⚠️ TELEGRAM_BOT_TOKEN не задан. Telegram бот не будет запущен.")
                logger.info("🔍 Для включения Telegram уведомлений:")
                logger.info("   1. Создайте бота через @BotFather в Telegram")
                logger.info("   2. Установите переменную TELEGRAM_BOT_TOKEN в .env файле")
                logger.info("   3. Перезапустите приложение")
                return
            
            logger.info(f"🤖 Запуск Telegram бота: {bot_token[:10]}...{bot_token[-4:]}")
            env = os.environ.copy()
            self.telegram_process = subprocess.Popen(
                [sys.executable, 'telegram_bot.py'],
                env=env,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                bufsize=1
            )
            
            # Читаем вывод Telegram бота с улучшенным форматированием
            for line in iter(self.telegram_process.stdout.readline, ''):
                if line.strip():
                    original_line = line.strip()
                    
                    # Убираем дублирование префиксов и улучшаем формат
                    if " - INFO - " in original_line:
                        # Извлекаем только сообщение после последнего " - INFO - "
                        parts = original_line.split(" - INFO - ")
                        if len(parts) > 1:
                            message = parts[-1]
                            # Если сообщение уже содержит эмодзи-префикс, оставляем как есть
                            if any(emoji in message[:5] for emoji in ['🤖', '🔑', '🗄️', '🚀', '✅', '🔴', '⚠️', '🔗', '👋', '🆔', '📨', '🔄', '📋', '⏹️', '🛑', '📅', '🕘', '📊', '🚨', '💡', '🕐']):
                                logger.info(f"🤖 {message}")
                            else:
                                logger.info(f"🤖 BOT: {message}")
                        else:
                            logger.info(f"🤖 BOT: {original_line}")
                    elif " - ERROR - " in original_line:
                        parts = original_line.split(" - ERROR - ")
                        if len(parts) > 1:
                            message = parts[-1]
                            logger.error(f"🤖 {message}")
                        else:
                            logger.error(f"🤖 BOT: {original_line}")
                    elif " - WARNING - " in original_line:
                        parts = original_line.split(" - WARNING - ")
                        if len(parts) > 1:
                            message = parts[-1]
                            logger.warning(f"🤖 {message}")
                        else:
                            logger.warning(f"🤖 BOT: {original_line}")
                    else:
                        # Для других типов сообщений
                        logger.info(f"🤖 BOT: {original_line}")
                if not self.running:
                    break
                    
        except Exception as e:
            logger.error(f"🔴 Ошибка запуска Telegram бота: {e}")
    
    def start(self):
        """Запуск всех сервисов"""
        logger.info("🚀 ЗАПУСК: Kanban Board с Telegram интеграцией")
        logger.info(f"⚙️ НАСТРОЙКИ:")
        logger.info(f"   🌐 Flask Host: {os.environ.get('FLASK_HOST')}")
        logger.info(f"   🌐 Flask Port: {os.environ.get('FLASK_PORT')}")
        logger.info(f"   🔧 Debug Mode: {os.environ.get('FLASK_DEBUG')}")
        logger.info(f"   🗄️ Database: {os.environ.get('DATABASE_URL')[:50]}...")
        
        # Показываем статус Telegram токена
        bot_token = os.environ.get('TELEGRAM_BOT_TOKEN', '').strip()
        if bot_token:
            logger.info(f"   🤖 Telegram Bot: активен ({bot_token[:10]}...{bot_token[-4:]})")
        else:
            logger.info(f"   🤖 Telegram Bot: отключен (нет токена)")
        
        # Запускаем Flask в отдельном потоке
        flask_thread = threading.Thread(target=self.start_flask_app, daemon=True)
        flask_thread.start()
        
        # Ждем немного, чтобы Flask успел запуститься
        time.sleep(3)
        
        # Запускаем Telegram бота в отдельном потоке
        telegram_thread = threading.Thread(target=self.start_telegram_bot, daemon=True)
        telegram_thread.start()
        
        logger.info("✅ ГОТОВ: Все сервисы запущены!")
        
        # Используем BASE_URL если задан, иначе формируем из HOST и PORT
        base_url = os.environ.get('BASE_URL')
        if base_url:
            logger.info(f"📋 Flask приложение: {base_url}")
        else:
            host = os.environ.get('FLASK_HOST', 'localhost')
            port = os.environ.get('FLASK_PORT', '5000')
            # Если host 0.0.0.0, показываем localhost
            if host == '0.0.0.0':
                host = 'localhost'
            logger.info(f"📋 Flask приложение: http://{host}:{port}")
        
        if os.environ.get('TELEGRAM_BOT_TOKEN', '').strip():
            logger.info("🤖 Telegram бот: активен")
        else:
            logger.info("🤖 Telegram бот: отключен (нет токена)")
        
        # Настраиваем обработчики сигналов
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        try:
            # Ожидаем завершения основных потоков
            while self.running and (flask_thread.is_alive() or telegram_thread.is_alive()):
                time.sleep(1)
        except KeyboardInterrupt:
            logger.info("⏹️ Получен сигнал остановки от пользователя")
        finally:
            self.stop()
    
    def signal_handler(self, signum, frame):
        """Обработчик сигналов остановки"""
        logger.info(f"⏹️ СИГНАЛ: Получен сигнал {signum}")
        self.stop()
    
    def stop(self):
        """Остановка всех сервисов"""
        logger.info("🛑 ОСТАНОВКА: Остановка сервисов...")
        self.running = False
        
        if self.flask_process and self.flask_process.poll() is None:
            try:
                self.flask_process.terminate()
                self.flask_process.wait(timeout=10)
                logger.info("✅ Flask приложение остановлено")
            except subprocess.TimeoutExpired:
                self.flask_process.kill()
                logger.warning("⚠️ Flask приложение принудительно завершено")
            except Exception as e:
                logger.error(f"🔴 Ошибка остановки Flask: {e}")
        
        if self.telegram_process and self.telegram_process.poll() is None:
            try:
                self.telegram_process.terminate()
                self.telegram_process.wait(timeout=10)
                logger.info("✅ Telegram бот остановлен")
            except subprocess.TimeoutExpired:
                self.telegram_process.kill()
                logger.warning("⚠️ Telegram бот принудительно завершен")
            except Exception as e:
                logger.error(f"🔴 Ошибка остановки Telegram бота: {e}")
        
        logger.info("✅ ГОТОВ: Все сервисы остановлены")

def main():
    """Главная функция"""
    launcher = ProjectLauncher()
    try:
        launcher.start()
    except Exception as e:
        logger.error(f"🔴 КРИТИЧЕСКАЯ ОШИБКА: {e}")
        sys.exit(1)
    finally:
        launcher.stop()

if __name__ == "__main__":
    main() 