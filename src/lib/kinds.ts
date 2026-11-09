// What the team can save. Each kind says who can see it and who can create it.
// "team": every active member sees it. "self": only its author (and mentors).
// Data is free-form JSON from the zone pages, capped in size; text is shown escaped on the client.
export type KindRule = { see: 'team' | 'self'; create: 'any' | 'mentor'; edit: 'author' | 'mentor' | 'any'; max?: number };

export const KINDS: Record<string, KindRule> = {
  task:        { see: 'team', create: 'any',    edit: 'any' },     // build board cards, agenda items
  idea:        { see: 'team', create: 'any',    edit: 'author' },  // Build > Ideas
  vote:        { see: 'team', create: 'any',    edit: 'author' },  // votes on ideas / feedback / matrix
  matrix:      { see: 'team', create: 'any',    edit: 'any' },     // decision matrix scores
  print:       { see: 'team', create: 'any',    edit: 'any' },     // print requests and their status
  inventory:   { see: 'team', create: 'any',    edit: 'any' },     // parts stock and checkouts
  issue:       { see: 'team', create: 'any',    edit: 'any' },     // robot part issues
  version:     { see: 'team', create: 'mentor', edit: 'mentor' },  // robot versions
  progress:    { see: 'team', create: 'any',    edit: 'author' },  // learning path lessons done
  badge:       { see: 'team', create: 'mentor', edit: 'mentor' },  // badges awarded by mentors
  challenge:   { see: 'team', create: 'mentor', edit: 'mentor' },  // weekly code challenges
  submission:  { see: 'team', create: 'any',    edit: 'author' },  // challenge submissions
  arena:       { see: 'team', create: 'any',    edit: 'author' },  // Arena best times (opt-in board)
  chat:        { see: 'team', create: 'any',    edit: 'author', max: 2000 }, // channel posts only, never direct messages
  inspiration: { see: 'team', create: 'any',    edit: 'author' },
  feedback:    { see: 'team', create: 'any',    edit: 'author' },  // hub feedback and roadmap ideas
  word:        { see: 'team', create: 'any',    edit: 'author' },  // glossary suggestions
  event:       { see: 'team', create: 'mentor', edit: 'mentor' },  // calendar meetings and events
  rsvp:        { see: 'team', create: 'any',    edit: 'author' },
  session:     { see: 'team', create: 'any',    edit: 'any' },     // meeting logs: what we did, reflections
  photo:       { see: 'team', create: 'any',    edit: 'author' },
  competition: { see: 'team', create: 'mentor', edit: 'mentor' },
  portfolio:   { see: 'team', create: 'any',    edit: 'any' },
  shoutout:    { see: 'team', create: 'any',    edit: 'author' },
  agenda:      { see: 'team', create: 'mentor', edit: 'mentor' },  // Shop TV plan for the day
  layout:      { see: 'self', create: 'any',    edit: 'author' },  // personal dashboard layout
  pref:        { see: 'self', create: 'any',    edit: 'author' },  // personal settings
};

export const MAX_BYTES = 20_000;
