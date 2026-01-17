export type Particle = {
  x: number;
  y: number;
  radius: number;
  angle: number;
  speed: number;
  size: number;
  color: string;
  history: Array<{ x: number; y: number }>;
  opacity: number;
};

export type TouchPoint = {
  id: number;
  x: number;
  y: number;
  particles: Particle[];
  isWinner: boolean;
  isLoser: boolean;
  team: 'A' | 'B' | null;
  hue: number;
};
