import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import "./app.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const TITLE = "HiFiGoods — Goods Transport Management";
const DESCRIPTION =
  "Track vehicles, routes, expenses, and profit for your goods transport operation.";

export const metadata: Metadata = {
  // Required so relative OG/Twitter image paths resolve to absolute URLs.
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · HiFiGoods" },
  description: DESCRIPTION,
  applicationName: "HiFiGoods",
  openGraph: {
    type: "website",
    siteName: "HiFiGoods",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  appleWebApp: { capable: true, title: "HiFiGoods", statusBarStyle: "default" },
  // The app itself is private data behind auth — keep it out of search indexes.
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Never block pinch-zoom: operators read dense figures on small screens.
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F7F4F1" },
    { media: "(prefers-color-scheme: dark)", color: "#102C3E" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jakarta.variable} font-sans`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
