
"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import type { Player } from '@/lib/types';
import { useSound } from '@/hooks/use-sound';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const MAX_TOUCHES = 10;
const INACTIVITY_TIMEOUT = 10000;
const COUNTDOWN_SECONDS = 3;
const PRE_COUNTDOWN_DELAY = 2000; // Delay before countdown starts
const RACE_START_DELAY = 3000; // Time to wait for new players
const RACE_READY_DELAY = 2000; // Time before race starts
const PLAYER_CREATION_DELAY = 200; // Minimal contact time to create a player in race mode

const BASE_CIRCLE_SIZE = 130.345;
const ROULETTE_CHAMBERS = 6;

type GameState = 'IDLE' | 'WAITING' | 'COUNTDOWN' | 'RESULT' | 'RACE_WAITING' | 'RACE_READY' | 'RACING' | 'RACE_FINISH' | 'ROULETTE_SPINNING' | 'ROULETTE_TRIGGERING' | 'ROULETTE_GAMEOVER';
type GameMode = 'chooser' | 'teamSplit' | 'race' | 'russianRoulette';

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

// Fisher-Yates (aka Knuth) Shuffle. A robust way to ensure randomness.
const shuffleArray = <T>(array: T[]): T[] => {
    const newArray = [...array];
    let currentIndex = newArray.length, randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex !== 0) {
        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [newArray[currentIndex], newArray[randomIndex]] = [
            newArray[randomIndex], newArray[currentIndex]
        ];
    }

    return newArray;
}


