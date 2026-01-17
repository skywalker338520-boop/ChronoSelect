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

const MAGIC_CIRCLE_URL = 'https://firebasestorage.googleapis.com/v0/b/genkit-llm-tools.appspot.com/o/image-prompt-images%2F1718012076046_magic_circle.png?alt=media&token=143b62b3-5b8c-45a8-9b88-29402969b768';
const CIRCLE_SIZE = 250;
const INITIAL_ROTATION_SPEED = 0.005;

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
  const [isTouchDevice, setIsTouchDevice] = useState<boolean | undefined>(undefined);
  const [magicCircleImg, setMagicCircleImg] = useState<HTMLImageElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const inactiveTimerId = useRef<NodeJS.Timeout>();
  const countdownIntervalId = useRef<NodeJS.Timeout>();
  const preCountdownTimerId = useRef<NodeJS.Timeout>();
  const touchIdCounter = useRef(0);

  const { playTick, playWinnerSound, playTeamSplitSound, playLoserSound } = useSound();

  useEffect(() => {
    const img = new Image();
    img.src = MAGIC_CIRCLE_URL;
    img.onload = () => setMagicCircleImg(img);
  }, []);

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

    if (!magicCircleImg) {
        animationFrameId.current = requestAnimationFrame(animate);
        return;
    }

    setTouches(currentTouches => {
      const newTouches = new Map(currentTouches);

      newTouches.forEach((touch, id) => {
        let updatedTouch = { ...touch };
        
        let speedMultiplier = 1;
        if (gameState === 'COUNTDOWN') {
            speedMultiplier = 1 + (COUNTDOWN_SECONDS - countdown + 1) * 0.4;
        }
        
        if (gameState === 'RESULT') {
            if (touch.isWinner) {
                updatedTouch.rotationSpeed = 0.05;
            } else if (touch.isLoser) {
                updatedTouch.rotationSpeed *= 0.98;
                updatedTouch.opacity = Math.max(0, touch.opacity - 0.015);
            }
        }
        
        updatedTouch.rotation += updatedTouch.rotationSpeed * speedMultiplier;

        ctx.save();
        ctx.translate(updatedTouch.x, updatedTouch.y);
        ctx.rotate(updatedTouch.rotation);
        ctx.globalAlpha = updatedTouch.opacity;
        ctx.filter = `hue-rotate(${touch.hue}deg) brightness(1.2)`;
        ctx.drawImage(magicCircleImg, -touch.size / 2, -touch.size / 2, touch.size, touch.size);
        ctx.restore();
        
        if (gameState === 'RESULT' && touch.isLoser && updatedTouch.opacity <= 0) {
          newTouches.delete(id);
        } else {
          newTouches.set(id, updatedTouch);
        }
      });

      return newTouches;
    });

    animationFrameId.current = requestAnimationFrame(animate);
  }, [magicCircleImg, gameState, countdown]);

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
      const existingHues = Array.from(newTouches.values()).map(t => t.hue);
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (newTouches.size >= MAX_TOUCHES) break;
        
        const newHue = getDistinctHue(existingHues);
        existingHues.push(newHue);

        newTouches.set(touch.identifier, {
          id: touch.identifier,
          x: touch.clientX,
          y: touch.clientY,
          isWinner: false,
          isLoser: false,
          team: null,
          hue: newHue,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: INITIAL_ROTATION_SPEED,
          opacity: 1,
          size: CIRCLE_SIZE,
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
      
      const existingHues = Array.from(newTouches.values()).map(t => t.hue);
      const newHue = getDistinctHue(existingHues);

      newTouches.set(touchId, {
          id: touchId,
          x: e.clientX,
          y: e.clientY,
          isWinner: false,
          isLoser: false,
          team: null,
          hue: newHue,
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: INITIAL_ROTATION_SPEED,
          opacity: 1,
          size: CIRCLE_SIZE,
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
            Tag Your Finger
          </h1>
        </div>
      )}
    </div>
  );
}
