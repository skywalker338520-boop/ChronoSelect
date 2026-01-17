"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import type { TouchPoint, Particle } from '@/lib/types';
import { useSound } from '@/hooks/use-sound';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const MAX_TOUCHES = 10;
const PARTICLE_COUNT = 12;
const INACTIVITY_TIMEOUT = 10000;
const COUNTDOWN_SECONDS = 3;
const PRE_COUNTDOWN_DELAY = 2000; // Delay before countdown starts
const TRAIL_LENGTH = 80;

const createParticle = (touchX: number, touchY: number): Particle => {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * 40 + 20;
  return {
    x: touchX,
    y: touchY,
    radius: radius,
    angle: angle,
    speed: (Math.random() * 0.00221 + 0.001105) * 1.6,
    size: 1,
    color: 'white',
    history: [],
    opacity: 1,
  };
};

export default function ChronoSelect() {
  const [touches, setTouches] = useState<Map<number, TouchPoint>>(new Map());
  const [gameState, setGameState] = useState<'IDLE' | 'WAITING' | 'COUNTDOWN' | 'RESULT'>('IDLE');
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_SECONDS);
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [showInactivePrompt, setShowInactivePrompt] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState<boolean | undefined>(undefined);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const inactiveTimerId = useRef<NodeJS.Timeout>();
  const countdownIntervalId = useRef<NodeJS.Timeout>();
  const preCountdownTimerId = useRef<NodeJS.Timeout>();
  const touchIdCounter = useRef(0);

  const { playTick, playWinnerSound, playTeamSplitSound, playLoserSound } = useSound();

  const resetGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    setTouches(new Map());
    setGameState('IDLE');
    setShowInactivePrompt(false);
    touchIdCounter.current = 0;
    if (countdownIntervalId.current) clearInterval(countdownIntervalId.current);
    if (inactiveTimerId.current) clearTimeout(inactiveTimerId.current);
    if (preCountdownTimerId.current) clearTimeout(preCountdownTimerId.current);
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    setTouches(currentTouches => {
      const newTouches = new Map(currentTouches);

      newTouches.forEach((touch, id) => {
        const updatedParticles: Particle[] = [];
        
        if (gameState !== 'RESULT' || !touch.isLoser) {
            ctx.beginPath();
            ctx.arc(touch.x, touch.y, 15, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(10, 10, 10, 0.8)';
            ctx.fill();
        }

        touch.particles.forEach(p => {
          let particle = { ...p, history: [...p.history] };

          particle.history.push({ x: particle.x, y: particle.y });
          if (particle.history.length > TRAIL_LENGTH) {
            particle.history.shift();
          }

          let speedMultiplier = 1;
          if (gameState === 'COUNTDOWN') {
            speedMultiplier = 1 + (COUNTDOWN_SECONDS - countdown) * 0.5;
          }
          
          if (gameState === 'RESULT' && !isTeamMode) {
              if (touch.isWinner) {
                particle.speed += 0.0002;
                particle.angle += particle.speed;
                particle.x = touch.x + Math.cos(particle.angle) * particle.radius;
                particle.y = touch.y + Math.sin(particle.angle) * particle.radius;
              } else if (touch.isLoser) {
                particle.speed *= 0.97;
                particle.opacity = Math.max(0, particle.opacity - 0.007);
                
                particle.angle += particle.speed;
                particle.x = touch.x + Math.cos(particle.angle) * particle.radius;
                particle.y = touch.y + Math.sin(particle.angle) * particle.radius;
              }
          } else { 
            particle.angle += particle.speed * speedMultiplier;
            particle.x = touch.x + Math.cos(particle.angle) * particle.radius;
            particle.y = touch.y + Math.sin(particle.angle) * particle.radius;
          }

          if (particle.opacity > 0) {
              ctx.lineCap = 'round';
              ctx.lineJoin = 'round';
              ctx.strokeStyle = `hsla(${touch.hue}, 100%, 75%, ${particle.opacity})`;
              ctx.lineWidth = particle.size * 2;
              ctx.beginPath();
              if (particle.history.length > 1) {
                  ctx.moveTo(particle.history[0].x, particle.history[0].y);
                  for (let i = 1; i < particle.history.length; i++) {
                      ctx.lineTo(particle.history[i].x, particle.history[i].y);
                  }
                  ctx.lineTo(particle.x, particle.y); 
              }
              ctx.stroke();
          }
          
          if (!(gameState === 'RESULT' && touch.isLoser && particle.opacity <= 0)) {
            updatedParticles.push(particle);
          }
        });
        
        newTouches.set(id, { ...touch, particles: updatedParticles });
      });

      return newTouches;
    });

    animationFrameId.current = requestAnimationFrame(animate);
  }, [gameState, isTeamMode, countdown]);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    e.preventDefault();
    if (gameState === 'RESULT') {
        resetGame();
        return;
    }
    
    clearTimeout(inactiveTimerId.current);
    setShowInactivePrompt(false);

    setTouches(currentTouches => {
      const newTouches = new Map(currentTouches);
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
      if (newTouches.size > 0) setGameState('WAITING');
      return newTouches;
    });
  }, [gameState, resetGame]);

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
      if (newTouches.size === 0) setGameState('IDLE');
      return newTouches;
    });
  }, [gameState]);
  
  const handleMouseDown = useCallback((e: MouseEvent) => {
    e.preventDefault();
    if (e.button !== 0) return; 

    if (gameState === 'RESULT') {
      resetGame();
      return;
    }

    clearTimeout(inactiveTimerId.current);
    setShowInactivePrompt(false);

    setTouches(currentTouches => {
      if (currentTouches.size >= MAX_TOUCHES) return currentTouches;

      const newTouches = new Map(currentTouches);
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
      
      if (newTouches.size > 0) setGameState('WAITING');
      return newTouches;
    });
  }, [gameState, resetGame]);

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    if(touches.size > 0) resetGame();
  }, [resetGame, touches.size]);

  useEffect(() => {
    if (isTouchDevice === undefined) {
      const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(isTouch);
    }
  }, [isTouchDevice]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || isTouchDevice === undefined) return;

    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let usingTouch = false;
    const touchStartHandler = (e: TouchEvent) => {
      usingTouch = true;
      handleTouchStart(e);
    }
    const mouseDownHandler = (e: MouseEvent) => {
      if(usingTouch) return;
      handleMouseDown(e);
    }
    const contextMenuHandler = (e: MouseEvent) => {
        if(usingTouch) return;
        handleContextMenu(e);
    }

    if (isTouchDevice) {
        window.addEventListener('touchstart', touchStartHandler, { passive: false });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd, { passive: false });
        window.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    }
    
    window.addEventListener('mousedown', mouseDownHandler);
    window.addEventListener('contextmenu', contextMenuHandler);

    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (isTouchDevice) {
        window.removeEventListener('touchstart', touchStartHandler);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
        window.removeEventListener('touchcancel', handleTouchEnd);
      }
      window.removeEventListener('mousedown', mouseDownHandler);
      window.removeEventListener('contextmenu', contextMenuHandler);
      
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isTouchDevice, handleTouchStart, handleTouchMove, handleTouchEnd, animate, handleMouseDown, handleContextMenu]);

  const touchCount = touches.size;
  useEffect(() => {
    if (preCountdownTimerId.current) clearTimeout(preCountdownTimerId.current);
    if (touchCount >= 2 && gameState === 'WAITING') {
      preCountdownTimerId.current = setTimeout(() => {
        if (touches.size >= 2) { 
            setGameState('COUNTDOWN');
        }
      }, PRE_COUNTDOWN_DELAY);
    }
    
    return () => {
      if (preCountdownTimerId.current) clearTimeout(preCountdownTimerId.current)
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touchCount, gameState]);

  useEffect(() => {
    clearTimeout(inactiveTimerId.current);
    if (gameState === 'IDLE' && touches.size === 0) {
      inactiveTimerId.current = setTimeout(() => setShowInactivePrompt(true), INACTIVITY_TIMEOUT);
    } else {
      setShowInactivePrompt(false);
    }
    return () => clearTimeout(inactiveTimerId.current);
  }, [gameState, touches.size]);

  useEffect(() => {
    if (countdownIntervalId.current) {
        clearInterval(countdownIntervalId.current);
    }

    if (gameState === 'COUNTDOWN') {
      setCountdown(COUNTDOWN_SECONDS);
      playTick(1);

      const intervalId = setInterval(() => {
        setCountdown(prevCountdown => {
          const newCount = prevCountdown - 1;
          if (newCount > 0) {
            playTick(1);
            return newCount;
          } else {
            clearInterval(intervalId);
            setGameState('RESULT');
            return 0;
          }
        });
      }, 1000);
      countdownIntervalId.current = intervalId;
    }

    return () => {
      if (countdownIntervalId.current) {
        clearInterval(countdownIntervalId.current);
      }
    };
  }, [gameState, playTick]);

  useEffect(() => {
    if (gameState === 'RESULT' && !Array.from(touches.values()).some(t => t.isWinner || t.isLoser || t.team)) {
      let winner: TouchPoint | null = null;
      let teams: { A: TouchPoint[], B: TouchPoint[] } | null = null;
      
      const currentTouches = Array.from(touches.values());
      if (currentTouches.length === 0) {
        resetGame();
        return;
      }
      
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
            
            if (isTeamMode) {
                newTouches.set(id, { ...touch, isWinner, isLoser, team });
            } else { 
                if(isWinner) {
                    newTouches.set(id, { ...touch, isWinner: true, isLoser: false, team: null, hue: 120 });
                } else if (isLoser) {
                    playLoserSound();
                    newTouches.set(id, { ...touch, isWinner: false, isLoser: true, team: null, hue: 0 });
                }
            }
        });
        return newTouches;
      });

      const resetTimeout = setTimeout(resetGame, 10000);
      return () => clearTimeout(resetTimeout);
    }
  }, [gameState, touches, isTeamMode, playWinnerSound, playTeamSplitSound, playLoserSound, resetGame]);

  useEffect(() => {
    if (gameState === 'IDLE' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [gameState]);

  return (
    <div className="relative h-full w-full bg-black">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute top-4 right-4 flex items-center space-x-3 z-10">
        <Label htmlFor="team-mode" className="text-primary font-headline">
          Split into 2 Teams
        </Label>
        <Switch id="team-mode" checked={isTeamMode} onCheckedChange={setIsTeamMode} disabled={gameState !== 'IDLE' && gameState !== 'WAITING'} />
      </div>

      {showInactivePrompt && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-4xl md:text-5xl font-headline text-primary">
            {isTouchDevice ? "Tag your finger" : "Click to add a player"}
          </h1>
        </div>
      )}
    </div>
  );
}
