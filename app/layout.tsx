import type { Metadata } from "next";
import { JetBrains_Mono, Silkscreen } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const silkscreen = Silkscreen({
  weight: "400",
  variable: "--font-pixel",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Pitchr AI — AI-Powered Cold Email Outreach",
    template: "%s | Pitchr AI"
  },
  description:
    "Generate highly personalized cold email campaigns at scale. Build, review, and auto-dispatch outbound emails via Gmail with your resume attached, powered by advanced AI models.",
  keywords: [
    "AI outreach",
    "cold email",
    "job search automation",
    "personalized email generation",
    "Gmail API integration",
    "outbound pipeline",
    "Gemini AI",
    "resume parsing"
  ],
  authors: [{ name: "Pitchr AI Team" }],
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" }
    ],
    shortcut: "/favicon.ico",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://pitchrr-ai.vercel.app",
    title: "Pitchr AI — AI-Powered Cold Email Outreach",
    description: "Generate highly personalized cold email campaigns at scale. Build, review, and auto-dispatch outbound emails via Gmail with your resume attached, powered by advanced AI models.",
    siteName: "Pitchr AI",
    images: [
      {
        url: "/images/about-isometric.png",
        width: 1200,
        height: 630,
        alt: "Pitchr AI Outbound Pipeline System Overview",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Pitchr AI — AI-Powered Cold Email Outreach",
    description: "Generate highly personalized cold email campaigns at scale. Build, review, and auto-dispatch outbound emails via Gmail with your resume attached, powered by advanced AI models.",
    images: ["/images/about-isometric.png"],
    creator: "@pitchr_ai",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${silkscreen.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

