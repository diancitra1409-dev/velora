const METEORS = [
  { id: 'm1', top: '-4%', left: '72%', duration: '4.2s', delay: '0.3s' },
  { id: 'm2', top: '8%', left: '95%', duration: '5.6s', delay: '1.8s' },
  { id: 'm3', top: '-6%', left: '42%', duration: '4.8s', delay: '3.1s' },
  { id: 'm4', top: '22%', left: '102%', duration: '6.4s', delay: '0.9s' },
  { id: 'm5', top: '-2%', left: '86%', duration: '3.7s', delay: '4.6s' },
  { id: 'm6', top: '34%', left: '104%', duration: '7.1s', delay: '2.5s' },
  { id: 'm7', top: '-5%', left: '58%', duration: '5.1s', delay: '5.8s' },
  { id: 'm8', top: '15%', left: '98%', duration: '4.5s', delay: '6.9s' },
];

const TWINKLE_STARS = [
  { id: 's1', top: '7%', left: '11%', size: 'w-1 h-1', tone: 'bg-white opacity-60', duration: '3.2s', delay: '0.1s' },
  { id: 's2', top: '14%', left: '28%', size: 'w-0.5 h-0.5', tone: 'bg-blue-200 opacity-50', duration: '4.1s', delay: '1.2s' },
  { id: 's3', top: '9%', left: '52%', size: 'w-1 h-1', tone: 'bg-purple-200 opacity-70', duration: '2.9s', delay: '0.6s' },
  { id: 's4', top: '19%', left: '76%', size: 'w-0.5 h-0.5', tone: 'bg-pink-200 opacity-40', duration: '4.7s', delay: '2.1s' },
  { id: 's5', top: '26%', left: '6%', size: 'w-1 h-1', tone: 'bg-sky-200 opacity-50', duration: '3.6s', delay: '1.7s' },
  { id: 's6', top: '31%', left: '39%', size: 'w-0.5 h-0.5', tone: 'bg-white opacity-30', duration: '5.0s', delay: '0.4s' },
  { id: 's7', top: '28%', left: '64%', size: 'w-1 h-1', tone: 'bg-purple-200 opacity-60', duration: '3.4s', delay: '2.8s' },
  { id: 's8', top: '38%', left: '89%', size: 'w-0.5 h-0.5', tone: 'bg-pink-200 opacity-50', duration: '4.4s', delay: '1.0s' },
  { id: 's9', top: '45%', left: '18%', size: 'w-0.5 h-0.5', tone: 'bg-white opacity-40', duration: '3.9s', delay: '2.4s' },
  { id: 's10', top: '49%', left: '47%', size: 'w-1 h-1', tone: 'bg-blue-100 opacity-60', duration: '3.1s', delay: '0.9s' },
  { id: 's11', top: '54%', left: '81%', size: 'w-0.5 h-0.5', tone: 'bg-purple-200 opacity-30', duration: '4.8s', delay: '1.5s' },
  { id: 's12', top: '61%', left: '24%', size: 'w-1 h-1', tone: 'bg-pink-100 opacity-50', duration: '3.7s', delay: '3.0s' },
  { id: 's13', top: '66%', left: '59%', size: 'w-0.5 h-0.5', tone: 'bg-white opacity-60', duration: '4.2s', delay: '0.3s' },
  { id: 's14', top: '72%', left: '91%', size: 'w-1 h-1', tone: 'bg-sky-200 opacity-70', duration: '2.8s', delay: '1.9s' },
  { id: 's15', top: '78%', left: '9%', size: 'w-0.5 h-0.5', tone: 'bg-purple-100 opacity-40', duration: '4.5s', delay: '2.6s' },
  { id: 's16', top: '83%', left: '36%', size: 'w-1 h-1', tone: 'bg-white opacity-50', duration: '3.3s', delay: '1.1s' },
  { id: 's17', top: '88%', left: '70%', size: 'w-0.5 h-0.5', tone: 'bg-pink-200 opacity-60', duration: '4.0s', delay: '0.7s' },
  { id: 's18', top: '92%', left: '15%', size: 'w-1 h-1', tone: 'bg-blue-200 opacity-30', duration: '4.9s', delay: '2.2s' },
];

/**
 * Non-blocking decorative outer-space layer with GPU-accelerated shooting stars
 * and twinkling background stars rendered behind the main app UI.
 */
export default function MeteorShower() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 overflow-hidden pointer-events-none z-0"
    >
      {/* Subtle twinkling stars */}
      {TWINKLE_STARS.map((star) => (
        <span
          key={star.id}
          style={{
            top: star.top,
            left: star.left,
            animationDuration: star.duration,
            animationDelay: star.delay,
          }}
          className={`absolute rounded-full animate-star-twinkle ${star.size} ${star.tone}`}
        />
      ))}

      {/* Diagonal cosmic meteors */}
      {METEORS.map((meteor) => (
        <div
          key={meteor.id}
          style={{
            top: meteor.top,
            left: meteor.left,
            animationDuration: meteor.duration,
            animationDelay: meteor.delay,
          }}
          className="meteor-streak absolute flex items-center"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_2px_rgba(236,72,153,0.8)] shrink-0" />
          <span className="w-24 sm:w-36 h-[1.5px] bg-gradient-to-r from-white via-pink-400 to-purple-500/0 -ml-0.5" />
        </div>
      ))}
    </div>
  );
}
