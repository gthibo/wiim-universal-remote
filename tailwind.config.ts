import type { Config } from "tailwindcss";

/* ============================================================================
   SHOWA HI-FI COUNTER — re-skin Tailwind config
   Drop-in replacement for tailwind.config.ts.

   Adds the display/mono font-family tokens (so `font-display` / `font-mono`
   utilities resolve to the CSS variables in globals.css) and a few Showa
   material colors (brass, walnut, faceplate) for per-card use. Everything
   else mirrors the original so existing utility classes keep working.
   ========================================================================== */

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: "hsl(var(--success))",
        warning: "hsl(var(--warning))",
        /* Showa material tokens */
        walnut: {
          DEFAULT: "hsl(var(--walnut))",
          dark: "hsl(var(--walnut-dark))",
        },
        faceplate: {
          DEFAULT: "hsl(var(--faceplate))",
          dim: "hsl(var(--faceplate-dim))",
        },
        rust: {
          DEFAULT: "hsl(var(--rust))",
          recessed: "hsl(var(--rust-recessed))",
        },
        teal: "hsl(var(--teal))",
        velvet: "hsl(var(--velvet))",
        static: "hsl(var(--static))",
        brass: {
          DEFAULT: "hsl(var(--brass))",
          dim: "hsl(var(--brass-dim))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "0.7" },
          "70%": { transform: "scale(1.1)", opacity: "0" },
          "100%": { transform: "scale(0.95)", opacity: "0" },
        },
        /* SHOWA RE-SKIN: readout marquee for the now-playing track title —
           an AVR-style scrolling display for titles too long for their
           window. --marquee-distance / --marquee-duration are set
           per-instance by the MarqueeText component (sized to the actual
           rendered text + gap, so the loop is seamless: the keyframe runs
           translateX(0) to translateX(-distance), and the second text copy
           sits exactly one `distance` to the right of the first, so the
           loop point is invisible). The hold-then-scroll shape (rather than
           a plain animation-delay) is deliberate: animation-delay only
           applies before the FIRST iteration, not before each loop, so a
           real per-loop pause has to live inside the keyframe's own
           percentages — hold at 0 for the first ~12% of total duration,
           then scroll for the rest. */
        marquee: {
          "0%, 12%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(var(--marquee-distance))" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "pulse-ring": "pulse-ring 2s cubic-bezier(0.4,0,0.6,1) infinite",
        marquee: "marquee var(--marquee-duration) linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
