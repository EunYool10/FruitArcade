import confetti from 'canvas-confetti';

const FRUIT_COLORS = ['#ff4778', '#2ec27e', '#ffb627', '#7a5cff', '#2ea9ff'];

/** Fruit-colored confetti burst (skipped automatically for reduced-motion users). */
export function celebrate(big = false): void {
  confetti({
    particleCount: big ? 150 : 80,
    spread: big ? 95 : 70,
    startVelocity: big ? 45 : 35,
    origin: { y: 0.6 },
    colors: FRUIT_COLORS,
    disableForReducedMotion: true,
  });
}
