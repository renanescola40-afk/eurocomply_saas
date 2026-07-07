'use client';

export type WaitlistInteractionCopy = {
  launchLabel: string;
  countdown: { days: string; hours: string; minutes: string; seconds: string; live: string };
  form: {
    title: string;
    subtitle: string;
    company: string;
    email: string;
    role: string;
    submit: string;
    submitting: string;
    success: string;
    emailSuccess: string;
    error: string;
    privacy: string;
    contact: string;
  };
};

export function WaitlistCountdown() {
  return null;
}

export function WaitlistForm() {
  return null;
}
