import 'server-only';

export { redactEmailSecrets, sendEmail } from './server-sender';
export type { SendEmailInput, SendEmailResult } from './server-sender';
