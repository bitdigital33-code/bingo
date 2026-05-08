import { useEffect, useEffectEvent, useRef } from 'react';
import type { AnnouncementCue } from '@bingo/contracts';

export function useSpeechAnnouncer(cues: AnnouncementCue[], enabled: boolean) {
  const seen = useRef<string | undefined>(undefined);

  const speak = useEffectEvent((text: string) => {
    const synth = window.speechSynthesis;
    if (!synth) {
      return;
    }

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.03;
    synth.speak(utterance);
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const cue = cues[0];
    if (!cue || cue.id === seen.current) {
      return;
    }

    seen.current = cue.id;
    speak(cue.speechText);
  }, [cues, enabled, speak]);
}
