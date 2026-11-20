// FIRST and FTC facts shared by Learn > FIRST and BIOBUZZ (hub) and the public Robot Lab page,
// so both always say the same thing. Season-specific game rules stay as links to FIRST's own pages.
export const CORE = [
  ['Discovery', 'We explore new skills and ideas.', 'Trying a change when nobody knows yet if it will work, then testing it.'],
  ['Innovation', 'We use creativity and persistence to solve problems.', 'Testing a part ten times, and still going, until it works.'],
  ['Impact', 'We apply what we learn to improve our world.', 'Showing the robot at a library or a school, so other kids want to try FIRST.'],
  ['Inclusion', 'We respect each other and embrace our differences.', 'Everyone gets BioBuzz XR time, not just the drivers.'],
  ['Teamwork', 'We are stronger when we work together.', 'One person measures, one writes it down, then you swap.'],
  ['Fun', 'We enjoy and celebrate what we do!', 'Shoutouts at the end of a meeting for something a teammate did well.'],
];
export const LINKS = [
  ['Competition Manual', 'The official game and robot rules', 'https://ftc.game/manual/'],
  ['Team Updates', 'Rule changes during the season', 'https://ftc.game/tu-latest'],
  ['Field resources', 'Field drawings and CAD', 'https://ftc-resources.firstinspires.org/ftc/field'],
  ['Scoring calculator', 'Work out a match score', 'https://ftc.game/calculator'],
  ['Rules chatbot', "FIRST's AI helper for the manual", 'https://ftc-cmchatbot.firstinspires.org/'],
  ['FTC Docs', 'Control Hub and programming guides', 'https://ftc-docs.firstinspires.org/'],
  ['Community forum', 'Questions and answers from other teams', 'https://ftc-community.firstinspires.org/'],
];
export const COMP_FAQ = [
  ['What happens at a league meet?', 'You play several matches, each with a different alliance partner, and your scores count toward the league rankings. Judged awards usually happen at tournaments and qualifiers. Each event\'s page says what to expect.'],
  ["What's inspection?", 'Before you play, inspectors check that the robot follows the robot rules and is safe. Practice with the checklist in Logbook, Competitions, and bring the official checklist from the manual.'],
  ['What do judges ask?', "How you designed things, what you tried that didn't work, and how the team works together. Everyone should be ready to talk about their own part. Your session notes are the best practice."],
  ['What if our robot breaks?', "Fix it in the pits. Ask other teams for a part or a hand. That's Coopertition, and they'll ask you too."],
  ['Who registers the team?', 'Coach registers the team with FIRST. Each of you is added in the FIRST Dashboard, and a parent or guardian fills in the consent and release form.'],
  ['Can families come?', 'Yes. Most events are free to watch. Check the event page for the schedule.'],
  ['Where do official answers come from?', 'The Competition Manual, the Team Updates and the official Q&A. When a rule question matters for the robot, Coach asks the Q&A and the answer gets pinned here.'],
];

