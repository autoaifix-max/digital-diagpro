import { BottomNav } from "@/components/public/bottom-nav";
import { PublicFooter } from "@/components/public/public-footer";
import { PublicHeader } from "@/components/public/public-header";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <main>{children}</main>
      <PublicFooter />
      <BottomNav />
    </div>
  );
}
