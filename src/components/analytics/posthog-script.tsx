import Script from "next/script";

const DEFAULT_POSTHOG_HOST = "https://eu.i.posthog.com";
const DEFAULT_POSTHOG_ASSET_HOST = "https://eu-assets.i.posthog.com";

export function PostHogScript() {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!posthogKey) {
    return null;
  }

  const apiHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? DEFAULT_POSTHOG_HOST;
  const assetHost = process.env.NEXT_PUBLIC_POSTHOG_ASSET_HOST ?? DEFAULT_POSTHOG_ASSET_HOST;

  return (
    <Script id="posthog-init" strategy="afterInteractive">
      {`
!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=${JSON.stringify(assetHost)}+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init(${JSON.stringify(posthogKey)}, {
  api_host: ${JSON.stringify(apiHost)},
  person_profiles: "identified_only",
  capture_pageview: true,
  capture_pageleave: true
});
      `}
    </Script>
  );
}
