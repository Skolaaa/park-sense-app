import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { EarlyAccessService } from '../services/earlyAccessService';

// The grandfather offer. Shown once on the home screen after the community
// question has been answered, and always available from Settings.
const EarlyAccessCard = ({ compact = false, onDone, source = 'home' }) => {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | done | error

  const submit = async (e) => {
    e.preventDefault();
    setState('sending');
    const res = await EarlyAccessService.join(email, source);
    if (res.ok) {
      setState('done');
      onDone?.('joined');
    } else {
      setState(res.reason === 'invalid_email' ? 'invalid' : 'error');
    }
  };

  if (state === 'done') {
    return (
      <Card>
        <CardContent className="p-5 text-sm leading-relaxed text-muted-foreground">
          You're in. Everything ParkSense adds later stays free on this device.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="grid gap-3 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="text-sm font-semibold">{compact ? 'Early access' : 'Free forever for early users'}</p>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Reminders, history and everything we add next will be paid one day. Leave an email now and it stays free for you.
        </p>
        <form onSubmit={submit} className="grid gap-2">
          <label htmlFor={`early-access-${source}`} className="sr-only">Email</label>
          <input
            id={`early-access-${source}`}
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => { setEmail(e.target.value); if (state !== 'idle') setState('idle'); }}
            placeholder="you@example.com"
            className="h-12 w-full rounded-xl border border-border bg-background px-4 text-[15px]"
          />
          {state === 'invalid' && <p className="text-xs text-destructive">That doesn't look like an email address.</p>}
          {state === 'error' && <p className="text-xs text-destructive">Couldn't save that just now. Try again in a moment.</p>}
          <div className={compact ? 'grid' : 'grid grid-cols-2 gap-2'}>
            {!compact && (
              <Button type="button" variant="outline" size="sm" onClick={() => { EarlyAccessService.set('dismissed'); onDone?.('dismissed'); }}>
                Not now
              </Button>
            )}
            <Button type="submit" size="sm" disabled={state === 'sending' || !email}>
              {state === 'sending' ? 'Saving…' : 'Keep it free'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EarlyAccessCard;
