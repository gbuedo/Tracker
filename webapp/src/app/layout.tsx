import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlobalExpirationHeader } from "@/components/GlobalExpirationHeader";

const outfit = Outfit({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

import * as db from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "WCS Tracker",
  description: "Real-time Operations Terminal and Global Tracking Portal",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialTasks: any[] = [];
  try {
    initialTasks = await db.getTasks();
  } catch (err) {
    console.error("Failed to prefetch tasks in RootLayout:", err);
  }

  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col overflow-x-hidden w-full max-w-full bg-background text-foreground transition-colors duration-200 selection:bg-[#E8A99A]/30 selection:text-[#8B4E43]">
        <GlobalExpirationHeader initialTasks={initialTasks} />
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}

