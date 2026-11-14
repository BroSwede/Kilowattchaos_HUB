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
      <p class="lead">How our goBILDA StarterBot works, in 3D you can turn and play with. New here? Do the four under Start here, in order.</p>
    </header>
    <div class="lab-levels" id="labLevels"></div>
    <p class="cap lab-foot">Best on a laptop or tablet. Drag to turn the 3D, scroll or pinch to zoom.</p>
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
