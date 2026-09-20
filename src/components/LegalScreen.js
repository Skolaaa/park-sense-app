import React from 'react';
import { Screen, ScreenHeader, ScreenActions } from './Screen';
import { Button } from './ui/button';
import { APP_CONFIG } from '../utils/constants';

// Plain-language privacy and terms, rendered in-app so they match the design
// and are reachable offline. The wording describes what the code actually
// does — when the behaviour changes, change this too.

const H = ({ children }) => <h2 className="mt-6 text-base font-semibold">{children}</h2>;
const P = ({ children }) => <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{children}</p>;

export const PrivacyContent = () => (
  <div className="pb-2">
    <P>Last updated 20 September 2026. This is what ParkSense does with information, in plain terms.</P>

    <H>The photo</H>
    <P>
      The photograph you take is resized on your phone and sent to our server, which passes it to OpenAI to
      read the sign. It is not stored by ParkSense. OpenAI's API terms say they do not train on API data and
      retain it briefly for abuse monitoring.
    </P>

    <H>Your location</H>
    <P>
      If you allow it, ParkSense reads your GPS position once per scan and looks up the street name using
      OpenStreetMap's Nominatim service. The address is shown on your result and kept on this device with
      your recent scans. Nothing about your location leaves your phone unless you turn on community data.
    </P>

    <H>Community data (off unless you turn it on)</H>
    <P>
      If you opt in, ParkSense records that a scan or a timer happened near a location, rounded to about
      110 metres, along with the verdict, the posted limit, the hour of day, and whether you told us you were
      fined. Your phone is identified only by a salted hash of a random id. The photo, the exact coordinate
      and your address are never included. This data is combined with everyone else's to show what parking is
      like on a street. You can turn it off at any time from the home screen.
    </P>

    <H>Device id</H>
    <P>
      A random id is created on this device to limit how many scans a single install can make per day. It
      is not linked to an account, an email, or any other identifier.
    </P>

    <H>Analytics and errors</H>
    <P>
      ParkSense may record product events such as "scan completed" or "timer started", with no photo,
      address or coordinates, to understand what works. If the app crashes, a description of the error is
      sent to our server so it can be fixed.
    </P>

    <H>Your rights</H>
    <P>
      Clearing this site's data in your browser removes the device id, consent choice, recent scans and any
      running timer. Community data is anonymous and cannot be linked back to you, which also means it cannot
      be retrieved or deleted per person.
    </P>
  </div>
);

export const TermsContent = () => (
  <div className="pb-2">
    <P>Last updated 20 September 2026.</P>

    <H>What ParkSense is</H>
    <P>
      ParkSense reads a photograph of a parking sign and gives its best reading of what the sign means at the
      current time in Sydney, using the published NSW road rules and calendar. It is a reading aid. It is not
      a determination of the law at your location.
    </P>

    <H>It can be wrong</H>
    <P>
      Signs can be misread, especially when they are partly hidden, angled, faded, or stacked with other plates.
      A sign may also be overridden by a temporary notice, a special event restriction, or a council rule not
      shown on the pole. Always check the sign yourself before you leave the car. The confidence shown with each
      result is the model's own estimate and is not a guarantee.
    </P>

    <H>Your responsibility</H>
    <P>
      You are responsible for where you park and for any fine you receive. Fine amounts shown in the app are
      approximate and are indexed by the NSW Government each year.
    </P>

    <H>Australian Consumer Law</H>
    <P>
      Nothing in these terms excludes, restricts or modifies any consumer guarantee, right or remedy you have
      under the Australian Consumer Law that cannot lawfully be excluded. Where the law permits, ParkSense's
      liability is limited to supplying the service again.
    </P>

    <H>Fair use</H>
    <P>
      ParkSense is provided for personal use. Each device has a daily scan limit. Automated or bulk use of the
      service is not permitted.
    </P>

    <H>Contact</H>
    <P>
      Use "Report a wrong reading" on any result to tell us about a mistake. That report is the main way the
      app improves.
    </P>
  </div>
);

const LegalScreen = ({ kind, onBack }) => {
  const isPrivacy = kind === 'privacy';
  return (
    <Screen>
      <ScreenHeader
        onBack={onBack}
        eyebrow={APP_CONFIG.name}
        title={isPrivacy ? 'Privacy' : 'Terms of use'}
      />
      {isPrivacy ? <PrivacyContent /> : <TermsContent />}
      <ScreenActions>
        <Button variant="outline" onClick={onBack}>Back</Button>
      </ScreenActions>
    </Screen>
  );
};

export default LegalScreen;
