

const config = {
  PORT: process.env.PORT || 3001,
  NODE_ENV: process.env.NODE_ENV || 'development',

  JWT_SECRET: process.env.JWT_SECRET || 'almadesk-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',

  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://almadesk:almadesk_password_2026@localhost:5432/almadesk_db',

  DATABASE_LOGS_URL: process.env.DATABASE_LOGS_URL || 'postgresql://almadesk_logs:almadesk_logs_password_2026@localhost:5433/almadesk_logs_db',

  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: process.env.REDIS_PORT || 6379,
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',

  ELASTICSEARCH_NODE: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  ELASTICSEARCH_INDEX: process.env.ELASTICSEARCH_INDEX || 'almadesk-tickets',

  KEYCLOAK_URL: process.env.KEYCLOAK_URL || 'http://localhost:8080',
  KEYCLOAK_REALM: process.env.KEYCLOAK_REALM || 'almadesk',
  KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID || 'almadesk-backend',
  KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET || '',
  KEYCLOAK_PUBLIC_CLIENT_ID: process.env.KEYCLOAK_PUBLIC_CLIENT_ID || 'almadesk-app',

  AZURE_AD_ENABLED: process.env.AZURE_AD_ENABLED === 'true',
  AZURE_AD_TENANT_ID: process.env.AZURE_AD_TENANT_ID || '',
  AZURE_AD_CLIENT_ID: process.env.AZURE_AD_CLIENT_ID || '',
  AZURE_AD_CLIENT_SECRET: process.env.AZURE_AD_CLIENT_SECRET || '',
  AZURE_AD_DISPLAY_NAME: process.env.AZURE_AD_DISPLAY_NAME || 'Sign in with Microsoft',

  MINIO_ENDPOINT: process.env.MINIO_ENDPOINT || 'localhost',
  MINIO_PORT: parseInt(process.env.MINIO_PORT || '9000'),
  MINIO_USE_SSL: process.env.MINIO_USE_SSL === 'true',
  MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY || 'almadesk',
  MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY || 'almadesk_minio_2026',
  MINIO_BUCKET: process.env.MINIO_BUCKET || 'almadesk-attachments',

  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
  ALLOWED_FILE_TYPES: process.env.ALLOWED_FILE_TYPES || 'image/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,.zip',

  PROMETHEUS_ENABLED: process.env.PROMETHEUS_ENABLED !== 'false',
  METRICS_PORT: process.env.METRICS_PORT || 9091,

  EMAIL_HOST: process.env.EMAIL_HOST || '',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '993'),
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
  EMAIL_SECURE: process.env.EMAIL_SECURE !== 'false',

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: process.env.SMTP_PORT || '587',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  SMTP_SECURE: process.env.SMTP_SECURE || 'false',
  SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL || 'noreply@almadesk.edu',
  SMTP_FROM_NAME: process.env.SMTP_FROM_NAME || 'AlmaDesk Support',

  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',

  ENABLE_SSO: process.env.ENABLE_SSO === 'true',
  ENABLE_AUDIT_LOG: process.env.ENABLE_AUDIT_LOG !== 'false',
  ENABLE_AI_FEATURES: process.env.ENABLE_AI_FEATURES === 'true',
}

if (config.NODE_ENV === 'production') {
  if (config.JWT_SECRET === 'almadesk-secret-key-change-in-production') {
    console.warn('[Security] UWAGA: Uzyto domyslnego JWT_SECRET w produkcji! Ustaw zmienna srodowiskowa JWT_SECRET.')
  }
  if (config.MINIO_SECRET_KEY === 'almadesk_minio_2026') {
    console.warn('[Security] UWAGA: Uzyto domyslnego MINIO_SECRET_KEY w produkcji! Ustaw zmienna srodowiskowa.')
  }
}

module.exports = config
