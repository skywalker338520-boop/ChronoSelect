"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import type { TouchPoint, Particle } from '@/lib/types';
import { useSound } from '@/hooks/use-sound';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const MAX_TOUCHES = 10;
const PARTICLE_COUNT = 50;
const INACTIVITY_TIMEOUT = 10000;
const COUNTDOWN_SECONDS = 3;

const createParticle = (touchX: number, touchY: number): Particle => {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * 40 + 20;
  return {
    x: touchX,
    y: touchY,
    radius: radius,
    angle: angle,
    speed: Math.random() * 0.02 + 0.01,
    vx: 0,
    vy: 0,
    life: 1,
    size: Math.random() * 2 + 1,
    color: 'white',
  };
};

export default function ChronoSelect() {
  const [touches, setTouches] = useState<Map<number, TouchPoint>>(new Map());
  const [gameState, setGameState] = useState<'IDLE' | 'WAITING' | 'COUNTDOWN' | 'RESULT'>('IDLE');
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_SECONDS);
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [showInactivePrompt, setShowInactivePrompt] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const inactiveTimerId = useRef<NodeJS.Timeout>();
  const countdownIntervalId = useRef<NodeJS.Timeout>();
  const gameSpeed = useRef(1);
  const touchIdCounter = useRef(0);

  const { playTick, playWinnerSound, playTeamSplitSound, playLoserSound } = useSound();

  const resetGame = useCallback(() => {
    setTouches(new Map());
    setGameState('IDLE');
    setShowInactivePrompt(false);
    gameSpeed.current = 1;
    touchIdCounter.current = 0;
    if (countdownIntervalId.current) clearInterval(countdownIntervalId.current);
    if (inactiveTimerId.current) clearTimeout(inactiveTimerId.current);
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setTouches(currentTouches => {
      const newTouches = new Map(currentTouches);
      newTouches.forEach((touch, id) => {
        const updatedParticles: Particle[] = [];
        
        ctx.beginPath();
        ctx.arc(touch.x, touch.y, 15, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(10, 10, 10, 0.8)';
        ctx.fill();

        touch.particles.forEach(p => {
          let particle = { ...p };
          if (touch.isWinner || touch.isLoser) {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.life -= 0.01;
          } else {
            particle.angle += particle.speed * gameSpeed.current;
            particle.x = touch.x + Math.cos(particle.angle) * particle.radius;
            particle.y = touch.y + Math.sin(particle.angle) * particle.radius;
          }

          if (particle.life > 0) {
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            ctx.fillStyle = `hsla(${touch.hue}, 100%, 75%, ${particle.life})`;
            ctx.shadowColor = `hsla(${touch.hue}, 100%, 75%, 1)`;
            ctx.shadowBlur = 10;
            ctx.fill();
            updatedParticles.push(particle);
          }
        });
        
        ctx.shadowBlur = 0;
        newTouches.set(id, { ...touch, particles: updatedParticles });
      });

      return newTouches;
    });

    animationFrameId.current = requestAnimationFrame(animate);
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (gameState === 'RESULT') {
        resetGame();
        return;
    }
    
    clearTimeout(inactiveTimerId.current);
    setShowInactivePrompt(false);

    const newTouches = new Map(touches);
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (newTouches.size >= MAX_TOUCHES) break;

      const particles = Array.from({ length: PARTICLE_COUNT }, () => createParticle(touch.clientX, touch.clientY));
      
      newTouches.set(touch.identifier, {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        particles: particles,
        isWinner: false,
        isLoser: false,
        team: null,
        hue: (newTouches.size * 36) % 360,
      });
    }
    setTouches(newTouches);
    setGameState(newTouches.size > 1 ? 'COUNTDOWN' : 'WAITING');
  }, [touches, gameState, resetGame]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    e.preventDefault();
    setTouches(currentTouches => {
      const newTouches = new Map(currentTouches);
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const existingTouch = newTouches.get(touch.identifier);
        if (existingTouch) {
          newTouches.set(touch.identifier, { ...existingTouch, x: touch.clientX, y: touch.clientY });
        }
      }
      return newTouches;
    });
  }, []);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (gameState === 'RESULT') return;
    
    setTouches(currentTouches => {
      const newTouches = new Map(currentTouches);
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        newTouches.delete(touch.identifier);
      }
      if (newTouches.size < 2) {
        setGameState(newTouches.size === 1 ? 'WAITING' : 'IDLE');
      }
      return newTouches;
    });
  }, [gameState]);
  
  const handleMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    if (e.button !== 0) return; // Only left click

    if (gameState === 'RESULT') {
      resetGame();
      return;
    }
    if (touches.size >= MAX_TOUCHES) return;

    clearTimeout(inactiveTimerId.current);
    setShowInactivePrompt(false);

    const newTouches = new Map(touches);
    const touchId = touchIdCounter.current++;
    
    const particles = Array.from({ length: PARTICLE_COUNT }, () => createParticle(e.clientX, e.clientY));
    
    newTouches.set(touchId, {
        id: touchId,
        x: e.clientX,
        y: e.clientY,
        particles: particles,
        isWinner: false,
        isLoser: false,
        team: null,
        hue: (newTouches.size * 36) % 360,
    });
    
    setTouches(newTouches);
    setGameState(newTouches.size > 1 ? 'COUNTDOWN' : 'WAITING');
  }, [touches, gameState, resetGame]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    resetGame();
  }, [resetGame]);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    
    // Mouse events for desktop testing
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('contextmenu', handleContextMenu);

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('contextmenu', handleContextMenu);

      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, animate, handleMouseDown, handleContextMenu]);

  useEffect(() => {
    if (gameState === 'IDLE' && touches.size === 0) {
      inactiveTimerId.current = setTimeout(() => setShowInactivePrompt(true), INACTIVITY_TIMEOUT);
    } else {
      clearTimeout(inactiveTimerId.current);
      setShowInactivePrompt(false);
    }

    if (gameState === 'COUNTDOWN') {
      let count = COUNTDOWN_SECONDS;
      setCountdown(count);
      playTick(1);

      countdownIntervalId.current = setInterval(() => {
        count--;
        setCountdown(count);
        gameSpeed.current += 0.5;
        if (count > 0) {
          playTick(gameSpeed.current);
        } else {
          clearInterval(countdownIntervalId.current);
          setGameState('RESULT');
        }
      }, 1000);
    } else {
      gameSpeed.current = 1;
      clearInterval(countdownIntervalId.current);
    }

    return () => {
      clearTimeout(inactiveTimerId.current);
      clearInterval(countdownIntervalId.current);
    }
  }, [gameState, touches.size, playTick]);

  useEffect(() => {
    if (gameState === 'RESULT') {
      const currentTouches = Array.from(touches.values());
      if (currentTouches.length === 0) {
        resetGame();
        return;
      }

      let winner: TouchPoint | null = null;
      let teams: { A: TouchPoint[], B: TouchPoint[] } | null = null;
      
      if (isTeamMode) {
        playTeamSplitSound();
        const shuffled = [...currentTouches].sort(() => 0.5 - Math.random());
        const mid = Math.ceil(shuffled.length / 2);
        teams = { A: shuffled.slice(0, mid), B: shuffled.slice(mid) };
      } else {
        playWinnerSound();
        winner = currentTouches[Math.floor(Math.random() * currentTouches.length)];
      }

      setTouches(current => {
        const newTouches = new Map(current);
        newTouches.forEach((touch, id) => {
            const isWinner = !isTeamMode && touch.id === winner?.id;
            const team = isTeamMode ? (teams?.A.some(t => t.id === id) ? 'A' : 'B') : null;
            const isLoser = !isTeamMode && !isWinner;

            if (isLoser) playLoserSound();
            
            const targetX = isTeamMode ? (team === 'A' ? window.innerWidth * 0.25 : window.innerWidth * 0.75) : winner!.x;
            const targetY = isTeamMode ? window.innerHeight * 0.5 : winner!.y;

            const updatedParticles = touch.particles.map(p => {
                if (isLoser) {
                    return {...p, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, life: 1 };
                }
                const angle = Math.atan2(targetY - p.y, targetX - p.x);
                const speed = 15 + Math.random() * 10;
                return {...p, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1 };
            });
            
            newTouches.set(id, { ...touch, isWinner, isLoser, team, particles: updatedParticles, hue: isWinner ? 120 : (isLoser ? 0 : touch.hue) });
        });
        return newTouches;
      });

      setTimeout(resetGame, 5000);
    }
  }, [gameState, isTeamMode, touches, playWinnerSound, playTeamSplitSound, playLoserSound, resetGame]);

  const getWinnerText = () => {
    if (isTeamMode) return "TEAMS";
    return "WINNER";
  }

  return (
    <div className="relative h-full w-full bg-black">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute top-4 right-4 flex items-center space-x-3 z-10">
        <Label htmlFor="team-mode" className="text-primary font-headline" style={{ textShadow: '0 0 8px hsl(var(--primary))' }}>
          Split into 2 Teams
        </Label>
        <Switch id="team-mode" checked={isTeamMode} onCheckedChange={setIsTeamMode} disabled={gameState !== 'IDLE' && gameState !== 'WAITING'} />
      </div>

      {showInactivePrompt && (
        <div className="animate-pulse absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-4xl md:text-5xl font-headline text-primary" style={{ textShadow: '0 0 12px hsl(var(--primary))' }}>
            {isTouchDevice ? "Tag your finger" : "Click to add a player"}
          </h1>
        </div>
      )}

      {gameState === 'COUNTDOWN' && countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-9xl font-bold font-headline text-primary" style={{ textShadow: '0 0 20px hsl(var(--primary))' }}>
            {countdown}
          </h1>
        </div>
      )}

      {gameState === 'RESULT' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <h1 className="text-7xl md:text-9xl font-bold font-headline text-primary animate-pulse" style={{ textShadow: '0 0 25px hsl(var(--primary))' }}>
                {getWinnerText()}!
            </h1>
            <p className="text-xl md:text-2xl mt-4 font-headline text-primary/80 animate-pulse">Click to reset</p>
        </div>
      )}
    </div>
  );
}
