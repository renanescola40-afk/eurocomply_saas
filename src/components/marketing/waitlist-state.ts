export type WaitlistSubmitFeedback = {
  status: 'success' | 'warning';
  message: string;
};

export function resolveWaitlistSubmitFeedback({
  signal,
  successMessage,
  confirmedMessage,
  warningMessage,
}: {
  signal: boolean | undefined;
  successMessage: string;
  confirmedMessage: string;
  warningMessage: string;
}): WaitlistSubmitFeedback {
  if (signal === true) {
    return {
      status: 'success',
      message: confirmedMessage,
    };
  }

  if (signal === false) {
    return {
      status: 'warning',
      message: warningMessage,
    };
  }

  return {
    status: 'success',
    message: successMessage,
  };
}
