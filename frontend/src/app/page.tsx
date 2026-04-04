import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight, Mail, Globe } from "lucide-react";
import { Security3DAnimation } from "@/components/animations/security-3d";

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const LinkedinIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const InstagramIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between text-white overflow-hidden relative selection:bg-violet-500/30 font-sans pointer-events-none">
      
      {/* 3D Background */}
      <div className="pointer-events-auto absolute inset-0 z-0">
        <Security3DAnimation />
      </div>
      
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 text-center px-4 w-full pt-16">
        
        <div className="pointer-events-auto rounded-3xl bg-zinc-900/40 p-2 backdrop-blur-md ring-1 ring-white/10 shadow-2xl">
          <Image
            src="/logo.png"
             width={80}
             height={80}
             alt="Env Manager"
             className="rounded-2xl"
             unoptimized
          />
        </div>
        
        <h1 className="pointer-events-auto text-4xl font-extrabold tracking-tight sm:text-6xl text-white drop-shadow-2xl max-w-4xl cursor-text">
          <span className="text-transparent bg-clip-text bg-gradient-to-br from-zinc-100 to-zinc-400">Secure</span> Environment Manager
        </h1>
        <p className="pointer-events-auto max-w-2xl text-lg text-zinc-300 drop-shadow-lg font-medium cursor-text">
          The ultimate platform to securely manage, version, and sync your environment variables across multiple projects and teams.
        </p>

        <div className="pointer-events-auto mt-8 flex gap-4">
          <Button asChild size="lg" className="h-14 px-10 text-base rounded-full bg-violet-600 hover:bg-violet-700 shadow-[0_0_40px_rgba(139,92,246,0.4)] transition-all hover:scale-105">
            <Link href="/login">
              Log in to Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </main>

      <footer className="relative z-10 w-full pb-8 pt-12 mt-auto pointer-events-auto">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="flex items-center gap-8">
            <a href="https://github.com/niranjansah87" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white hover:scale-110 transition-all" title="GitHub">
              <GithubIcon className="h-5 w-5 drop-shadow-md" />
            </a>
            <a href="https://www.linkedin.com/in/niranjan-sah/" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-blue-400 hover:scale-110 transition-all" title="LinkedIn">
              <LinkedinIcon className="h-5 w-5 drop-shadow-md" />
            </a>
            <a href="https://www.instagram.com/_niranjan_8790" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-pink-400 hover:scale-110 transition-all" title="Instagram">
              <InstagramIcon className="h-5 w-5 drop-shadow-md" />
            </a>
            <a href="mailto:niranjansah250@gmail.com" className="text-zinc-500 hover:text-rose-400 hover:scale-110 transition-all" title="Email">
              <Mail className="h-5 w-5 drop-shadow-md" />
            </a>
            <a href="https://niranjansah87.com.np/" target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-emerald-400 hover:scale-110 transition-all" title="Portfolio">
              <Globe className="h-5 w-5 drop-shadow-md" />
            </a>
          </div>
          <p className="text-sm font-medium text-zinc-500 mt-2">
            Made by <span className="text-zinc-300 hover:text-white transition-colors cursor-text">Niranjan Sah</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
