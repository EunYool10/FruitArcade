import confetti from 'canvas-confetti';

const FRUIT_COLORS = ['#e5483d', '#4aa364', '#f4b63a', '#8257b8', '#3f8fd0'];

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
