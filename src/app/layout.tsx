import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "@/components/providers";
import { AppSidebar } from "@/components/app-sidebar";
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
  title: "LeadEngine",
  description: "Motor de prospección B2B autónomo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          <TooltipProvider>
            <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-900">
              <AppSidebar />
              {/* Main content — offset by sidebar width on md+ */}
              <div className="flex flex-1 flex-col md:pl-56">
                {children}
              </div>
            </div>
          </TooltipProvider>
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}

