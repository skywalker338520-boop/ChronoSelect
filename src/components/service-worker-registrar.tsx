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
            // You can add logic here to notify the user
            // that the app is ready for offline use.
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
