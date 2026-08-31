import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { IconProvider } from "@/components/icon-provider";
import { Providers } from "./providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.chelaa.dev"),
  title: {
    default: "Chelaa — where Tunisia’s engineers build their name",
    template: "%s · Chelaa",
  },
  description:
    "Questions, projects and answers in one feed. Reputation from the work — never from a CV. Jobs matched to the tags you actually contribute in.",
  openGraph: {
    title: "Chelaa — where Tunisia’s engineers build their name",
    description:
      "Questions, projects and answers in one feed. Standing from the work — never from a CV.",
    siteName: "Chelaa",
    locale: "en",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Chelaa — where Tunisia’s engineers build their name",
    description:
      "Questions, projects and answers in one feed. Standing from the work — never from a CV.",
  },
};

// Applies the stored theme before first paint so dark mode never flashes.
// Light is the default: dark applies only when the user has explicitly chosen
// it, so the OS colour-scheme preference does not override the brand default.
const themeScript = `
(function() {
  try {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        {/* Runs before paint so the stored theme applies without a flash.
            Placed in <body> as the first child rather than <head>: React 19
            warns about script tags rendered inside the component tree in
            <head>, and this position still executes before hydration. */}
        <script
          id="theme-init"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: themeScript }}
        />
        {/* datascan analytics — user-provided, confirmed as their own service. */}
        <Script
          src="https://datascan.duckdns.org/tracker.js"
          data-site="ds_0f7e4967f51a"
          strategy="beforeInteractive"
        />
        <Providers>
          <IconProvider>{children}</IconProvider>
        </Providers>
      </body>
    </html>
  );
}
