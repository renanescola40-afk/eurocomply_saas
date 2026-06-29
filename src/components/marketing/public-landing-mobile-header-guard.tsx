export function PublicLandingMobileHeaderGuard() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          @media (max-width: 639px) {
            header a[href$="/login"] {
              display: inline-flex !important;
            }

            header a[href*="/contact?intent=demo"] {
              display: none !important;
            }
          }

          @media (max-width: 420px) {
            header img[alt="RISCK COMPLY"] {
              max-width: 9rem;
            }
          }
        `,
      }}
    />
  );
}
