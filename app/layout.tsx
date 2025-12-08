import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { UIScaleProvider } from "@/components/providers/UIScaleProvider";
import { Toaster } from "sonner";

// Root layout component
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Symples - Gerir sua empresa tem que ser Symples",
  description: "O Hub de Soluções do Empreendedor Digital",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <UIScaleProvider>
          {children}
          <Toaster 
            theme="light"
            className="font-sans"
            toastOptions={{
              classNames: {
                toast: "bg-white border-gray-200 shadow-lg",
                title: "text-gray-900 font-medium",
                description: "text-gray-500",
                actionButton: "bg-gray-900 text-white hover:bg-gray-800",
                cancelButton: "bg-gray-100 text-gray-500 hover:bg-gray-200",
                error: "text-red-600",
                success: "text-green-600",
                warning: "text-yellow-600",
                info: "text-blue-600",
              },
            }}
          />
        </UIScaleProvider>
      </body>
    </html>
  );
}
