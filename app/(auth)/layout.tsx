import { ReactNode } from "react";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getSession } from "@/shared/lib/utils/auth-utils";

const Layout = async ({ children }: { children: ReactNode }) => {
  const session = await getSession();
  
  // Redirect if already authenticated
  if (session?.user) {
    redirect("/profile");
  }
  
  return (
    <main className="min-h-screen relative">
      {/* Background image - fixed position, covers entire viewport */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/images/collage1.png"
          alt=""
          fill
          priority
          quality={90}
          sizes="100vw"
          className="object-cover object-center"
        />
        {/* Subtle overlay for better readability */}
        <div className="absolute inset-0 bg-black/10" />
      </div>

      {/* Logo - responsive positioning */}
      <div className="fixed top-4 left-4 sm:top-6 sm:left-6">
        <Link href="/" className="flex items-center gap-2 group">
          <Image 
            src="/icons/logo.png" 
            alt="KOS Yachts" 
            width={32} 
            height={32}
            className="group-hover:opacity-80 transition-opacity sm:w-9 sm:h-9"
          />
          <span className="text-base sm:text-lg font-semibold text-white drop-shadow-md">
            KOS Yachts
          </span>
        </Link>
      </div>

      {/* Centered form - responsive padding */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 py-20 sm:py-16">
        <div className="w-full max-w-[380px] sm:max-w-[400px]">
          {children}
        </div>
      </div>
    </main>
  );
};

export default Layout;