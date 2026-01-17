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
const TRAIL_LENGTH = 35;

const createParticle = (touchX: number, touchY: number): Particle => {
  const angle = Math.random() * Math.PI * 2;
  const radius = Math.random() * 40 + 20;
  return {
    x: touchX,
    y: touchY,
    radius: radius,
    angle: angle,
    speed: (Math.random() * 0.00221 + 0.001105) * 1.3,
    vx: 0,
    vy: 0,
    size: 1,
    color: 'white',
    history: [],
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
  const gameSpeed = useRef(1);
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
    gameSpeed.current = 1;
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
      const winnerTouch = !isTeamMode ? Array.from(newTouches.values()).find(t => t.isWinner) : null;

      newTouches.forEach((touch, id) => {
        const updatedParticles: Particle[] = [];
        
        if (!winnerTouch || touch.isWinner) {
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

          if (gameState === 'RESULT' && winnerTouch) {
              particle.angle += particle.speed;
              particle.x = winnerTouch.x + Math.cos(particle.angle) * particle.radius;
              particle.y = winnerTouch.y + Math.sin(particle.angle) * particle.radius;
          } else if (touch.isWinner || touch.isLoser) {
            particle.x += particle.vx;
            particle.y += particle.vy;
          } else { 
            particle.angle += particle.speed * gameSpeed.current;
            particle.x = touch.x + Math.cos(particle.angle) * particle.radius;
            particle.y = touch.y + Math.sin(particle.angle) * particle.radius;
          }

          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = `hsla(${touch.hue}, 100%, 75%, 1)`;
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

          updatedParticles.push(particle);
        });
        
        newTouches.set(id, { ...touch, particles: updatedParticles });
      });

      return newTouches;
    });

    animationFrameId.current = requestAnimationFrame(animate);
  }, [gameState, isTeamMode]);

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
      gameSpeed.current = 1;

      const intervalId = setInterval(() => {
        setCountdown(prevCountdown => {
          const newCount = prevCountdown - 1;
          if (newCount > 0) {
            gameSpeed.current += 0.5;
            playTick(gameSpeed.current);
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
        const winnerTouchForLosers = !isTeamMode ? Array.from(newTouches.values()).find(t => t.id === winner?.id) : null;

        newTouches.forEach((touch, id) => {
            const isWinner = !isTeamMode && touch.id === winner?.id;
            const team = isTeamMode ? (teams?.A.some(t => t.id === id) ? 'A' : 'B') : null;
            const isLoser = !isTeamMode && !isWinner;
            
            if (isTeamMode) {
                const targetX = (team === 'A' ? window.innerWidth * 0.25 : window.innerWidth * 0.75);
                const targetY = window.innerHeight * 0.5;

                const updatedParticles = touch.particles.map(p => {
                    const angle = Math.atan2(targetY - p.y, targetX - p.x);
                    const speed = 15 + Math.random() * 10;
                    return {...p, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
                });
                newTouches.set(id, { ...touch, isWinner, isLoser, team, particles: updatedParticles });
            } else { 
                if(isWinner) {
                    newTouches.set(id, { ...touch, isWinner: true, isLoser: false, team: null, hue: 120 });
                } else if (isLoser && winnerTouchForLosers) {
                    playLoserSound();
                    const updatedParticles = touch.particles.map(p => {
                        const angle = Math.atan2(winnerTouchForLosers!.y - p.y, winnerTouchForLosers!.x - p.x);
                        const speed = 15 + Math.random() * 10;
                        return {...p, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed };
                    });
                    newTouches.set(id, { ...touch, isWinner: false, isLoser: true, team: null, hue: 0, particles: updatedParticles });
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

  const getWinnerText = () => {
    if (isTeamMode) return "TEAMS";
    return "WINNER";
  }

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

      {gameState === 'COUNTDOWN' && countdown > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <h1 className="text-9xl font-bold font-headline text-primary">
            {countdown}
          </h1>
        </div>
      )}

      {gameState === 'RESULT' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <h1 className="text-7xl md:text-9xl font-bold font-headline text-primary">
                {getWinnerText()}!
            </h1>
            <p className="text-xl md:text-2xl mt-4 font-headline text-primary/80">Click to reset</p>
        </div>
      )}
    </div>
  );
}
