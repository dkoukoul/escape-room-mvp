// src/server/logger.ts
import winston from 'winston';
import Transport from 'winston-transport';
import { LogLevel } from '../../../shared/logger.ts';

// Custom Telegram transport for error notifications
class TelegramTransport extends Transport {
  private botToken: string;
  private chatId: string;
  private lastErrorTime: number = 0;
  private errorCooldownMs: number = 60000; // 1 minute cooldown between alerts

  constructor(opts: { botToken: string; chatId: string }) {
    super();
    this.botToken = opts.botToken;
    this.chatId = opts.chatId;
  }

  log(info: any, callback: () => void) {
    const { level, message, timestamp, ...meta } = info;
    console.log('Logging info:', info.level);
    // Only send ERROR level logs
    if (level.includes('error') || level.includes('ERROR') || level.includes('Error')) {
      const now = Date.now();
      if (now - this.lastErrorTime < this.errorCooldownMs) {
        callback();
        return;
      }
      this.lastErrorTime = now;
      
      const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      const text = `🚨 *ODYSSEY ERROR*\n\n` +
        `*Time:* ${timestamp}\n` +
        `*Message:* ${message}\n` +
        `${metaString ? `*Details:* \`\`\`${metaString}\`\`\`` : ''}`;
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      console.log('Sending Telegram notification to:', url);
      console.log('Chat ID:', this.chatId);

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: text,
          parse_mode: 'MarkdownV2',
        }),
      }).then(async (response) => {
        const data = await response.json();
        console.log('Telegram API response:', data);
        if (!response.ok) {
          console.error('Telegram API error:', data);
        }
      }).catch(err => {
        console.error('Failed to send Telegram notification:', err);
      });
    }

    callback();
  }
}

const transports: winston.transport[] = [
  new winston.transports.Console()
];

// Add Telegram notification if configured
const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;

if (telegramBotToken && telegramChatId) {
  transports.push(new TelegramTransport({
    botToken: telegramBotToken,
    chatId: telegramChatId,
  }));
  console.log('📱 Telegram error notifications enabled');
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || LogLevel.DEBUG,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? JSON.stringify(meta) : '';
      return `[${timestamp}] ${level}: ${message} ${metaString}`;
    })
  ),
  transports,
});

export default logger;
