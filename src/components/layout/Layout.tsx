import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {/* ✅ FIX: เอา flex-1 ออก ให้ขยายตามเนื้อหาได้ */}
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}

export default Layout;
