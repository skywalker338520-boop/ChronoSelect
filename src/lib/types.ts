export type TouchPoint = {
  id: number;
  x: number;
  y: number;
  isWinner: boolean;
  isLoser: boolean;
  team: 'A' | 'B' | null;
  hue: number;
  saturation: number;
  opacity: number;
  size: number; // The current animated size
  baseSize: number; // The base size to calculate breathing from
  animationPhase: number; // Used for the sin wave of the breathing effect
};
