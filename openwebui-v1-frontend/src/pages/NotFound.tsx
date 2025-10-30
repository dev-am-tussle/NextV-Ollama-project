import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, Home, Mail } from "lucide-react";

/**
 * NotFound.tsx - Modern 404 Page Component
 * 
 * Features:
 * - Inline animated SVG illustration (robot/compass motif)
 * - Animated background with prefers-reduced-motion support
 * - Accessible with ARIA attributes and focus management
 * - Two CTAs: Go Home & Report Issue
 * 
 * UPGRADE NOTES:
 * - To use Lottie: dynamic import @lottiefiles/react-lottie-player, lazy load JSON from /public/404-lottie.json
 * - To use animated GIF: uncomment the <img> tag below and add /public/404-fallback.gif (max 200KB, 480x320)
 * - For i18n: wrap strings with t('404.title'), t('404.description'), etc.
 * - Theme tokens: Replace color classes with your design system tokens (currently uses existing theme vars)
 */

const NotFoundPage = () => {
  const location = useLocation();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Check for prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Focus management for accessibility
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  // Generate mailto link with current path
  const generateReportIssueLink = () => {
    const subject = encodeURIComponent(`404 Error on ${location.pathname}`);
    const body = encodeURIComponent(
      `I encountered a 404 error while trying to access: ${window.location.href}\n\nPlease investigate this issue.`
    );
    return `mailto:support@example.com?subject=${subject}&body=${body}`;
  };

  return (
    <main
      role="main"
      className="relative min-h-screen w-full overflow-hidden bg-background flex items-center justify-center"
      aria-live="polite"
    >
      {/* Animated Background Blobs - respects prefers-reduced-motion */}
      {!reducedMotion && (
        <>
          <div
            className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full mix-blend-multiply filter blur-xl animate-blob"
            style={{ animationDelay: "0s" }}
            aria-hidden="true"
          />
          <div
            className="absolute top-40 right-10 w-72 h-72 bg-accent/10 rounded-full mix-blend-multiply filter blur-xl animate-blob"
            style={{ animationDelay: "2s" }}
            aria-hidden="true"
          />
          <div
            className="absolute -bottom-8 left-1/2 w-72 h-72 bg-secondary/10 rounded-full mix-blend-multiply filter blur-xl animate-blob"
            style={{ animationDelay: "4s" }}
            aria-hidden="true"
          />
        </>
      )}

      {/* Main Content Container */}
      <div className="relative z-10 container mx-auto max-w-4xl px-4 py-20 text-center">
        {/* Inline SVG Illustration with Animation */}
        <div className="mb-8 flex justify-center" aria-hidden="true">
          <svg
            width="320"
            height="240"
            viewBox="0 0 320 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-lg"
          >
            {/* Robot/Compass Body - Main Container */}
            <g id="robot-body">
              {/* Base Circle */}
              <circle
                cx="160"
                cy="120"
                r="80"
                fill="hsl(var(--muted))"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
              />
              
              {/* Inner Compass Ring */}
              <circle
                cx="160"
                cy="120"
                r="60"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2"
                strokeDasharray="4 4"
                className={reducedMotion ? "" : "animate-spin"}
                style={{ transformOrigin: "center", animationDuration: "20s" }}
              />

              {/* Compass Needle - Animated */}
              <g className={reducedMotion ? "" : "animate-pulse"}>
                <line
                  x1="160"
                  y1="120"
                  x2="160"
                  y2="70"
                  stroke="hsl(var(--destructive))"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                <polygon
                  points="160,65 155,75 165,75"
                  fill="hsl(var(--destructive))"
                />
              </g>

              {/* Compass Points - N, E, S, W */}
              <text x="160" y="50" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold" textAnchor="middle">N</text>
              <text x="210" y="125" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold" textAnchor="middle">E</text>
              <text x="160" y="195" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold" textAnchor="middle">S</text>
              <text x="110" y="125" fill="hsl(var(--foreground))" fontSize="14" fontWeight="bold" textAnchor="middle">W</text>
            </g>

            {/* Floating Orbiting Elements */}
            {!reducedMotion && (
              <>
                <circle
                  cx="160"
                  cy="40"
                  r="8"
                  fill="hsl(var(--accent))"
                  className="animate-bounce"
                  style={{ animationDuration: "3s", animationDelay: "0s" }}
                />
                <circle
                  cx="240"
                  cy="120"
                  r="6"
                  fill="hsl(var(--secondary))"
                  className="animate-bounce"
                  style={{ animationDuration: "2.5s", animationDelay: "0.5s" }}
                />
                <circle
                  cx="160"
                  cy="200"
                  r="7"
                  fill="hsl(var(--primary))"
                  className="animate-bounce"
                  style={{ animationDuration: "2.8s", animationDelay: "1s" }}
                />
              </>
            )}

            {/* Lost Robot Face/Eyes - Confused Expression */}
            <g id="robot-face">
              <circle cx="140" cy="110" r="8" fill="hsl(var(--foreground))" />
              <circle cx="180" cy="110" r="8" fill="hsl(var(--foreground))" />
              <path
                d="M 140 140 Q 160 135 180 140"
                stroke="hsl(var(--foreground))"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </g>

            {/* Question Marks Floating Around */}
            <text
              x="100"
              y="80"
              fill="hsl(var(--muted-foreground))"
              fontSize="20"
              fontWeight="bold"
              className={reducedMotion ? "" : "animate-pulse"}
              opacity="0.6"
            >
              ?
            </text>
            <text
              x="210"
              y="90"
              fill="hsl(var(--muted-foreground))"
              fontSize="18"
              fontWeight="bold"
              className={reducedMotion ? "" : "animate-pulse"}
              style={{ animationDelay: "1s" }}
              opacity="0.6"
            >
              ?
            </text>
          </svg>

          {/* Alternative: Animated GIF Fallback (uncomment to use) */}
          {/* 
          <img 
            src="/404-fallback.gif" 
            alt="Lost robot animation" 
            width="480" 
            height="320"
            className="max-w-sm"
            loading="lazy"
          /> 
          */}
        </div>

        {/* Heading - Accessible & Focusable */}
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="text-6xl md:text-8xl font-bold mb-4 text-foreground tracking-tight outline-none"
        >
          404
        </h1>

        {/* Playful Multilingual Copy */}
        <p className="text-2xl md:text-3xl font-semibold mb-4 text-primary">
          Oops — Page kho gaya! 🧭
        </p>

        {/* Description */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
          Looks like you took a wrong turn. The page you're looking for doesn't exist or has been moved.
          Let's get you back on track!
        </p>

        {/* CTAs - Primary & Secondary Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
          {/* Primary CTA: Go Home */}
          <Button asChild size="lg" className="gap-2 min-w-[160px]">
            <Link to="/">
              <Home className="w-5 h-5" />
              Go to Home
            </Link>
          </Button>

          {/* Secondary CTA: Search Site */}
          <Button asChild variant="outline" size="lg" className="gap-2 min-w-[160px]">
            <Link to="/search?q=">
              <Search className="w-5 h-5" />
              Search Site
            </Link>
          </Button>
        </div>

        {/* Tertiary Action: Report Issue */}
        <div className="mt-4">
          <a
            href={generateReportIssueLink()}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors underline-offset-4 hover:underline"
          >
            <Mail className="w-4 h-4" />
            Report this issue
          </a>
        </div>

        {/* Developer Info - Current Path */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border max-w-md mx-auto">
          <p className="text-xs font-mono text-muted-foreground">
            Attempted path: <code className="text-destructive text-white">{location.pathname}</code>
          </p>
        </div>
      </div>

      {/* Custom Blob Animation Keyframes - Added via Tailwind Config */}
      <style>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        
        .animate-blob {
          animation: blob 7s infinite;
        }
        
        @media (prefers-reduced-motion: reduce) {
          .animate-blob,
          .animate-spin,
          .animate-pulse,
          .animate-bounce {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
};

export default NotFoundPage;
