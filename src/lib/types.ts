export type Particle = {
  x: number;
  y: number;
  radius: number;
  angle: number;
  speed: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: string;
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
