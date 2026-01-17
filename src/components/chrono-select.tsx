"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import type { TouchPoint } from '@/lib/types';
import { useSound } from '@/hooks/use-sound';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const MAX_TOUCHES = 10;
const INACTIVITY_TIMEOUT = 10000;
const COUNTDOWN_SECONDS = 5;
const PRE_COUNTDOWN_DELAY = 2000; // Delay before countdown starts

const BASE_CIRCLE_SIZE = 150;

const getDistinctHue = (existingHues: number[]): number => {
    const MIN_HUE_DIFFERENCE = 30; // degrees
    let newHue: number;
    let attempts = 0;

    const isTooClose = (hue1: number, hue2: number) => {
        const diff = Math.abs(hue1 - hue2);
        return Math.min(diff, 360 - diff) < MIN_HUE_DIFFERENCE;
    };

    do {
        newHue = Math.random() * 360;
        attempts++;
        if (attempts > 50) { // Failsafe to prevent infinite loop
            break;
        }
    } while (existingHues.some(h => isTooClose(h, newHue)));
    
    return newHue;
}

export default function ChronoSelect() {
  const [touches, setTouches] = useState<Map<number, TouchPoint>>(new Map());
  const [gameState, setGameState] = useState<'IDLE' | 'WAITING' | 'COUNTDOWN' | 'RESULT'>('IDLE');
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_SECONDS);
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [showInactivePrompt, setShowInactivePrompt] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const inactiveTimerId = useRef<NodeJS.Timeout>();
  const countdownIntervalId = useRef<NodeJS.Timeout>();
  const preCountdownTimerId = useRef<NodeJS.Timeout>();
  
  const isMouseDown = useRef(false);
  const MOUSE_IDENTIFIER = -1; // Use a constant identifier for the mouse

  const { playTick, playWinnerSound, playTeamSplitSound, playLoserSound } = useSound();

  // Reset game state
  const resetGame = useCallback(() => {
    setTouches(new Map());
    setGameState('IDLE');
    setShowInactivePrompt(false);
    if (countdownIntervalId.current) clearInterval(countdownIntervalId.current);
    if (inactiveTimerId.current) clearTimeout(inactiveTimerId.current);
    if (preCountdownTimerId.current) clearTimeout(preCountdownTimerId.current);
  }, []);

  // Animation loop for STATE UPDATES
  const animate = useCallback(() => {
    setTouches(currentTouches => {
      if (currentTouches.size === 0) {
        return currentTouches;
      }
      
      const newTouches = new Map();
      currentTouches.forEach((touch, id) => {
        let updatedTouch = { ...touch };

        if (gameState === 'RESULT' && touch.isWinner) {
            // Expand to fill screen, stop breathing.
            updatedTouch.size *= 1.25;
        } else if (gameState === 'RESULT' && touch.isLoser) {
            // Shrink and fade faster.
            updatedTouch.size *= 0.9;
            updatedTouch.opacity = Math.max(0, touch.opacity - 0.05);
        } else {
            // Normal breathing for IDLE, WAITING, COUNTDOWN, and Team modes.
            const speedMultiplier = gameState === 'COUNTDOWN' ? 3 : 1;
            updatedTouch.animationPhase += 0.02 * speedMultiplier;
            const breathAmount = Math.sin(updatedTouch.animationPhase) * (updatedTouch.baseSize * 0.1);
            updatedTouch.size = updatedTouch.baseSize + breathAmount;
        }
        
        if (!(gameState === 'RESULT' && touch.isLoser && updatedTouch.opacity <= 0)) {
           newTouches.set(id, updatedTouch);
        }
      });
      return newTouches;
    });

    animationFrameId.current = requestAnimationFrame(animate);
  }, [gameState]);

  // useEffect for DRAWING
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    touches.forEach((touch) => {
        ctx.save();
        ctx.globalAlpha = touch.opacity;
        
        const color = `hsl(${touch.hue}, 90%, 70%)`;
        ctx.fillStyle = color;
        
        // Glow effect
        if (gameState !== 'RESULT' || touch.isWinner || touch.team) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 30;
        }

        ctx.beginPath();
        ctx.arc(touch.x, touch.y, touch.size / 2, 0, Math.PI * 2);
        ctx.fill();

        if(touch.team) {
            ctx.fillStyle = "white";
            ctx.font = `bold ${touch.size / 3}px "Space Grotesk"`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = "transparent"; // No shadow for text
            ctx.fillText(touch.team, touch.x, touch.y);
        }

        ctx.restore();
    });
  }, [touches, gameState]);
  
  // Resize canvas and start animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [animate]);

  // --- Unified Pointer Event Logic ---
  const handlePointerDown = useCallback((x: number, y: number, id: number) => {
    if (gameState === 'RESULT') {
        resetGame();
        return;
    }

    clearTimeout(inactiveTimerId.current);
    setShowInactivePrompt(false);

    setTouches(currentTouches => {
        if (currentTouches.size >= MAX_TOUCHES) return currentTouches;
        
        const newTouches = new Map(currentTouches);
        const existingHues = Array.from(newTouches.values()).map(t => t.hue);
        const newHue = getDistinctHue(existingHues);
        
        newTouches.set(id, {
            id, x, y,
            isWinner: false, isLoser: false, team: null, hue: newHue,
            opacity: 1,
            size: BASE_CIRCLE_SIZE,
            baseSize: BASE_CIRCLE_SIZE,
            animationPhase: Math.random() * Math.PI * 2, // Start at a random point in the breath cycle
        });

        if (newTouches.size > 0) setGameState('WAITING');
        return newTouches;
    });
  }, [gameState, resetGame]);

  const handlePointerMove = useCallback((x: number, y: number, id: number) => {
    setTouches(currentTouches => {
      const newTouches = new Map(currentTouches);
      const existingTouch = newTouches.get(id);
      if (existingTouch) {
        newTouches.set(id, { ...existingTouch, x, y });
      }
      return newTouches;
    });
  }, []);

  const handlePointerUp = useCallback((id: number) => {
    if (gameState === 'RESULT') return;
    setTouches(currentTouches => {
      const newTouches = new Map(currentTouches);
      newTouches.delete(id);
      if (newTouches.size === 0) setGameState('IDLE');
      return newTouches;
    });
  }, [gameState]);

  // --- React Event Handlers ---
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.button !== 0) return;
    isMouseDown.current = true;
    handlePointerDown(e.clientX, e.clientY, MOUSE_IDENTIFIER);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown.current) return;
    handlePointerMove(e.clientX, e.clientY, MOUSE_IDENTIFIER);
  };
  
  const handleMouseUp = () => {
    if (!isMouseDown.current) return;
    isMouseDown.current = false;
    handlePointerUp(MOUSE_IDENTIFIER);
  };
  
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      handlePointerDown(touch.clientX, touch.clientY, touch.identifier);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      handlePointerMove(touch.clientX, touch.clientY, touch.identifier);
    }
  };
  
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.preventDefault();
    for (const touch of Array.from(e.changedTouches)) {
      handlePointerUp(touch.identifier);
    }
  };

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if(touches.size > 0) resetGame();
  }, [resetGame, touches.size]);


  // --- Game Logic useEffects ---
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
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }

      const intervalId = setInterval(() => {
        setCountdown(prevCountdown => {
          const newCount = prevCountdown - 1;
          if (newCount > 0) {
            playTick(1);
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
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
            
            if (isLoser && !isTeamMode) {
                playLoserSound();
            }
            
            newTouches.set(id, { ...touch, isWinner, isLoser, team });
        });
        return newTouches;
      });

      const resetTimeout = setTimeout(resetGame, 10000);
      return () => clearTimeout(resetTimeout);
    }
  }, [gameState, touches, isTeamMode, playWinnerSound, playTeamSplitSound, playLoserSound, resetGame]);

  return (
    <div 
        className="relative h-full w-full bg-black"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onContextMenu={handleContextMenu}
    >
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
        <div className="absolute top-4 right-4 flex items-center space-x-3 z-10 pointer-events-auto">
            <Label htmlFor="team-mode" className="text-primary font-headline">
                Split into 2 Teams
            </Label>
            <Switch id="team-mode" checked={isTeamMode} onCheckedChange={setIsTeamMode} disabled={gameState !== 'IDLE' && gameState !== 'WAITING'} />
        </div>

        {showInactivePrompt && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <h1 className="text-4xl md:text-5xl font-headline text-primary">
                    Tag Your Finger
                </h1>
            </div>
        )}
    </div>
  );
}