// What a match looks like (same numbers as Learn and the "How the code flows" explainer).
export const MATCH = [
  ['bot', 'Autonomous', '30 s', 'The robot runs your code by itself. Hands off the controllers.'],
  ['clock', 'Changeover', 'a few seconds', 'Drivers pick up the gamepads and start the TeleOp program.'],
  ['gamepad', 'Driver-controlled (TeleOp)', '2 min', 'Two drivers per team, using gamepads.'],
  ['flag', 'Endgame', 'last part', 'The end of driver control, often with bonus tasks.'],
];
// The game in plain words. General FTC facts that hold every season; the exact scoring is in the manual.
export const GAME_BASICS = [
  ['Alliances', 'Every match is 2 against 2: a red alliance and a blue alliance, two teams each. Your partner changes every match, and next match they might be your opponent.'],
  ['Scoring', 'Points come from game pieces scored in autonomous and TeleOp, plus endgame tasks. Autonomous points usually count extra, which is why good autonomous code matters. The exact points for this season are in the Competition Manual and the scoring calculator.'],
  ['Penalties', 'Breaking a rule (like pushing into a protected zone or holding too many game pieces) gives the other alliance points. Drivers learn the penalty rules before the first meet.'],
  ['Rankings', 'Winning matches earns ranking points. At a tournament, the top teams pick alliance partners for the playoffs.'],
  ['Awards', 'Judges also give awards for the engineering portfolio, the interview, outreach and team spirit. The Inspire Award is the top one and looks at everything a team does, not just the robot.'],
];
// Robot rules that matter most to a new team, from the 2026-27 Competition Manual (rule numbers in brackets).
export const ROBOT_RULES = [
  ['Size', 'At the start of a match the robot must fit in an 18 × 18 × 18 inch box (about 46 cm) and sit still. After the start it can grow to 18 × 24 inches and 29 inches tall, but it must be built so it can\'t grow past that, and it can\'t drop parts on purpose. [R102, R105]'],
  ['Brain and power', 'One REV Control Hub controls the robot. Power comes from exactly one legal 12 V NiMH battery with a 20 A fuse, through one legal main power switch. [R601, R603, R701]'],
  ['Motors and servos', 'Only motors on the legal list (our goBILDA Yellow Jackets are on it). At most 8 motors and 8 servos in total, and you can\'t open up or change them. [R501, R503, R504]'],
  ['Number signs', 'At least 2 signs, on sides at least 90° apart. Each is at least 6.5 × 2.5 inches, solid red or blue, with white team numbers about 2.25 inches tall in one row. [R401–R403]'],
  ['Safe build', 'No sharp edges or pinch points, nothing that damages the field or makes a mess, and the robot can be lifted off the field with the power off. [R201–R203]'],
  ['Inspection', 'Before a team can play, inspectors check the robot against these rules. After big changes, ask for re-inspection. [I301, I303]'],
];
// Safety in the shop and at events.
export const SAFETY = [
  'Safety glasses on whenever someone is building or testing.',
  'Power off before touching wires, and unplug the battery before working inside the robot.',
  'Keep fingers clear of wheels, gears and the launcher while the robot is on.',
  'Carry the robot with two people and the switch off.',
];

// Robot inspection practice, based on the 2026-27 Competition Manual robot rules. Also used by Logbook > Competitions.
export const INSPECT = [
  'Bring the whole robot, every part you might swap on, and the Driver Hub and gamepads [I301]',
  'Folded up, the robot fits in an 18 × 18 × 18 inch box and nothing moves [R102]',
  'Unfolded all the way, it stays inside 18 × 24 inches and 29 inches tall, and nothing can fall off [R105]',
  'No sharp edges, pinch points or parts that could damage the field [R201, R202]',
  'The robot can be lifted off the field and game pieces taken out with the power off [R203]',
  'Every motor is on the legal list, and there are 8 or fewer [R501, R503]',
  'Every servo is legal, and there are 8 or fewer [R502, R503]',
  'No motor or servo has been opened up or changed [R504]',
  'Exactly one legal 12 V NiMH battery, held down tight, with a 20 A fuse [R601, R604]',
  'One legal main power switch, easy to reach and away from moving parts [R603]',
  'No bare wire touching the metal frame (the frame is never part of a circuit) [R605]',
  'Power wires are thick enough and the right colours: red for plus, black for minus [R609, R610]',
  'Hubs, wires and lights can be seen by the inspector [R606]',
  'At least 2 number signs on sides at least 90° apart, the right size and alliance colour [R401–R403]',
  'Control Hub named with our team number plus -RC, and Driver Hub plus -DS (like 12345-RC) [R705]',
  'Robot stops right away when the Driver Hub says stop',
];
// Quick check before every match.
export const PRE_MATCH = [
  'Fresh, fully charged battery in, and the old one on the charger',
  'Driver Hub charged, and both gamepads connected and working',
  'Robot powers on and connects to the Driver Hub',
  'Right autonomous program picked, and the robot set in its starting spot',
  'Number signs in the right colour for this match (red or blue)',
  'Quick look: nothing loose, wires tied down, launcher and intake clear',
  'Know the plan with your alliance partner for autonomous and endgame',
];
// Pack list for event day.
export const PACK = [
  'Robot and its cart', 'All batteries and the chargers', 'Driver Hub, its charger and two gamepads', 'Spare fuses, cables and zip ties',
  'Tool box: hex keys, screwdrivers, pliers', 'Spare parts: wheels, servos, screws', 'Team number signs, red and blue', 'Engineering portfolio', 'Safety glasses for everyone',
];