export default function ChronoSelect() {
  const [players, setPlayers] = useState<Map<number, Player>>(new Map());
  const [gameState, setGameState] = useState<GameState>('IDLE');
  const [countdown, setCountdown] = useState<number>(COUNTDOWN_SECONDS);
  const [gameMode, setGameMode] = useState<GameMode>('chooser');
  const [showInactivePrompt, setShowInactivePrompt] = useState(false);
  const revolverAngle = useRef(0);
  const [interactionLocked, setInteractionLocked] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>();
  const inactiveTimerId = useRef<NodeJS.Timeout>();
  const countdownIntervalId = useRef<NodeJS.Timeout>();
  const preCountdownTimerId = useRef<NodeJS.Timeout>();
  const raceStartTimerId = useRef<NodeJS.Timeout>();
  const raceReadyTimerId = useRef<NodeJS.Timeout>();
  const playerCreationTimers = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const rouletteTimers = useRef<NodeJS.Timeout[]>([]);

  const isMouseDown = useRef(false);
  const MOUSE_IDENTIFIER = -1;
  const nextPlayerId = useRef(0);
  const gameOverPlayerId = useRef<number | null>(null);

  const { playTick, playWinnerSound, playTeamSplitSound, playLoserSound, playClickSound, playGunshotSound } = useSound();

  const setupRoulette = useCallback(() => {
    const newChambers = new Map<number, Player>();
    const bulletIndex = Math.floor(Math.random() * ROULETTE_CHAMBERS);
    const angleIncrement = (2 * Math.PI) / ROULETTE_CHAMBERS;

    for (let i = 0; i < ROULETTE_CHAMBERS; i++) {
        const id = i;
        const angle = i * angleIncrement;
        newChambers.set(id, {
            id, x: 0, y: 0,
            isWinner: false, isLoser: false, team: null,
            hue: 0, saturation: 0, opacity: 1,
            size: BASE_CIRCLE_SIZE * 0.8,
            baseSize: BASE_CIRCLE_SIZE * 0.8,
            animationPhase: Math.random() * Math.PI * 2,
            vy: 0, rank: null, raceDirection: 'up',
            isBullet: i === bulletIndex,
            angle: angle,
        });
    }
    setPlayers(newChambers);
    revolverAngle.current = 0;
    setGameState('ROULETTE_SPINNING');
  }, []);

  const resetGame = useCallback(() => {
    setPlayers(new Map());
    setGameState('IDLE');
    setShowInactivePrompt(false);
    setInteractionLocked(false);
    gameOverPlayerId.current = null;
    if (countdownIntervalId.current) clearInterval(countdownIntervalId.current);
    if (inactiveTimerId.current) clearTimeout(inactiveTimerId.current);
    if (preCountdownTimerId.current) clearTimeout(preCountdownTimerId.current);
    if (raceStartTimerId.current) clearTimeout(raceStartTimerId.current);
    if (raceReadyTimerId.current) clearTimeout(raceReadyTimerId.current);
    playerCreationTimers.current.forEach(timer => clearTimeout(timer));
    playerCreationTimers.current.clear();
    rouletteTimers.current.forEach(timer => clearTimeout(timer));
    rouletteTimers.current = [];
    nextPlayerId.current = 0;
    
    if (gameMode === 'russianRoulette') {
        setupRoulette();
    }
  }, [gameMode, setupRoulette]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (gameMode === 'russianRoulette' && canvas) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) * 0.4;

        if (gameState === 'ROULETTE_SPINNING') {
            const remainingCount = players.size;
            const speedMultiplier = (7 - remainingCount) * 0.5;
            revolverAngle.current = (revolverAngle.current + 0.005 * speedMultiplier) % (Math.PI * 2);
        }
        
        setPlayers(currentPlayers => {
            const newPlayers = new Map(currentPlayers);
            newPlayers.forEach((p, id) => {
                let updatedPlayer = {...p};
                if (gameState === 'ROULETTE_GAMEOVER' && p.id === gameOverPlayerId.current) {
                    updatedPlayer.size *= 1.2;
                } else if(p.angle !== undefined) {
                    const currentAngle = p.angle + revolverAngle.current;
                    updatedPlayer.x = centerX + Math.cos(currentAngle) * radius;
                    updatedPlayer.y = centerY + Math.sin(currentAngle) * radius;
                }
                newPlayers.set(id, updatedPlayer);
            });
            return newPlayers;
        });

    } else { // Other game modes
        setPlayers(currentPlayers => {
            let finishedRacerCount = 0;
            const playerArray = Array.from(currentPlayers.values());
            playerArray.forEach(p => { if (p.rank !== null) finishedRacerCount++; });

            const newPlayers = new Map(currentPlayers);
            let racingCount = 0;
            const finishersThisFrame: Player[] = [];

            newPlayers.forEach((player, id) => {
                let updatedPlayer = { ...player };

                if (gameState === 'RESULT' && player.isWinner) {
                    updatedPlayer.size *= 1.0765;
                } else if (gameState === 'RESULT' && player.isLoser) {
                    updatedPlayer.size *= 0.9;
                    updatedPlayer.opacity = Math.max(0, player.opacity - 0.05);
                } else if (gameState === 'RACING' && updatedPlayer.rank === null) {
                    racingCount++;
                    if (Math.random() < 0.05) {
                        const speedBoost = (Math.random() - 0.45) * 5; // Increased fluctuation
                        updatedPlayer.vy += speedBoost;
                    }
                    updatedPlayer.vy = Math.max(0.1, Math.min(updatedPlayer.vy, 8)); // Increased max speed

                    if (updatedPlayer.raceDirection === 'up') {
                        updatedPlayer.y -= updatedPlayer.vy;
                        if (updatedPlayer.y <= updatedPlayer.size / 2) {
                            updatedPlayer.y = updatedPlayer.size / 2;
                            updatedPlayer.raceDirection = 'down';
                        }
                    } else {
                        updatedPlayer.y += updatedPlayer.vy;
                        if (canvas && updatedPlayer.y >= canvas.height - (updatedPlayer.size / 2)) {
                            updatedPlayer.y = canvas.height - (updatedPlayer.size / 2);
                            updatedPlayer.vy = 0;
                            finishersThisFrame.push(updatedPlayer);
                        }
                    }
                } else {
                    const speedMultiplier = gameState === 'COUNTDOWN' ? 3 : 1;
                    updatedPlayer.animationPhase += 0.02 * speedMultiplier;
                    const breathAmount = Math.sin(updatedPlayer.animationPhase) * (updatedPlayer.baseSize * 0.1);
                    updatedPlayer.size = updatedPlayer.baseSize + breathAmount;
                }
                newPlayers.set(id, updatedPlayer);
            });

            if (finishersThisFrame.length > 0) {
                finishersThisFrame.sort((a, b) => b.y - a.y);
                let rankToAssign = finishedRacerCount + 1;
                for (const finisher of finishersThisFrame) {
                    const playerToUpdate = newPlayers.get(finisher.id);
                    if (playerToUpdate && playerToUpdate.rank === null) {
                        playerToUpdate.rank = rankToAssign++;
                        newPlayers.set(finisher.id, playerToUpdate);
                    }
                }
                playTick(2);
                if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(50);
                finishedRacerCount += finishersThisFrame.length;
            }
            if (gameState === 'RACING' && racingCount > 0 && newPlayers.size > 0 && finishedRacerCount === newPlayers.size) {
                setTimeout(() => setGameState('RACE_FINISH'), 500);
            }
            return newPlayers;
        });
    }

    animationFrameId.current = requestAnimationFrame(animate);
  }, [gameState, gameMode, playTick, players.size]);

  // Drawing useEffect
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'ROULETTE_GAMEOVER') {
        const explosionPlayer = players.get(gameOverPlayerId.current!);
        if (explosionPlayer) {
            ctx.save();
            ctx.fillStyle = '#CC0000';
            ctx.beginPath();
            ctx.arc(explosionPlayer.x, explosionPlayer.y, explosionPlayer.size / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
        return; // Stop drawing anything else
    }

    if (gameMode === 'russianRoulette') {
        const centerX = canvas.width / 2;
        const radius = Math.min(centerX, canvas.height / 2) * 0.4;
        const circleSize = BASE_CIRCLE_SIZE * 0.8;
        const sightY = (canvas.height / 2) - radius - (circleSize / 2) - 10;
        
        ctx.save();
        ctx.fillStyle = 'hsl(0, 100%, 70%)';
        ctx.shadowColor = 'hsl(0, 100%, 70%)';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        const sightSize = 15;
        ctx.moveTo(centerX - sightSize, sightY + sightSize);
        ctx.lineTo(centerX + sightSize, sightY + sightSize);
        ctx.lineTo(centerX, sightY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    players.forEach((player) => {
        ctx.save();
        ctx.globalAlpha = player.opacity;
        
        let color = `hsl(${player.hue}, ${player.saturation}%, 70%)`;
        let shadow = true;
        if (gameMode === 'russianRoulette') {
            color = 'white';
        }

        ctx.fillStyle = color;
        if (shadow) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 30;
        }

        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (player.rank !== null && (gameState === 'RACING' || gameState === 'RACE_FINISH')) {
            ctx.save();
            ctx.fillStyle = 'white';
            const fontStack = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
            ctx.font = `bold ${player.size * 0.6}px ${fontStack}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(player.rank), player.x, player.y);
            ctx.restore();
        }
    });
  }, [players, gameState, gameMode]);
  
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

  const handlePointerDown = useCallback((x: number, y: number, id: number) => {
    if (interactionLocked) return;

    if (gameMode === 'russianRoulette') {
        if (gameState === 'ROULETTE_SPINNING') {
            setGameState('ROULETTE_TRIGGERING');
        } else if (gameState === 'ROULETTE_GAMEOVER') {
            resetGame();
        }
        return;
    }
      
    if (gameState === 'RESULT' || gameState === 'RACE_FINISH') {
        resetGame();
        return;
    }

    if (gameMode === 'race') {
      if (gameState === 'IDLE' || gameState === 'RACE_WAITING') {
          const timer = setTimeout(() => {
              setGameState('RACE_WAITING');
              clearTimeout(raceStartTimerId.current);
              
              const newId = nextPlayerId.current++;
              
              setPlayers(currentPlayers => {
                  if (currentPlayers.size >= MAX_TOUCHES) return currentPlayers;
                  const newPlayers = new Map(currentPlayers);
                  const existingHues = Array.from(newPlayers.values()).map(p => p.hue);
                  
                  newPlayers.set(newId, {
                      id: newId, x, y,
                      isWinner: false, isLoser: false, team: null, 
                      hue: getDistinctHue(existingHues),
                      saturation: 90, opacity: 1,
                      size: BASE_CIRCLE_SIZE, baseSize: BASE_CIRCLE_SIZE,
                      animationPhase: Math.random() * Math.PI * 2,
                      vy: 0, rank: null, raceDirection: 'up',
                  });
                  return newPlayers;
              });

              raceStartTimerId.current = setTimeout(() => {
                setPlayers(current => { if(current.size > 0) { setGameState('RACE_READY') } return current; });
              }, RACE_START_DELAY);
              playerCreationTimers.current.delete(id);
          }, PLAYER_CREATION_DELAY);
          playerCreationTimers.current.set(id, timer);
      }
      return;
    }

    clearTimeout(inactiveTimerId.current);
    setShowInactivePrompt(false);

    setPlayers(currentPlayers => {
        if (currentPlayers.size >= MAX_TOUCHES) return currentPlayers;
        const newPlayers = new Map(currentPlayers);
        const existingHues = Array.from(newPlayers.values()).map(t => t.hue);
        const isChooserMode = gameMode === 'chooser';
        const newHue = isChooserMode ? getDistinctHue(existingHues) : 0;
        const newSaturation = isChooserMode ? 90 : 0;
        newPlayers.set(id, {
            id, x, y,
            isWinner: false, isLoser: false, team: null, 
            hue: newHue, saturation: newSaturation, opacity: 1,
            size: BASE_CIRCLE_SIZE, baseSize: BASE_CIRCLE_SIZE,
            animationPhase: Math.random() * Math.PI * 2,
            vy: 0, rank: null, raceDirection: 'up',
        });
        if (newPlayers.size > 0) setGameState('WAITING');
        return newPlayers;
    });
  }, [gameState, resetGame, gameMode, interactionLocked]);

  const handlePointerMove = useCallback((x: number, y: number, id: number) => {
    if (gameMode === 'race' || gameMode === 'russianRoulette') return;
    setPlayers(currentPlayers => {
      const newPlayers = new Map(currentPlayers);
      const existingPlayer = newPlayers.get(id);
      if (existingPlayer) {
        newPlayers.set(id, { ...existingPlayer, x, y });
      }
      return newPlayers;
    });
  }, [gameMode]);

  const handlePointerUp = useCallback((id: number) => {
    if (playerCreationTimers.current.has(id)) {
      clearTimeout(playerCreationTimers.current.get(id)!);
      playerCreationTimers.current.delete(id);
    }
    if (gameState === 'RESULT' || gameMode === 'race' || gameMode === 'russianRoulette') return;
    setPlayers(currentPlayers => {
      const newPlayers = new Map(currentPlayers);
      newPlayers.delete(id);
      if (newPlayers.size === 0) setGameState('IDLE');
      return newPlayers;
    });
  }, [gameState, gameMode]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    isMouseDown.current = true;
    handlePointerDown(e.clientX, e.clientY, MOUSE_IDENTIFIER);
  };
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => { if (!isMouseDown.current) return; handlePointerMove(e.clientX, e.clientY, MOUSE_IDENTIFIER); };
  const handleMouseUp = () => { if (!isMouseDown.current) return; isMouseDown.current = false; handlePointerUp(MOUSE_IDENTIFIER); };
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => { for (const touch of Array.from(e.changedTouches)) { handlePointerDown(touch.clientX, touch.clientY, touch.identifier); } };
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => { for (const touch of Array.from(e.changedTouches)) { handlePointerMove(touch.clientX, touch.clientY, touch.identifier); } };
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => { for (const touch of Array.from(e.changedTouches)) { handlePointerUp(touch.identifier); } };
  const handleContextMenu = useCallback((e: React.MouseEvent) => { e.preventDefault(); if(players.size > 0) resetGame(); }, [resetGame, players.size]);

  useEffect(() => {
    if (gameMode === 'russianRoulette') {
        setupRoulette();
    } else {
        resetGame();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameMode]);
  
  // Game Logic useEffects
  const playerCount = players.size;
  useEffect(() => {
    if (preCountdownTimerId.current) clearTimeout(preCountdownTimerId.current);
    if (gameMode !== 'race' && gameMode !== 'russianRoulette' && playerCount >= 2 && gameState === 'WAITING') {
      preCountdownTimerId.current = setTimeout(() => {
        if (players.size >= 2) setGameState('COUNTDOWN');
      }, PRE_COUNTDOWN_DELAY);
    }
    return () => { if (preCountdownTimerId.current) clearTimeout(preCountdownTimerId.current) };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerCount, gameState, gameMode]);

  useEffect(() => {
    clearTimeout(inactiveTimerId.current);
    if (gameState === 'IDLE' && players.size === 0 && gameMode !== 'russianRoulette') {
      inactiveTimerId.current = setTimeout(() => setShowInactivePrompt(true), INACTIVITY_TIMEOUT);
    } else {
      setShowInactivePrompt(false);
    }
    return () => clearTimeout(inactiveTimerId.current);
  }, [gameState, players.size, gameMode]);

  useEffect(() => {
    if (countdownIntervalId.current) clearInterval(countdownIntervalId.current);
    if (gameState === 'COUNTDOWN') {
      setCountdown(COUNTDOWN_SECONDS); playTick(1); if (navigator.vibrate) navigator.vibrate(200);
      const intervalId = setInterval(() => {
        setCountdown(prev => {
          const newCount = prev - 1;
          if (newCount > 0) { playTick(1); if (navigator.vibrate) navigator.vibrate(100); return newCount; } 
          else { clearInterval(intervalId); setGameState('RESULT'); return 0; }
        });
      }, 1000);
      countdownIntervalId.current = intervalId;
    }
    return () => { if (countdownIntervalId.current) clearInterval(countdownIntervalId.current); };
  }, [gameState, playTick]);
  
  // Game state logic for Race mode
  useEffect(() => {
    if (gameState === 'RACE_READY') {
      clearTimeout(raceStartTimerId.current); playTeamSplitSound(); if (navigator.vibrate) navigator.vibrate(100);
      if (typeof window !== 'undefined') {
        setPlayers(currentPlayers => {
            const lineupWidth = window.innerWidth * 0.8; const spacing = currentPlayers.size > 1 ? lineupWidth / (currentPlayers.size - 1) : 0;
            const startX = (window.innerWidth - lineupWidth) / 2; const startY = window.innerHeight - (BASE_CIRCLE_SIZE / 2);
            const newPlayers = new Map(currentPlayers);
            Array.from(newPlayers.values()).forEach((p, index) => {
                const playerToUpdate = newPlayers.get(p.id);
                if (playerToUpdate) newPlayers.set(p.id, { ...playerToUpdate, x: startX + (index * spacing), y: startY });
            });
            return newPlayers;
        });
      }
      raceReadyTimerId.current = setTimeout(() => { setGameState('RACING'); }, RACE_READY_DELAY);
    } else if (gameState === 'RACING') {
        clearTimeout(raceReadyTimerId.current); playWinnerSound(); if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        setPlayers(currentPlayers => {
            const newPlayers = new Map(currentPlayers);
            newPlayers.forEach(player => { if(newPlayers.has(player.id)) newPlayers.set(player.id, {...player, vy: (Math.random() * 1) + 0.5 }); });
            return newPlayers;
        });
    } else if (gameState === 'RACE_FINISH') {
        playLoserSound();
        const resetTimeout = setTimeout(resetGame, 10000);
        return () => clearTimeout(resetTimeout);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, playTeamSplitSound, playWinnerSound, playLoserSound, resetGame]);

  useEffect(() => {
    if (gameState === 'RESULT' && gameMode !== 'race' && gameMode !== 'russianRoulette') {
      const shouldRun = !Array.from(players.values()).some(p => p.isWinner || p.isLoser || p.team);
      if (!shouldRun) return;
      const currentPlayers = Array.from(players.values());
      if (currentPlayers.length === 0) { resetGame(); return; }
      
      if (gameMode === 'teamSplit') {
        playTeamSplitSound();
        const shuffled = shuffleArray(currentPlayers); const mid = Math.ceil(shuffled.length / 2);
        const teams = { A: shuffled.slice(0, mid), B: shuffled.slice(mid) };
        const hueA = getDistinctHue([]); const hueB = getDistinctHue([hueA]);
        setPlayers(current => {
          const newPlayers = new Map(current);
          newPlayers.forEach((player, id) => {
            const team = teams.A.some(t => t.id === id) ? 'A' : 'B';
            newPlayers.set(id, { ...player, isWinner: false, isLoser: false, team, hue: team === 'A' ? hueA : hueB, saturation: 90 });
          });
          return newPlayers;
        });
      } else { // Chooser mode
        playWinnerSound(); if (currentPlayers.length > 1) playLoserSound();
        const shuffledPlayers = shuffleArray(currentPlayers); const winner = shuffledPlayers[0];
        setPlayers(current => {
          const newPlayers = new Map(current);
          newPlayers.forEach((player, id) => {
            const isWinner = player.id === winner?.id; const isLoser = !isWinner;
            newPlayers.set(id, { ...player, isWinner, isLoser, team: null });
          });
          return newPlayers;
        });
      }
      const resetTimeout = setTimeout(resetGame, 10000);
      return () => clearTimeout(resetTimeout);
    }
  }, [gameState, players, gameMode, playWinnerSound, playTeamSplitSound, playLoserSound, resetGame]);

  // Russian Roulette Logic
  useEffect(() => {
    rouletteTimers.current.forEach(timer => clearTimeout(timer));
    rouletteTimers.current = [];

    if (gameState === 'ROULETTE_TRIGGERING') {
        setInteractionLocked(true);

        const sightAngle = -Math.PI / 2;
        let closestChamber: Player | null = null;
        let minAngleDiff = Infinity;
        let finalRevolverAngle = revolverAngle.current;

        players.forEach(p => {
            if (p.angle === undefined) return;
            const effectiveAngle = (p.angle + revolverAngle.current) % (Math.PI * 2);
            let diff = sightAngle - effectiveAngle;
            if (diff > Math.PI) diff -= 2 * Math.PI;
            if (diff < -Math.PI) diff += 2 * Math.PI;

            if (Math.abs(diff) < minAngleDiff) {
                minAngleDiff = Math.abs(diff);
                closestChamber = p;
                finalRevolverAngle = revolverAngle.current + diff;
            }
        });
        
        if (!closestChamber) { setInteractionLocked(false); setGameState('ROULETTE_SPINNING'); return; }

        const decelerationTimer = setTimeout(() => {
            revolverAngle.current = finalRevolverAngle;

            const chamberToFire = closestChamber!;
            const triggerOutcomeTimer = setTimeout(() => {
                if (chamberToFire.isBullet) {
                    playGunshotSound(); if (navigator.vibrate) navigator.vibrate(500);
                    gameOverPlayerId.current = chamberToFire.id;
                    setGameState('ROULETTE_GAMEOVER');
                    const unlockTimer = setTimeout(() => setInteractionLocked(false), 2000);
                    rouletteTimers.current.push(unlockTimer);
                } else {
                    playClickSound(); if (navigator.vibrate) navigator.vibrate(50);
                    setPlayers(current => {
                        const newPlayers = new Map(current);
                        newPlayers.delete(chamberToFire.id);
                        if (newPlayers.size === 1 && Array.from(newPlayers.values())[0].isBullet) {
                           // Last one is the bullet, auto-lose
                           setTimeout(() => {
                            playGunshotSound(); if (navigator.vibrate) navigator.vibrate(500);
                            gameOverPlayerId.current = Array.from(newPlayers.values())[0].id;
                            setGameState('ROULETTE_GAMEOVER');
                            const unlockTimer = setTimeout(() => setInteractionLocked(false), 2000);
                            rouletteTimers.current.push(unlockTimer);
                           }, 500);
                        }
                        return newPlayers;
                    });
                    const resumeTimer = setTimeout(() => { setGameState('ROULETTE_SPINNING'); setInteractionLocked(false); }, 300);
                    rouletteTimers.current.push(resumeTimer);
                }
            }, 300);
            rouletteTimers.current.push(triggerOutcomeTimer);
        }, 200);
        rouletteTimers.current.push(decelerationTimer);
    }
    return () => {
      rouletteTimers.current.forEach(timer => clearTimeout(timer));
      rouletteTimers.current = [];
    }
  }, [gameState, players, playGunshotSound, playClickSound, resetGame]);

  return (
    <div 
        className="relative h-full w-full bg-black"
        onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd} onTouchCancel={handleTouchEnd} onContextMenu={handleContextMenu}
    >
        <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
        <div className="absolute top-4 right-4 z-10 pointer-events-auto"
          onMouseDown={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="h-12 w-12 text-primary" />
                <span className="sr-only">Settings</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto mr-4">
               <RadioGroup value={gameMode} 
                  onValueChange={(value) => setGameMode(value as GameMode)}
                  className="gap-4" disabled={players.size > 0 && gameMode !== 'russianRoulette'}>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="chooser" id="chooser-mode" />
                      <Label htmlFor="chooser-mode" className="font-headline">Chooser</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="teamSplit" id="teamsplit-mode" />
                      <Label htmlFor="teamsplit-mode" className="font-headline">Team Split</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="race" id="race-mode" />
                      <Label htmlFor="race-mode" className="font-headline">Race</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                      <RadioGroupItem value="russianRoulette" id="roulette-mode" />
                      <Label htmlFor="roulette-mode" className="font-headline">Russian Roulette</Label>
                  </div>
              </RadioGroup>
            </PopoverContent>
          </Popover>
        </div>

        {showInactivePrompt && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-white text-4xl font-headline animate-pulse">Tap Here to Start</p>
            </div>
        )}

        {gameState === 'RACE_READY' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-white text-4xl font-headline animate-pulse">Ready...</p>
            </div>
        )}

        {gameMode === 'russianRoulette' && gameState === 'ROULETTE_SPINNING' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-white/50 text-2xl font-headline animate-pulse">Tap to Trigger</p>
            </div>
        )}
    </div>
  );
}

    