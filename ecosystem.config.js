module.exports = {
  apps: [
    {
      cron_restart: "0 */6 * * *",
      name: "minion:integrations-io",
      script: "npm start",
      watch: false,
      env: { log_type: "json" }
    }
  ]
};
