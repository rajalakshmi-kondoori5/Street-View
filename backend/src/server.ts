import { createApp } from './app';
import { loadConfig } from './env';
import { createSupabaseStore } from './store';

const config = loadConfig();

if (!config.supabaseUrl || !config.supabaseSecretKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SECRET_KEY. Set them in the environment (see backend/.env.example).');
  process.exit(1);
}
if (config.deviceKeys.size === 0) {
  console.warn('DEVICE_KEYS is empty: ESP32 readings will be rejected until at least one "BIN-ID:secret" pair is set.');
}

const app = createApp({ config, store: createSupabaseStore(config.supabaseUrl, config.supabaseSecretKey) });

app.listen(config.port, () => {
  console.log(`Street View API listening on :${config.port} (${config.deviceKeys.size} device key(s) registered)`);
});
