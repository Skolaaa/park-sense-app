import React, { useState } from 'react';
import { Flag } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

// The feedback path. Two taps and an optional sentence; the report carries
// the sign text and the verdict so nobody has to describe the sign.
const WrongReadingForm = ({ onSubmit }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  if (sent) {
    return <p className="px-1 text-center text-sm text-muted-foreground">Thanks. Reports like this are how the reader improves.</p>;
  }

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Flag className="h-4 w-4" aria-hidden="true" />
        Report a wrong reading
      </Button>
    );
  }

  return (
    <Card>
      <CardContent className="grid gap-3 p-4">
        <label htmlFor="wrong-reading" className="text-sm font-semibold">What did the sign actually say?</label>
        <textarea
          id="wrong-reading"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="e.g. It is 1P, not 2P, and the arrow points left"
          className="w-full rounded-xl border border-border bg-background p-3 text-[15px] leading-snug"
        />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button size="sm" disabled={text.trim().length < 3} onClick={() => { onSubmit(text.trim()); setSent(true); }}>
            Send report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WrongReadingForm;
