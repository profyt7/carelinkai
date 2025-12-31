import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://d649b9c85c145427fcfb62cecdeaa2d9e@o4510110703216128.ingest.us.sentry.io/4510154420089472",

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
