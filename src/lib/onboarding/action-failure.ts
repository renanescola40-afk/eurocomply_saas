import type { OnboardingActionResult } from './activation';

export type OnboardingMutationPhase = 'save' | 'complete';

export type OnboardingMutationFailureCode =
  | 'invalid_input'
  | 'not_authorized'
  | 'invitation_delivery_failed'
  | 'runtime_unavailable'
  | 'unexpected_error';

export type OnboardingMutationSuccess = OnboardingActionResult & {
  ok: true;
};

export type OnboardingMutationFailure = {
  ok: false;
  status: 'error';
  code: OnboardingMutationFailureCode;
  message: string;
  retryable: boolean;
};

export type OnboardingMutationResult = OnboardingMutationSuccess | OnboardingMutationFailure;

type ErrorLike = {
  name?: unknown;
  message?: unknown;
};

function errorName(error: unknown) {
  if (!error || typeof error !== 'object') return '';
  const value = (error as ErrorLike).name;
  return typeof value === 'string' ? value : '';
}

function errorMessage(error: unknown) {
  if (!error || typeof error !== 'object') return '';
  const value = (error as ErrorLike).message;
  return typeof value === 'string' ? value : '';
}

function isAuthorizationFailure(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes('do not have access')
    || normalized.includes('not have permission')
    || normalized.includes('forbidden')
    || normalized.includes('unauthorized');
}

function isInvitationDeliveryFailure(message: string) {
  return message.toLowerCase().includes('invitation delivery');
}

function copyFor(locale: string, phase: OnboardingMutationPhase, code: OnboardingMutationFailureCode) {
  const isPt = locale === 'pt';

  if (code === 'invalid_input') {
    return isPt
      ? 'Revise os campos obrigatórios desta etapa e tente novamente.'
      : 'Review the required fields in this step and try again.';
  }

  if (code === 'not_authorized') {
    return isPt
      ? 'A sua sessão não tem permissão para concluir esta configuração. Atualize a página ou contacte um administrador da organização.'
      : 'Your session is not allowed to complete this setup. Refresh the page or contact an organization administrator.';
  }

  if (code === 'invitation_delivery_failed') {
    return isPt
      ? 'A configuração foi guardada, mas os convites da equipa não foram enviados. Remova os convites para continuar agora ou tente novamente mais tarde.'
      : 'The setup was saved, but team invitations were not delivered. Remove the invitations to continue now or try again later.';
  }

  if (phase === 'save') {
    return isPt
      ? 'Não foi possível guardar esta etapa agora. Os dados preenchidos continuam no ecrã; tente novamente antes de sair.'
      : 'This step could not be saved right now. Your entered data is still on screen; try again before leaving.';
  }

  return isPt
    ? 'Não foi possível concluir a ativação neste momento. Tente novamente. Se o erro persistir, utilize o acesso Enterprise para receber apoio no onboarding.'
    : 'Activation could not be completed right now. Try again. If the error persists, use Enterprise access for assisted onboarding.';
}

/**
 * Converts server-side onboarding failures into a bounded, serializable result.
 * Provider, database and stack details remain in server observability and are
 * never copied into the browser-facing message.
 */
export function toOnboardingMutationFailure(
  error: unknown,
  locale: string,
  phase: OnboardingMutationPhase,
): OnboardingMutationFailure {
  const message = errorMessage(error);
  let code: OnboardingMutationFailureCode = 'runtime_unavailable';
  let retryable = true;

  if (errorName(error) === 'ZodError') {
    code = 'invalid_input';
    retryable = false;
  } else if (isAuthorizationFailure(message)) {
    code = 'not_authorized';
    retryable = false;
  } else if (isInvitationDeliveryFailure(message)) {
    code = 'invitation_delivery_failed';
  } else if (!message) {
    code = 'unexpected_error';
  }

  return {
    ok: false,
    status: 'error',
    code,
    message: copyFor(locale, phase, code),
    retryable,
  };
}
