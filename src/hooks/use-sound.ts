"use client";

import { useEffect, useRef, useCallback } from 'react';
import type * as Tone from 'tone'; // Import types only

type Synths = {
  tick: Tone.Synth,
  ding: Tone.Synth,
  whoosh: Tone.NoiseSynth,
  loser: Tone.NoiseSynth,
};

export function useSound() {
  const ToneRef = useRef<typeof Tone | null>(null);
  const synths = useRef<Synths | null>(null);
  const isInitialized = useRef(false);
  const lastTickTime = useRef(0);

  useEffect(() => {
    const initOnUserAction = async () => {
      // Ensure Tone is loaded
      if (!ToneRef.current) {
        ToneRef.current = await import('tone');
      }
      const Tone = ToneRef.current;

      if (isInitialized.current || Tone.context.state === 'running') {
        return;
      }

      try {
        await Tone.start();
        
        synths.current = {
          tick: new Tone.Synth({
            oscillator: { type: 'sine' },
            envelope: { attack: 0.005, decay: 0.1, sustain: 0, release: 0.1 },
          }).toDestination(),
          ding: new Tone.Synth({
            oscillator: { type: 'triangle' },
            envelope: { attack: 0.005, decay: 0.2, sustain: 0.1, release: 0.5 },
          }).toDestination(),
          whoosh: new Tone.NoiseSynth({
            noise: { type: 'white' },
            envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 },
          }).toDestination(),
          loser: new Tone.NoiseSynth({
            noise: { type: 'pink' },
            envelope: { attack: 0.1, decay: 0.5, sustain: 0, release: 0.4 },
          }).toDestination(),
        };
        
        isInitialized.current = true;
      } catch (e) {
        console.error("Could not start audio context", e);
      }
    };

    // This code runs only in the browser.
    window.addEventListener('touchstart', initOnUserAction, { once: true });
    window.addEventListener('mousedown', initOnUserAction, { once: true });

    return () => {
      window.removeEventListener('touchstart', initOnUserAction);
      window.removeEventListener('mousedown', initOnUserAction);
      if (synths.current) {
        Object.values(synths.current).forEach(synth => synth.dispose());
      }
    };
  }, []);

  const playTick = useCallback((rate: number) => {
    const Tone = ToneRef.current;
    if (!synths.current || !Tone) return;
    
    let scheduledTime = Tone.now();
    if (scheduledTime <= lastTickTime.current) {
        scheduledTime = lastTickTime.current + 0.01;
    }
    lastTickTime.current = scheduledTime;
    
    const freq = rate > 1.5 ? 'C5' : 'C4';
    synths.current.tick.triggerAttackRelease(freq, '8n', scheduledTime);
  }, []);

  const playWinnerSound = useCallback(() => {
    const Tone = ToneRef.current;
    if (!synths.current || !Tone) return;
    const now = Tone.now();
    synths.current.whoosh.triggerAttackRelease('0.5n', now);
    synths.current.ding.triggerAttackRelease('C6', '0.5n', now + 0.2);
  }, []);

  const playTeamSplitSound = useCallback(() => {
    const Tone = ToneRef.current;
    if (!synths.current || !Tone) return;
    const now = Tone.now();
    synths.current.whoosh.triggerAttackRelease('0.3n', now);
    synths.current.ding.triggerAttackRelease('G4', '0.2n', now + 0.1);
    synths.current.ding.triggerAttackRelease('C5', '0.2n', now + 0.3);
  }, []);
  
  const playLoserSound = useCallback(() => {
    const Tone = ToneRef.current;
    if (!synths.current || !Tone) return;
    synths.current.loser.triggerAttackRelease('0.6n', Tone.now());
  }, []);

  return { playTick, playWinnerSound, playTeamSplitSound, playLoserSound };
}
