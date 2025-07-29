import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Voltarian Networking",
  description: "Connect with the Voltarian community - Real-time chat application",
  keywords: ["chat", "networking", "voltarian", "community", "real-time"],
  authors: [{ name: "VoltacceptYT" }],
  creator: "VoltacceptYT",
  publisher: "Voltarian Networking",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.json",
  themeColor: "#ef4444",
  colorScheme: "dark",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VoltaNET",
  },
  openGraph: {
    type: "website",
    siteName: "Voltarian Networking",
    title: "Voltarian Networking",
    description: "Connect with the Voltarian community - Real-time chat application",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Voltarian Networking",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Voltarian Networking",
    description: "Connect with the Voltarian community - Real-time chat application",
    images: ["/og-image.png"],
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="VoltaNET" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="VoltaNET" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileColor" content="#111827" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-16x16.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#ef4444" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Register service worker with error handling
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  )
}
