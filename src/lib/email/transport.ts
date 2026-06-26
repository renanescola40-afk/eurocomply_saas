import 'server-only';

export { redactEmailSecrets, sendEmail } from './server-sender';
export type { SendEmailInput } from './server-sender';
