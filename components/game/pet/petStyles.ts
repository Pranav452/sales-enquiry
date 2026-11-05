// Keyframes for the pet's HTML layers. Injected once by the companion.
// Everything prefixed "pet-" is switched off under reduced motion.

export const PET_CSS = `
.pet-bob { transform-origin: 50% 100%; will-change: transform; }
.pet-bob-content  { animation: pet-bob 2.8s ease-in-out infinite; }
.pet-bob-sleepy   { animation: pet-doze 4.2s ease-in-out infinite; }
.pet-bob-happy    { animation: pet-bounce 1.15s ease-in-out infinite; }
.pet-bob-ecstatic { animation: pet-bounce 0.8s ease-in-out infinite; }
.pet-bob-grumpy   { animation: pet-sulk 3.4s ease-in-out infinite; }
.pet-bob-walk     { animation: pet-waddle 0.5s ease-in-out infinite; }
.pet-spin { transform-origin: 50% 55%; }
.pet-spin-ecstatic { animation: pet-spin-pause 7s ease-in-out infinite; }
.pet-aura { animation: pet-aura-pulse 2.6s ease-in-out infinite; }
.pet-talk { opacity: 0; animation: pet-talk 0.3s steps(1, end) 5; }
.pet-summon { animation: pet-peek 0.6s ease-out both; }

@keyframes pet-bob {
  0%, 100% { transform: translateY(0) scale(1, 1); }
  50%      { transform: translateY(-3px) scale(1.015, 0.985); }
}
@keyframes pet-doze {
  0%, 100% { transform: translateY(0) rotate(-2deg) scale(1, 1); }
  50%      { transform: translateY(1.5px) rotate(-4deg) scale(1.02, 0.97); }
}
@keyframes pet-bounce {
  0%, 100% { transform: translateY(0) scale(1, 1); }
  12%      { transform: translateY(0) scale(1.07, 0.93); }
  38%      { transform: translateY(-9px) scale(0.96, 1.05); }
  62%      { transform: translateY(0) scale(1.05, 0.95); }
  76%      { transform: translateY(0) scale(1, 1); }
}
@keyframes pet-sulk {
  0%, 100% { transform: translateX(0) rotate(0deg); }
  25%      { transform: translateX(-1px) rotate(-2deg); }
  75%      { transform: translateX(1px) rotate(2deg); }
}
@keyframes pet-waddle {
  0%, 100% { transform: rotate(-5deg) translateY(0); }
  25%      { transform: rotate(0deg) translateY(-2.5px); }
  50%      { transform: rotate(5deg) translateY(0); }
  75%      { transform: rotate(0deg) translateY(-2.5px); }
}
@keyframes pet-spin-pause {
  0%, 84% { transform: rotate(0deg); }
  100%    { transform: rotate(360deg); }
}
@keyframes pet-aura-pulse {
  0%, 100% { opacity: 0.6; }
  50%      { opacity: 1; }
}
@keyframes pet-talk {
  0%   { opacity: 1; }
  50%  { opacity: 0; }
  100% { opacity: 0; }
}
@keyframes pet-peek {
  0%   { transform: translateY(100%); }
  100% { transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  [data-pet-root] [class*="pet-"] { animation: none !important; }
  [data-pet-root] .pet-talk { opacity: 0 !important; }
}
`
