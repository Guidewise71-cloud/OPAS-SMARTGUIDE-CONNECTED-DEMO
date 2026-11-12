import process from 'node:process';
import { defineConfig, loadEnv, mergeConfig, type ConfigEnv, type UserConfig } from 'vite';
import baseConfig from './vite.config.ts';
import { aiApplicationAssistPlugin } from './server/aiApplicationAssist.ts';

/**
 * Development config used by `npm run dev`.
 *
 * It loads the existing vite.config.ts unchanged (payment API, identity bridge,
 * SmartGuide integration) and adds the AI-Assisted Application endpoint
 * (POST /api/ai/application-assist). GEMINI_API_KEY is read on the server only.
 */
export default defineConfig(async (env: ConfigEnv) => {
  const resolvedBase = (typeof baseConfig === 'function' ? await baseConfig(env) : await baseConfig) as UserConfig;
  const fileEnv = loadEnv(env.mode, process.cwd(), '');
  const apiKey = process.env.GEMINI_API_KEY || fileEnv.GEMINI_API_KEY || '';

  return mergeConfig(resolvedBase, {
    plugins: [aiApplicationAssistPlugin(apiKey)],
  });
});
