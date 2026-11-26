import { useId } from 'react';

/**
 * Animated full-body floating astronaut mascot SVG:
 * - Sleek white & lavender space suit
 * - Dark visor with glowing cyan & pink reflections + cute glowing eyes
 * - Mini purple/pink jetpack with animated thruster sparkles
 * - Raised waving arm
 * - Optional glowing purple-pink orbit aura when Velora AI is thinking
 */
export default function AstronautIcon({
  className = 'w-14 h-14',
  isThinking = false,
  animateFloat = true,
}) {
  const uid = useId().replace(/:/g, '');
  const visorId = `visor-${uid}`;
  const visorGlossId = `gloss-${uid}`;
  const suitShadeId = `suit-${uid}`;
  const jetpackId = `jetpack-${uid}`;
  const flameId = `flame-${uid}`;
  const orbitGradId = `orbit-${uid}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${
        animateFloat ? 'animate-astro-float' : ''
      } ${className}`}
      aria-hidden="true"
    >
      {/* Thinking aura & spinning cosmic orbit ring */}
      {isThinking && (
        <>
          <span className="pointer-events-none absolute -inset-2 rounded-full bg-gradient-to-tr from-purple-500/35 via-pink-500/30 to-cyan-400/25 blur-md animate-pulse" />
          <svg
            viewBox="0 0 100 100"
            className="pointer-events-none absolute -inset-1.5 h-[calc(100%+12px)] w-[calc(100%+12px)] animate-astro-orbit"
          >
            <defs>
              <linearGradient id={orbitGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#EC4899" />
                <stop offset="50%" stopColor="#A855F7" />
                <stop offset="100%" stopColor="#22D3EE" stopOpacity="0.15" />
              </linearGradient>
            </defs>
            <ellipse
              cx="50"
              cy="50"
              rx="45"
              ry="24"
              transform="rotate(-22 50 50)"
              fill="none"
              stroke={`url(#${orbitGradId})`}
              strokeWidth="2.5"
              strokeDasharray="16 8"
              strokeLinecap="round"
            />
            <circle cx="88" cy="35" r="3" fill="#F472B6" />
          </svg>
        </>
      )}

      <svg
        viewBox="0 0 96 96"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="relative h-full w-full drop-shadow-[0_0_14px_rgba(168,85,247,0.6)]"
      >
        <defs>
          <linearGradient id={visorId} x1="30" y1="20" x2="64" y2="45" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#090D24" />
            <stop offset="60%" stopColor="#1E1B4B" />
            <stop offset="100%" stopColor="#0B1026" />
          </linearGradient>
          <linearGradient id={visorGlossId} x1="31" y1="21" x2="62" y2="43" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#A855F7" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#F472B6" stopOpacity="0.45" />
          </linearGradient>
          <linearGradient id={suitShadeId} x1="30" y1="16" x2="66" y2="82" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#EDE9FE" />
            <stop offset="100%" stopColor="#DDD6FE" />
          </linearGradient>
          <linearGradient id={jetpackId} x1="20" y1="44" x2="36" y2="70" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
          <linearGradient id={flameId} x1="26" y1="68" x2="26" y2="84" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F472B6" />
            <stop offset="55%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Mini Purple/Pink Jetpack peeking behind left torso */}
        <g>
          <rect
            x="21"
            y="45"
            width="13"
            height="21"
            rx="5"
            fill={`url(#${jetpackId})`}
            stroke="#E9D5FF"
            strokeWidth="1.4"
          />
          <rect x="24" y="64" width="7" height="3.5" rx="1.5" fill="#4C1D95" />
          {/* Thruster Glow & Sparkles */}
          <g className="animate-thruster-pulse">
            <path
              d="M24.5 67.5C24.5 67.5 23 76 27.5 81C32 76 30.5 67.5 30.5 67.5H24.5Z"
              fill={`url(#${flameId})`}
            />
            <circle cx="22.5" cy="76.5" r="1.4" fill="#F9A8D4" />
            <circle cx="31.5" cy="78.5" r="1.1" fill="#67E8F9" />
            <circle cx="26.5" cy="84" r="1" fill="#E9D5FF" />
          </g>
        </g>

        {/* Right arm (resting/floating down) */}
        <path
          d="M59 49C64.5 51.5 68 57 67 62.5C66.4 65 63.2 65.5 61.5 63.5C59.5 61 58.5 57.5 56.5 55.5"
          fill={`url(#${suitShadeId})`}
          stroke="#C4B5FD"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="64.2" cy="63" r="3.6" fill="#C4B5FD" stroke="#F5F3FF" strokeWidth="1.2" />

        {/* Left waving arm (raised!) */}
        <g className="animate-astro-wave">
          <path
            d="M36 49C30 45.5 25 39 25.5 32.5C25.8 29.8 29 29.2 30.8 31.4C33 34 34 38.8 38 42.2"
            fill={`url(#${suitShadeId})`}
            stroke="#C4B5FD"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          <circle cx="27.6" cy="31.2" r="3.8" fill="#F472B6" stroke="#FDF2F8" strokeWidth="1.2" />
        </g>

        {/* Floating Legs & Lavender Boots */}
        {/* Left leg */}
        <path
          d="M38.5 65L35.5 79C35 81.5 37 83.5 39.8 83.2C42.2 83 43.6 81 44 78.5L46 67"
          fill={`url(#${suitShadeId})`}
          stroke="#C4B5FD"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <rect x="34" y="79" width="10.5" height="5.5" rx="2.75" fill="#A78BFA" stroke="#EDE9FE" strokeWidth="1.2" />

        {/* Right leg (slightly bent zero-g pose) */}
        <path
          d="M50 67L54.5 77.5C55.5 80 58 81 60.5 80C62.8 79 63.6 76.5 62.4 74.2L57.5 65"
          fill={`url(#${suitShadeId})`}
          stroke="#C4B5FD"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <rect
          x="54"
          y="75.5"
          width="10.5"
          height="5.5"
          rx="2.75"
          transform="rotate(-14 54 75.5)"
          fill="#A78BFA"
          stroke="#EDE9FE"
          strokeWidth="1.2"
        />

        {/* Torso */}
        <rect
          x="35"
          y="44"
          width="25"
          height="24"
          rx="10"
          fill={`url(#${suitShadeId})`}
          stroke="#C4B5FD"
          strokeWidth="1.6"
        />
        {/* Lavender belt */}
        <rect x="35.5" y="59.5" width="24" height="4" rx="2" fill="#A78BFA" />
        <rect x="44.5" y="58.8" width="6" height="5.4" rx="1.5" fill="#F472B6" />

        {/* Chest control badge */}
        <rect x="41.5" y="48.5" width="12" height="7.5" rx="2.5" fill="#1E1B4B" stroke="#818CF8" strokeWidth="1.2" />
        <circle cx="45" cy="52.2" r="1.3" fill="#22D3EE" />
        <circle cx="48.5" cy="52.2" r="1.3" fill="#F472B6" />
        <rect x="50.7" y="51" width="1.5" height="2.4" rx="0.7" fill="#C4B5FD" />

        {/* Helmet Antenna */}
        <line x1="48" y1="10.5" x2="48" y2="16" stroke="#E9D5FF" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="48" cy="9.5" r="2.3" fill="#F472B6" />

        {/* Ear comms */}
        <rect x="27.5" y="26.5" width="4.5" height="9" rx="2.25" fill="#C4B5FD" stroke="#FFFFFF" strokeWidth="1.2" />
        <rect x="64" y="26.5" width="4.5" height="9" rx="2.25" fill="#C4B5FD" stroke="#FFFFFF" strokeWidth="1.2" />

        {/* Helmet Outer Shell */}
        <rect
          x="30"
          y="15"
          width="36"
          height="31"
          rx="15.5"
          fill={`url(#${suitShadeId})`}
          stroke="#DDD6FE"
          strokeWidth="1.8"
        />

        {/* Collar ring */}
        <rect x="37" y="42.5" width="22" height="4" rx="2" fill="#A855F7" stroke="#F5F3FF" strokeWidth="1.1" />

        {/* Dark Visor */}
        <rect
          x="34.5"
          y="20"
          width="27"
          height="20"
          rx="9.5"
          fill={`url(#${visorId})`}
          stroke="#A78BFA"
          strokeWidth="1.4"
        />
        <rect x="35.5" y="21" width="25" height="18" rx="8.5" fill={`url(#${visorGlossId})`} />

        {/* Glowing cyan & pink reflections */}
        <path
          d="M39 24.5C40.5 22.8 43 22 45.8 22.3"
          stroke="#67E8F9"
          strokeWidth="2"
          strokeLinecap="round"
          strokeOpacity="0.95"
        />
        <circle cx="56.5" cy="24.8" r="1.4" fill="#F472B6" fillOpacity="0.95" />
        <path
          d="M53.5 36.2C55.5 35.8 57.5 34.4 58.2 32.5"
          stroke="#F472B6"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeOpacity="0.7"
        />

        {/* Cute glowing eyes */}
        <ellipse cx="43.5" cy="30.5" rx="2" ry="2.4" fill="#67E8F9" />
        <circle cx="44" cy="29.6" r="0.8" fill="#FFFFFF" />
        <ellipse cx="52.5" cy="30.5" rx="2" ry="2.4" fill="#67E8F9" />
        <circle cx="53" cy="29.6" r="0.8" fill="#FFFFFF" />
        {/* Tiny happy blush dots */}
        <ellipse cx="40" cy="33.2" rx="1.6" ry="0.9" fill="#F472B6" fillOpacity="0.65" />
        <ellipse cx="56" cy="33.2" rx="1.6" ry="0.9" fill="#F472B6" fillOpacity="0.65" />
      </svg>
    </div>
  );
}
