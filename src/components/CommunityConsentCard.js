import React from 'react';
import { Users } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';

// Asked once, on the home screen, after the first result exists so the user
// knows what a "scan" is. Either answer dismisses it; the setting stays
// reachable from the footer.
const CommunityConsentCard = ({ onDecide, onShowPrivacy }) => (
  <Card>
    <CardContent className="grid gap-3 p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
          <Users className="h-4 w-4" aria-hidden="true" />
        </span>
        <p className="text-sm font-semibold">Help map Sydney parking?</p>
      </div>
      <p className="text-sm leading-relaxed text-muted-foreground">
        Share when and where you scan and park, rounded to the street. Combined with other drivers it shows
        what parking is like on a street before you get there. No photo, no exact location, no account.{' '}
        <button type="button" onClick={onShowPrivacy} className="font-medium text-foreground underline underline-offset-2">
          How it works
        </button>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={() => onDecide('declined')}>Not now</Button>
        <Button size="sm" onClick={() => onDecide('granted')}>Share anonymously</Button>
      </div>
    </CardContent>
  </Card>
);

export default CommunityConsentCard;
