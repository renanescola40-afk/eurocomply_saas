type SafeContext = Record<string, string | number | boolean | null | undefined>;

function pickSafeContext(context: SafeContext = {}) {
  return Object.fromEntries(
    Object.entries(context).filter(([, value]) => {
      return ['string', 'number', 'boolean'].includes(typeof value) || value === null || value === undefined;
    }),
  );
}

export function reportError(error: unknown, context: SafeContext = {}) {
  const safeContext = pickSafeContext(context);

  if (process.env.NODE_ENV !== 'production') {
    console.error('[EuroComply]', error, safeContext);
  }

  return { error, context: safeContext };
}
