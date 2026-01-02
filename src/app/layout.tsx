import type { Metadata, Viewport } from "next";
import { Inter, Roboto } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
// WebSocket provider for real-time messaging
import { WebSocketProvider } from "../contexts/WebSocketContext";

// Force all pages to render dynamically (disables static optimization)
export const dynamic = "force-dynamic";
// Disable ISR/revalidation entirely
export const revalidate = 0;
// Disable fetch cache globally to ensure all requests are treated as dynamic
export const fetchCache = "force-no-store";

// PWA Manager & notifications
import PWAManager from "../components/pwa/PWAManager";
import { ToastProvider } from "../components/ui/toast-provider";
// CareBot - 24/7 AI assistance
import FloatingChatButton from "../components/carebot/FloatingChatButton";
// Cookie consent banner
import CookieConsent from "../components/analytics/CookieConsent";
// Error boundary
import ErrorBoundary from "../components/ErrorBoundary";
// Onboarding modal
import OnboardingModal from "../components/onboarding/OnboardingModal";
// Sentry client initialization
import "../lib/sentry.client";

// Load Inter font for headers (CareLinkAI branding)
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

// Load Roboto font for body text (CareLinkAI branding)
const roboto = Roboto({
  weight: ['300', '400', '500', '700'],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

// App metadata for SEO and sharing
export const metadata: Metadata = {
  title: {
    template: "%s | CareLinkAI",
    default: "CareLinkAI - Connecting Families, Homes, and Caregivers",
  },
  description:
    "Connect families, assisted living operators, and caregivers through AI, automation, and trust-first infrastructure",
  keywords: [
    "assisted living",
    "caregivers",
    "healthcare",
    "elderly care",
    "family portal",
    "care matching",
    "HIPAA compliant",
  ],
  authors: [{ name: "CareLinkAI Team" }],
  creator: "CareLinkAI",
  publisher: "CareLinkAI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(
    process.env["NEXT_PUBLIC_APP_URL"] || "http://localhost:5000"
  ),
  alternates: {
    canonical: "/",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    title: "CareLinkAI - Connecting Families, Homes, and Caregivers",
    description:
      "Connect families, assisted living operators, and caregivers through AI, automation, and trust-first infrastructure",
    siteName: "CareLinkAI",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "CareLinkAI Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CareLinkAI - Connecting Families, Homes, and Caregivers",
    description:
      "Connect families, assisted living operators, and caregivers through AI, automation, and trust-first infrastructure",
    images: ["/images/twitter-image.jpg"],
    creator: "@carelinkai",
  },
  appleWebApp: {
    capable: true,
    title: "CareLinkAI",
    statusBarStyle: "black-translucent",
  },
  applicationName: "CareLinkAI",
  category: "healthcare",
};

// Viewport settings for responsive design and PWA - Updated to CareLinkAI blue
export const viewport: Viewport = {
  themeColor: "#3978FC",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// Version/commit info for footer diagnostics
const _appVersion = process.env['APP_VERSION'] || process.env['npm_package_version'] || '0.0.0';
const _commitSha = (
  process.env['RENDER_GIT_COMMIT'] ||
  process.env['VERCEL_GIT_COMMIT_SHA'] ||
  process.env['GITHUB_SHA'] ||
  process.env['GIT_COMMIT'] ||
  process.env['NEXT_PUBLIC_COMMIT_SHA'] || ''
).slice(0, 7);
const _branch = (
  process.env['RENDER_GIT_BRANCH'] ||
  process.env['VERCEL_GIT_COMMIT_REF'] ||
  process.env['GITHUB_REF_NAME'] ||
  process.env['GIT_BRANCH'] || ''
);
const _versionLabel = `v${_appVersion}${_branch ? ` • ${_branch}` : ''}${_commitSha ? `@${_commitSha}` : ''}`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${roboto.variable}`}>
      <head>
        {/* CareLinkAI Favicon - Updated branding */}
        <link rel="icon" type="image/png" href="/icons/favicon.png" />
        <link rel="shortcut icon" href="/favicon.ico" />
        
        {/* PWA specific meta tags */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/icons/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/icons/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/icons/favicon-16x16.png"
        />
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#3978FC" />
        <meta name="msapplication-TileColor" content="#3978FC" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* iOS splash screens - Commented out to avoid 404 errors until splash images are generated */}
        {/* 
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-2048-2732.jpg"
          media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1668-2388.jpg"
          media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1536-2048.jpg"
          media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1125-2436.jpg"
          media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-1242-2688.jpg"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-828-1792.jpg"
          media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-750-1334.jpg"
          media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        <link
          rel="apple-touch-startup-image"
          href="/splash/apple-splash-640-1136.jpg"
          media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
        />
        */}
      </head>
      <body className="min-h-screen bg-neutral-50 antialiased font-sans">
        {/* Abacus AI LLM Integration */}
        <Script
          src="https://apps.abacus.ai/chatllm/appllm-lib.js"
          strategy="afterInteractive"
        />
        
        {/* Google Tag Manager */}
        {process.env.NEXT_PUBLIC_GTM_ID && (
          <>
            <Script
              id="gtm-script"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
                'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
                })(window,document,'script','dataLayer','${process.env.NEXT_PUBLIC_GTM_ID}');`,
              }}
            />
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID}`}
                height="0"
                width="0"
                style={{ display: 'none', visibility: 'hidden' }}
              />
            </noscript>
          </>
        )}
        
        {/* Google Analytics 4 */}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script
              id="ga-script"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}', {
                    page_path: window.location.pathname,
                    send_page_view: true
                  });
                  console.log('[GA4] Google Analytics 4 initialized with ID: ${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
                `,
              }}
            />
          </>
        )}
        
        {/* Facebook Pixel */}
        {process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID && (
          <Script
            id="fb-pixel"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID}');
                fbq('track', 'PageView');
              `,
            }}
          />
        )}
        
        {/* Microsoft Clarity */}
        {process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID && (
          <Script
            id="clarity-script"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID}");
              `,
            }}
          />
        )}
        
        <WebSocketProvider>
          <Providers>
            <ErrorBoundary>
              {/* ------ PWA Manager wraps the entire UI for install prompts, offline banners, etc. ------ */}
              <PWAManager>
                {/* Main layout structure inspired by QuickBooks design */}
                <div className="flex min-h-screen flex-col">
                  {/* Skip to content link for accessibility */}
                  <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:block focus:h-auto focus:w-auto focus:rounded-md focus:bg-white focus:p-4 focus:text-primary-600 focus:shadow-lg"
                  >
                    Skip to content
                  </a>

                  {/* Main content area */}
                  <main id="main-content" className="flex-1">
                    {children}
                  </main>

                  {/* Global footer with version and commit diagnostics */}
                  <footer className="border-t border-neutral-200/70 bg-white/60 py-2 text-xs text-neutral-500">
                    <div className="mx-auto flex max-w-7xl items-center justify-between px-4">
                      <span>CareLinkAI</span>
                      <span suppressHydrationWarning>{_versionLabel}</span>
                    </div>
                  </footer>
                </div>

                {/* Global toaster for notifications */}
                <ToastProvider />
                
                {/* CareBot - 24/7 AI Chat Assistant */}
                <FloatingChatButton />
                
                {/* Cookie Consent Banner */}
                <CookieConsent />
                
                {/* User Onboarding Modal */}
                <OnboardingModal />
              </PWAManager>
            </ErrorBoundary>
          </Providers>
        </WebSocketProvider>
        
      </body>
    </html>
  );
}
