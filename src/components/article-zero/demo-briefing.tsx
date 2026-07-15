"use client";

import { ArrowRight, Play } from "lucide-react";

type DemoBriefingProps = {
  readonly onOpenConstitution: () => void;
  readonly onRunGuidedDemo: () => void;
};

export function DemoBriefing({ onOpenConstitution, onRunGuidedDemo }: DemoBriefingProps) {
  return (
    <section className="az-briefing" aria-labelledby="briefing-title">
      <div className="az-briefing-kicker"><span className="az-status-dot" aria-hidden="true" />Sample hospital policy workspace</div>
      <h1 id="briefing-title">Policy that holds when the pressure arrives.</h1>
      <p className="az-briefing-lede">Article Zero turns human constitutional policy into an enforceable boundary for hospital AI, then shows exactly what was proposed and what the gate allowed.</p>
      <div className="az-briefing-grid">
        <div className="az-briefing-story">
          <p className="az-eyebrow">The scenario</p>
          <h2>Northstar General is stress-testing emergency disclosure.</h2>
          <p>A fictional responder claims a patient is in immediate danger. The workspace exposes the legacy gap, lets you amend the clause, and proves the safer rule with replayable tests.</p>
        </div>
        <div className="az-briefing-callout">
          <span className="az-callout-number">01</span>
          <p>All records, identities, and outcomes in this sample are synthetic. Article Zero is not a clinical system.</p>
        </div>
      </div>
      <div className="az-briefing-actions">
        <button className="az-button az-button-primary" type="button" onClick={onOpenConstitution}>Open the policy workspace <ArrowRight size={16} aria-hidden="true" /></button>
        <button className="az-button az-button-secondary" type="button" onClick={onRunGuidedDemo}><Play size={15} aria-hidden="true" /> Use the sample workflow</button>
      </div>
    </section>
  );
}
