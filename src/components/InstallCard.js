import React, { useEffect, useState } from 'react';
import { Download, Share } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { InstallService } from '../services/installService';

// Offers "add to home screen" where the browser can prompt, and explains it
// where it cannot (iOS). Hidden once installed or dismissed.
const InstallCard = ({ onDismiss, always = false }) => {
  const [state, setState] = useState(() => InstallService.state());
  useEffect(() => InstallService.subscribe(setState), []);

  if (state === 'installed') {
    return always ? <p className="text-sm text-muted-foreground">ParkSense is installed on this device.</p> : null;
  }
  if (state === 'unavailable' && !always) return null;

  return (
    <Card>
      <CardContent className="grid gap-3 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <Download className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold">Put ParkSense on your home screen</p>
        </div>
        {state === 'ios' ? (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Tap <Share className="inline h-3.5 w-3.5 align-[-2px]" aria-label="Share" /> Share in Safari, then <strong className="text-foreground">Add to Home Screen</strong>. It opens full screen, no browser bar, and reminders work when you close it.
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Opens full screen like an app, works offline, and parking reminders arrive even when it's closed.
          </p>
        )}
        <div className={`grid gap-2 ${onDismiss ? 'grid-cols-2' : ''}`}>
          {onDismiss && <Button variant="outline" size="sm" onClick={onDismiss}>Not now</Button>}
          {state === 'promptable' && (
            <Button size="sm" onClick={async () => { const r = await InstallService.prompt(); if (r === 'dismissed') onDismiss?.(); }}>
              Install
            </Button>
          )}
          {state === 'unavailable' && <p className="self-center text-xs text-muted-foreground">Use your browser's menu and choose "Install app" or "Add to Home Screen".</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default InstallCard;
