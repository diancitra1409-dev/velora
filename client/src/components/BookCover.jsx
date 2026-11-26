import { useState } from 'react';

const COVER_PALETTES = [
  'from-blue-950 via-indigo-900 to-purple-950 text-blue-100 border-blue-400/35',
  'from-purple-950 via-fuchsia-900 to-slate-950 text-pink-100 border-pink-400/35',
  'from-indigo-950 via-purple-900 to-blue-950 text-purple-100 border-purple-400/35',
  'from-slate-900 via-blue-950 to-purple-900 text-sky-100 border-indigo-400/35',
  'from-fuchsia-950 via-purple-950 to-indigo-950 text-fuchsia-100 border-pink-400/35',
];

function getPaletteIndex(title = '') {
  let hash = 0;
  for (let i = 0; i < title.length; i += 1) {
    hash = (hash * 31 + title.charCodeAt(i)) % COVER_PALETTES.length;
  }
  return Math.abs(hash);
}

/**
 * Displays an Open Library book cover with a stylish cosmic typographic fallback
 * whenever cover_i is missing, fails to load, or returns a 1x1 placeholder pixel.
 */
export default function BookCover({ coverUrl, title, author, size = 'md' }) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(coverUrl) && !failed;
  const paletteClass = COVER_PALETTES[getPaletteIndex(title)];

  const sizeClasses =
    size === 'sm'
      ? 'w-11 h-16 rounded-md text-[8px]'
      : size === 'lg'
        ? 'w-28 h-40 rounded-xl text-[10px]'
        : 'w-20 h-28 rounded-lg text-[10px]';

  if (showImage) {
    return (
      <div
        className={`relative shrink-0 overflow-hidden bg-cosmos-800 border border-purple-500/30 shadow-lg shadow-purple-950/50 ${sizeClasses}`}
      >
        <img
          src={coverUrl}
          alt={`Cover of ${title}`}
          loading="lazy"
          onError={() => setFailed(true)}
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth < 2 || e.currentTarget.naturalHeight < 2) {
              setFailed(true);
            }
          }}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      aria-label={`Typographic cover for ${title}`}
      className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${paletteClass} border shadow-lg shadow-purple-950/60 flex flex-col justify-between p-2.5 select-none ${sizeClasses}`}
    >
      <div className="absolute inset-y-0 left-1.5 w-px bg-white/15" />
      <div className="pl-1.5">
        <span className="inline-block uppercase tracking-widest opacity-65 text-[0.55em] font-semibold">
          Velora Edition
        </span>
      </div>
      <div className="pl-1.5 my-auto">
        <p
          className={`font-editorial font-semibold leading-tight line-clamp-3 ${
            size === 'sm' ? 'text-[9px]' : 'text-xs'
          }`}
        >
          {title}
        </p>
      </div>
      {size !== 'sm' && (
        <div className="pl-1.5 border-t border-white/15 pt-1">
          <p className="truncate opacity-75 text-[10px] font-medium">
            {author || 'Unknown Author'}
          </p>
        </div>
      )}
    </div>
  );
}
