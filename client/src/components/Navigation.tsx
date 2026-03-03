import { Link } from "wouter";
import { BrainCircuit } from "lucide-react";

export function Navigation() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
                <BrainCircuit className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">NanoGPT Studio</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
