/**
 * PM2 — chạy API trên Cloud VPS:
 *   npm ci --omit=dev
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 save && pm2 startup
 * Biến môi trường đọc từ be/.env (cờ --env-file-if-exists trong node_args).
 */
module.exports = {
  apps: [
    {
      name: "vietlook-api",
      script: "src/server.js",
      cwd: __dirname,
      node_args: "--env-file-if-exists=.env",
      instances: 1, // rate limit + bộ đếm lưu trong bộ nhớ → 1 instance (nhiều instance cần Redis store)
      exec_mode: "fork",
      max_memory_restart: "400M",
      kill_timeout: 12000, // > 10s tắt êm trong server.js
      time: true,
      env_production: { NODE_ENV: "production" },
    },
  ],
};
