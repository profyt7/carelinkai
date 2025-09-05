import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
// WebSocket provider for real-time messaging
import { WebSocketProvider } from "../contexts/WebSocketContext";
// PWA Manager & notifications
import PWAManager from "../components/pwa/PWAManager";
import { Toaster } from "react-hot-toast";

// Load Inter font with Latin subset for performance
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
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

// Viewport settings for responsive design and PWA
export const viewport: Viewport = {
  themeColor: "#0099e6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
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
        <link rel="mask-icon" href="/icons/safari-pinned-tab.svg" color="#0099e6" />
        <meta name="msapplication-TileColor" content="#0099e6" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* iOS splash screens */}
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
      </head>
      <body className="min-h-screen bg-neutral-50 antialiased">
        <WebSocketProvider>
          <Providers>
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
              </div>

              {/* Global toaster for notifications */}
              <Toaster
                position="top-center"
                toastOptions={{
                  className: "text-sm",
                  duration: 4000,
                }}
              />
              
            </PWAManager>
          </Providers>
        </WebSocketProvider>
        
      </body>
    </html>
  );
}
