function nowISO() {
  return new Date().toISOString();
}

export const logger = {
  info(tag, data) {
    console.info(`[${nowISO()}] [INFO] ${tag}`, data ?? "");
  },
  warn(tag, data) {
    console.warn(`[${nowISO()}] [WARN] ${tag}`, data ?? "");
  },
  error(tag, err) {
    console.error(`[${nowISO()}] [ERROR] ${tag}`, err);
  }
};