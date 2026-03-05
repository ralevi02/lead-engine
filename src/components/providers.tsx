"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SidebarProvider } from "./sidebar-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <SidebarProvider>{children}</SidebarProvider>
    </NextThemesProvider>
  );
}
