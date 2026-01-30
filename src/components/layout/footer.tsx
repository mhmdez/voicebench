import Link from "next/link";
import { Github } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row px-4">
        <p className="text-sm text-muted-foreground">
          VoiceBench v0.1.0
        </p>
        <div className="flex items-center space-x-4">
          <Link
            href="https://github.com/mhmdez/voicebench"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-5 w-5" />
            <span className="sr-only">GitHub</span>
          </Link>
        </div>
      </div>
    </footer>
  );
}
