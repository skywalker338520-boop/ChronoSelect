"use client";

import { useEffect, useRef } from 'react';
import * as Tone from 'tone';

export function useSound() {
  const isInitialized = useRef(false);
  const synths = useRef<{
    tick: Tone.Synth,
    ding: Tone.Synth,
    whoosh: Tone.NoiseSynth,
  } | null>(null);

  useEffect(() => {
    const initAudio = async () => {
      if (isInitialized.current || Tone.context.state === 'running') return;
      
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
        };
        
        isInitialized.current = true;
      } catch (e) {
        console.error("Could not start audio context", e);
      }
    };

    window.addEventListener('touchstart', initAudio, { once: true });
    window.addEventListener('mousedown', initAudio, { once: true });

    return () => {
      window.removeEventListener('touchstart', initAudio);
      window.removeEventListener('mousedown', initAudio);
      if(synths.current) {
        synths.current.tick.dispose();
        synths.current.ding.dispose();
        synths.current.whoosh.dispose();
      }
    };
  }, []);

  const playTick = (rate: number) => {
    if (!synths.current) return;
    const freq = rate > 1.5 ? 'C5' : 'C4';
    synths.current.tick.triggerAttackRelease(freq, '8n', Tone.now());
  };

  const playWinnerSound = () => {
    if (!synths.current) return;
    const now = Tone.now();
    synths.current.whoosh.triggerAttackRelease('0.5n', now);
    synths.current.ding.triggerAttackRelease('C6', '0.5n', now + 0.2);
  };

  const playTeamSplitSound = () => {
    if (!synths.current) return;
    const now = Tone.now();
    synths.current.whoosh.triggerAttackRelease('0.3n', now);
    synths.current.ding.triggerAttackRelease('G4', '0.2n', now + 0.1);
    synths.current.ding.triggerAttackRelease('C5', '0.2n', now + 0.3);
  };
  
  const playLoserSound = () => {
    if (!synths.current) return;
    const now = Tone.now();
    const synth = new Tone.NoiseSynth({
      noise: { type: 'pink' },
      envelope: { attack: 0.1, decay: 0.5, sustain: 0, release: 0.4 },
    }).toDestination();
    synth.triggerAttackRelease('0.6n', now);
    setTimeout(() => synth.dispose(), 1000);
  };

  return { playTick, playWinnerSound, playTeamSplitSound, playLoserSound };
}
