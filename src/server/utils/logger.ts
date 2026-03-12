// src/server/logger.ts
import winston from 'winston';
import Transport from 'winston-transport';
import { LogLevel } from '../../../shared/logger.ts';

// Custom Telegram transport for error and game notifications
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
    const { level, message, timestamp, notifyTelegram, ...meta } = info;

    // Send ERROR level logs (with cooldown)
    if (level.includes('error') || level.includes('ERROR') || level.includes('Error')) {
      const now = Date.now();
      if (now - this.lastErrorTime < this.errorCooldownMs) {
        callback();
        return;
      }
      this.lastErrorTime = now;
      
      const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      const text = `🚨 *ODYSSEY ERROR*\n\n` +
        `*Message:* ${this.escapeMarkdown(message)}\n` +
        `${metaString ? `*Details:* \`\`\`${this.escapeMarkdown(metaString)}\`\`\`` : ''}`;
      this.sendTelegramMessage(text);
    }

    // Send game notifications (game start, victory, defeat)
    if (notifyTelegram && meta.gameEvent) {
      const text = this.formatGameNotification(meta.gameEvent, meta);
      this.sendTelegramMessage(text);
    }

    callback();
  }

  private escapeMarkdown(text: string): string {
    // Escape special MarkdownV2 characters
    return text.replace(/[_*\[\]()~`>#+\-=|{}.!]/g, '\\$&');
  }

  private formatGameNotification(event: string, meta: any): string {
    const roomCode = meta.roomCode || 'Unknown';
    
    switch (event) {
      case 'game_started': {
        const playerCount = meta.playerCount || 0;
        const levelId = meta.levelId || 'Unknown';
        return `🎮 *ODYSSEY GAME STARTED*\n\n` +
          `*Room:* \`${this.escapeMarkdown(roomCode)}\`\n` +
          `*Level:* ${this.escapeMarkdown(levelId)}\n` +
          `*Players:* ${playerCount}`;
      }
      case 'game_victory': {
        const score = meta.score ?? 'N/A';
        const elapsed = meta.elapsedSeconds ?? 'N/A';
        const glitches = meta.glitchFinal ?? 'N/A';
        const puzzlesCompleted = meta.puzzlesCompleted ?? 'N/A';
        return `🏆 *ODYSSEY VICTORY!*\n\n` +
          `*Room:* \`${this.escapeMarkdown(roomCode)}\`\n` +
          `*Score:* ${score}\n` +
          `*Time:* ${elapsed}s\n` +
          `*Glitches:* ${glitches}\n` +
          `*Puzzles Completed:* ${puzzlesCompleted}`;
      }
      case 'game_defeat': {
        const reason = meta.reason || 'Unknown';
        const puzzlesCompleted = meta.puzzlesCompleted ?? 'N/A';
        const puzzleReached = meta.puzzleReachedIndex ?? 'N/A';
        return `💀 *ODYSSEY DEFEAT*\n\n` +
          `*Room:* \`${this.escapeMarkdown(roomCode)}\`\n` +
          `*Reason:* ${this.escapeMarkdown(reason)}\n` +
          `*Puzzles Completed:* ${puzzlesCompleted}\n` +
          `*Puzzle Reached:* ${puzzleReached}`;
      }
      default:
        return `📢 *ODYSSEY EVENT*\n\n` +
          `*Event:* ${this.escapeMarkdown(event)}\n` +
          `*Room:* \`${this.escapeMarkdown(roomCode)}\``;
    }
  }

  private sendTelegramMessage(text: string): void {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

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
      if (!response.ok) {
        console.error('Telegram API error:', data);
      }
    }).catch(err => {
      console.error('Failed to send Telegram notification:', err);
    });
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

const winstonLogger = winston.createLogger({
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

// Wrapper logger with game notification support
const logger = {
  error: (message: string, ...meta: any[]) => {
    winstonLogger.error(message, ...meta);
  },
  warn: (message: string, ...meta: any[]) => {
    winstonLogger.warn(message, ...meta);
  },
  info: (message: string, ...meta: any[]) => {
    winstonLogger.info(message, ...meta);
  },
  debug: (message: string, ...meta: any[]) => {
    winstonLogger.debug(message, ...meta);
  },
  /**
   * Log a game event and send Telegram notification
   */
  gameEvent: (event: 'game_started' | 'game_victory' | 'game_defeat', meta: Record<string, any>) => {
    let message: string;
    switch (event) {
      case 'game_started':
        message = `Game started in room ${meta.roomCode}`;
        break;
      case 'game_victory':
        message = `VICTORY! Room ${meta.roomCode} completed with score ${meta.score}`;
        break;
      case 'game_defeat':
        message = `DEFEAT! Room ${meta.roomCode} failed - reason: ${meta.reason}`;
        break;
      default:
        message = `Game event: ${event}`;
    }
    winstonLogger.info(message, { notifyTelegram: true, gameEvent: event, ...meta });
  },
};

export default logger;
