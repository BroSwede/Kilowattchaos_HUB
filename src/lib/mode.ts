/**
 * Preview mode: the hub opens with no sign-in and shows only sample content, so the team can look around
 * before launch. Nothing is read from or written to the database. Set HUB_MODE=live in Vercel to turn on
 * sign-in, setup, the mentor console and the real team data.
 */
export const isPreview = () => (process.env.HUB_MODE || 'preview').trim().toLowerCase() !== 'live';
