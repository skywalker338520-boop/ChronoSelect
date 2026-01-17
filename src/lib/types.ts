export type TouchPoint = {
  id: number;
  x: number;
  y: number;
  isWinner: boolean;
  isLoser: boolean;
  team: 'A' | 'B' | null;
  hue: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  size: number;
};
