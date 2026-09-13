import dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: parseInt(optional('PORT', '3000'), 10),
  mongoUri: optional('MONGODB_URI', ''),
  geminiApiKey: optional('GEMINI_API_KEY', ''),
  jwtSecret: optional('JWT_SECRET', 'dev-secret-change-me'),
  clientUrl: optional('CLIENT_URL', 'http://localhost:5173'),
  telegramBotToken: optional('TELEGRAM_BOT_TOKEN', ''),
  telegramChatId: optional('TELEGRAM_CHAT_ID', ''),
};

export const isProd = env.nodeEnv === 'production';
