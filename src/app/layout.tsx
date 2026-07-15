import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "التشخيص الاحترافي",
    template: "%s | التشخيص الاحترافي",
  },
  description: "نظام Pilot تشغيلي لإدارة حجوزات وأوامر عمل وتقارير مركز التشخيص الاحترافي.",
  applicationName: "Digital DiagPro",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DiagPro",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0d0f",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
