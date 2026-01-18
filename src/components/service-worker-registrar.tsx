"use client";

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function ServiceWorkerRegistrar() {
  const { toast } = useToast();

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('SW registered: ', registration);
            registration.onupdatefound = () => {
              const installingWorker = registration.installing;
              if (installingWorker) {
                installingWorker.onstatechange = () => {
                  if (installingWorker.state === 'installed') {
                    if (navigator.serviceWorker.controller) {
                      toast({
                        title: 'Update Available',
                        description: 'A new version is ready. Close and reopen the app to apply it.',
                      });
                    }
                  }
                };
              }
            };
          })
          .catch((registrationError) => {
            console.log('SW registration failed: ', registrationError);
            toast({
                title: 'Offline Mode Failed',
                description: 'Could not enable offline capabilities.',
                variant: 'destructive',
            })
          });
      });
    }
  }, [toast]);

  return null;
}
