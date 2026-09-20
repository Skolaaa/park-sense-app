import React from 'react';
import { ClipboardCheck } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

const when = (ms) =>
  new Date(ms).toLocaleString('en-AU', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Australia/Sydney' });

// One question after a parking session ends. The answer is the only ground
// truth this product can collect about whether its readings are right.
const OutcomePrompt = ({ session, onAnswer }) => (
  <Card>
    <CardContent className="grid gap-3 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Did that park go alright?</p>
          <p className="truncate text-xs text-muted-foreground">
            Timer from {when(session.startedAt)}{session.rawText ? ` · “${session.rawText}”` : ''}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" onClick={() => onAnswer('no_ticket')}>No fine</Button>
        <Button variant="outline" size="sm" onClick={() => onAnswer('ticket')}>Got a fine</Button>
        <Button variant="ghost" size="sm" onClick={() => onAnswer('unsure')}>Not sure</Button>
      </div>
    </CardContent>
  </Card>
);

export default OutcomePrompt;
