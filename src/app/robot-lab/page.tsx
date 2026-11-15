import { SPRITE } from '@/hub/shell';

export const metadata = {
  title: 'Kilowatt Chaos Robot Lab',
  description: "How our robot's parts are made and how they work, in 3D you can turn, pull apart and play with.",
};

const CSS = ['shell.css', 'zones.css', 'dive.css', 'lab.css'];

// Public, no sign-in: the robot explainers on their own page to share with the team and families.
// It reads the same topic list as the hub (public/hub/dive/index.js), so new dives show up here automatically,
// grouped into the same three paths: Start here, Make it score, Go deeper.
const BODY = `<div class="page"><div class="frame lab-frame">
  <div class="topbar">
    <div class="tab">
      <span class="logo" aria-hidden="true"><svg class="i lg"><use href="#i-zap"/></svg></span>
      <h1 class="zone-title">Robot Lab</h1>
    </div>
  </div>
  <div class="app lab-app">
    <header class="lab-hero">
      <div class="eyebrow">Kilowatt Chaos · FTC team</div>
      <h2 class="hello">Open up our robot</h2>
      <p class="lead">Our goBILDA StarterBot in 3D. Click any part to see what it does, then open the explainers below. The rules of the game are at the bottom.</p>
    </header>
    <section class="lab-robot" aria-labelledby="labRobotH">
      <div class="lab-sec-head"><h3 class="card-title" id="labRobotH">Click a part to learn about it</h3><span class="cap">The real robot, every one of its 418 parts</span></div>
      <div class="viewport lab-view" id="viewport">
        <img class="poster" src="/hub/assets/poster.webp" alt="The goBILDA StarterBot, seen from the front left" decoding="async">
        <canvas id="robotCanvas" tabindex="0" aria-label="3D model of our robot. Drag to turn, scroll or pinch to zoom, click a part to learn about it."></canvas>
        <div class="loader glass" id="loader" role="status" aria-live="polite"><div class="bar"><span id="loadBar"></span></div><div class="lbl" id="loadLbl">Loading the robot, 0%</div></div>
        <button class="icon-btn lab-reset" type="button" id="resetBtn" aria-label="Reset view" title="Reset view"><svg class="i"><use href="#i-reset"/></svg></button>
        <aside class="lab-card-part" id="partCard" hidden aria-live="polite">
          <button class="icon-btn sm lab-x" type="button" id="partClose" aria-label="Close"><svg class="i"><use href="#i-x"/></svg></button>
          <div class="eyebrow" id="partSys"></div>
          <h4 id="partName"></h4>
          <p id="partText"></p>
          <button class="btn primary pill sm" type="button" id="partDive" hidden></button>
        </aside>
      </div>
      <div class="lab-chips" id="partChips"></div>
      <p class="cap">It's a big download (about 143 MB), so use Wi-Fi on a phone. Drag to turn, scroll or pinch to zoom.</p>
    </section>
    <div class="lab-levels" id="labLevels"></div>
    <section class="lab-rules" aria-labelledby="labRulesH">
      <div class="lab-sec-head"><h3 class="card-title" id="labRulesH">Rules and the game, in plain words</h3><span class="cap">The short version. The official manual always wins.</span></div>
      <div id="labRules"></div>
    </section>
    <p class="cap lab-foot">Made by Kilowatt Chaos for our team and families.</p>
  </div>
</div></div>`;

export default function RobotLab() {
  return (
    <>
      {CSS.map((f) => <link key={f} rel="stylesheet" href={`/hub/${f}`} precedence="default" />)}
      <div id="kwc-root" dangerouslySetInnerHTML={{ __html: SPRITE + BODY }} />
      <script type="module" src="/hub/lab.js" async />
    </>
  );
}
