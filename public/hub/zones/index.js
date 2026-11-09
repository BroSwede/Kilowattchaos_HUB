// Loads each zone's pages the first time someone opens that zone, so Home starts fast.
const LOADERS = {
  home: () => import('./home.js').then((m) => m.HOME),
  robot: () => import('./robot.js').then((m) => m.ROBOT),
  build: () => import('./build.js').then((m) => m.BUILD),
  learn: () => import('./learn.js').then((m) => m.LEARN),
  code: () => import('./code.js').then((m) => m.CODE),
  crew: () => import('./crew.js').then((m) => m.CREW),
  logbook: () => import('./logbook.js').then((m) => m.LOGBOOK),
};
const cache = {};
export function loadZone(id) {
  if (!LOADERS[id]) return Promise.resolve(null);
  if (!cache[id]) cache[id] = LOADERS[id]().catch((err) => { delete cache[id]; throw err; });
  return cache[id];
}
export { initGlossaryTips, closeDrawer, slug } from './common.js';
