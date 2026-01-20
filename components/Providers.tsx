"use client";

import { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster as ShadcnToaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <ShadcnToaster />
          <SonnerToaster />
          {children}
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

