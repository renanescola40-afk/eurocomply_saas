// Root proxy entrypoint delegates to the shared Supabase Auth and i18n middleware.
export { default as proxy, config } from './src/middleware';
