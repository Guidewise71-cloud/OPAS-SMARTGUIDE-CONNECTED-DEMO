import process from 'node:process';
import path from 'node:path';
import { defineConfig, loadEnv, mergeConfig, type ConfigEnv, type UserConfig } from 'vite';
import baseConfig from './vite.config.ts';
import { smartGuidePrefillPlugin } from './server/smartGuidePrefill.ts';

/**
 * Development config used by `npm run dev`.
 *
 * Loads the existing vite.config.ts unchanged (payment API, identity bridge, SmartGuide
 * integration) and adds the SmartGuide pre-fill bridge:
 *   POST /api/integration/smartguide/prefill-drafts  (signed by SmartGuide)
 *   POST /api/smartguide-prefill/claim               (citizen dashboard)
 */
export default defineConfig(async (env: ConfigEnv) => {
  const resolvedBase = (typeof baseConfig === 'function' ? await baseConfig(env) : await baseConfig) as UserConfig;
  const fileEnv = loadEnv(env.mode, process.cwd(), '');
  const integrationSecret = process.env.OPAS_INTEGRATION_SECRET || fileEnv.OPAS_INTEGRATION_SECRET || '';

  return mergeConfig(resolvedBase, {
    plugins: [smartGuidePrefillPlugin(integrationSecret, path.resolve(process.cwd(), 'data'))],
  });
});
