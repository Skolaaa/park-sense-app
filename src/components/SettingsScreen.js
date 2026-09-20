import React, { useEffect, useState } from 'react';
import { Bell, Users, FileText, Shield, Trash2 } from 'lucide-react';
import { Screen, ScreenHeader, ScreenActions } from './Screen';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import InstallCard from './InstallCard';
import EarlyAccessCard from './EarlyAccessCard';
import { APP_CONFIG } from '../utils/constants';
import { PushService } from '../services/pushService';
import { NotificationService } from '../services/notificationService';
import { EarlyAccessService } from '../services/earlyAccessService';

const Section = ({ icon: Icon, title, children }) => (
  <section className="mt-5">
    <h2 className="mb-2 flex items-center gap-2 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {title}
    </h2>
    {children}
  </section>
);

const Row = ({ label, detail, action }) => (
  <div className="flex items-center justify-between gap-4 px-5 py-3.5">
    <div className="min-w-0">
      <p className="text-[15px] font-medium">{label}</p>
      {detail && <p className="mt-0.5 text-sm leading-snug text-muted-foreground">{detail}</p>}
    </div>
    {action}
  </div>
);

const Toggle = ({ on, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    onClick={() => onChange(!on)}
    className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${on ? 'bg-success' : 'bg-muted'}`}
  >
    <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-5' : 'translate-x-0.5'}`} />
  </button>
);

const SettingsScreen = ({ consent, onConsentChange, onOpenLegal, onClearData, onBack }) => {
  const [notifPermission, setNotifPermission] = useState(() => (typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'));
  const [pushAvailable, setPushAvailable] = useState(null);
  const [earlyAccess, setEarlyAccess] = useState(() => EarlyAccessService.status());

  useEffect(() => {
    let cancelled = false;
    PushService.available().then((ok) => { if (!cancelled) setPushAvailable(ok); });
    return () => { cancelled = true; };
  }, []);

  const enableNotifications = async () => {
    const p = await NotificationService.requestPermission();
    setNotifPermission(p);
    if (p === 'granted') await PushService.subscribe();
  };

  const reminderDetail = notifPermission === 'granted'
    ? (pushAvailable ? 'On. Reminders arrive even when the app is closed.' : pushAvailable === false ? 'On while the app is open. Install the app for reminders when it is closed.' : 'On.')
    : notifPermission === 'denied'
      ? 'Blocked in your browser settings. Allow notifications for this site to turn them on.'
      : 'Get a nudge 15 minutes before your parking runs out.';

  return (
    <Screen>
      <ScreenHeader onBack={onBack} title="Settings" />

      <Section icon={Bell} title="Reminders">
        <Card>
          <Row
            label="Parking reminders"
            detail={reminderDetail}
            action={notifPermission === 'granted'
              ? <Badge variant="success">On</Badge>
              : notifPermission === 'denied'
                ? <Badge variant="warning">Blocked</Badge>
                : <Button size="sm" onClick={enableNotifications} disabled={notifPermission === 'unsupported'}>Turn on</Button>}
          />
        </Card>
      </Section>

      <Section icon={Users} title="Community data">
        <Card>
          <Row
            label="Share anonymously"
            detail="When and where you scan and park, rounded to the street. Helps everyone see what parking is like before they arrive."
            action={<Toggle on={consent === 'granted'} onChange={(on) => onConsentChange(on ? 'granted' : 'declined')} label="Share anonymously" />}
          />
        </Card>
      </Section>

      <Section icon={FileText} title="App">
        <div className="grid gap-3">
          <InstallCard always />
          {earlyAccess === 'joined'
            ? <Card><Row label="Early access" detail="You're on the list. Everything ParkSense adds later stays free on this device." /></Card>
            : <EarlyAccessCard compact source="settings" onDone={(v) => setEarlyAccess(v)} />}
        </div>
      </Section>

      <Section icon={Shield} title="About">
        <Card className="divide-y divide-border">
          <Row label="Privacy" action={<Button variant="ghost" size="sm" onClick={() => onOpenLegal('privacy')}>Read</Button>} />
          <Row label="Terms of use" action={<Button variant="ghost" size="sm" onClick={() => onOpenLegal('terms')}>Read</Button>} />
          <Row label="Version" detail={`ParkSense v${APP_CONFIG.version} · Sydney rules`} />
        </Card>
      </Section>

      <Section icon={Trash2} title="Data">
        <Card>
          <Row
            label="Clear everything on this device"
            detail="Recent scans, your choices, and any running timer."
            action={<Button variant="outline" size="sm" onClick={onClearData}>Clear</Button>}
          />
        </Card>
      </Section>

      <ScreenActions>
        <Button variant="outline" onClick={onBack}>Back</Button>
      </ScreenActions>
    </Screen>
  );
};

export default SettingsScreen;
