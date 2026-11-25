// Trails: the course that runs through the explainers. Five trails follow one thing through the robot
// (a ball, the spin, the power, a command, a correction). Every stop is a mission with four beats:
//   Guess (commit to an answer first), Play (the 3D chapter), Check (two questions), Bench (one job on the real robot).
// This file is the content and the progress store. mission.js runs a mission inside the explainer pop-up,
// and trailmap.js draws the map on Learn, Trails and on the public Robot Lab page.
//
// Writing rules for a mission: one idea, plain words a 7th grader would use, and every answer can be
// found by playing with that chapter. The bench job is one job and one thing to write down, with its safety line.

export const BEATS = [['guess', 'Guess'], ['play', 'Play'], ['check', 'Check'], ['bench', 'Bench']];

export const TRAILS = [
  {
    id: 'ball', name: 'Follow the ball', icon: 'flag', sys: 'launcher',
    ask: 'How does a ball get from the floor into the goal?',
    goal: 'You can explain every step of a shot, and the team has its first launch log.',
    stops: [
      {
        id: 'intake:grab', name: 'The squeeze', ask: 'How tight should the intake grab a ball?',
        guess: { q: 'The ball is 76 mm wide. Which gap under the intake wheel pulls it in best?', a: ['80 mm: a little wider than the ball, so it rolls in easily', '64 mm: the ball gets squashed by about 12 mm', '50 mm: as tight as it goes, for the most grip'], right: 1 },
        reveal: 'A gap about 12 mm smaller than the ball grips best. Any wider and the wheel slips. Much tighter and the ball jams.',
        checks: [
          { q: 'What is compression?', a: ['How fast the intake wheel spins', 'How much the ball is squashed to fit through the gap', 'How heavy the ball is'], right: 1, why: 'The ball has to squash to get through a gap smaller than itself. That squash is compression, and it is what gives the wheel its grip.' },
          { q: 'The intake wheel spins, but the ball slips and stays on the floor. What do you try first?', a: ['Make the gap a little smaller', 'Make the gap a little bigger', 'Charge the battery'], right: 0, why: 'Slipping means too little squeeze. Close the gap a little, then test again.' },
        ],
        bench: { title: 'Measure our squeeze', need: 'A ball, and a ruler or calipers.', steps: ['Power off. Measure the gap the ball has to fit through under the intake wheel.', 'Work out our squeeze: 76 minus your gap.', 'Push a ball through by hand. Does it feel loose, snug or stuck?'], record: { label: 'Our squeeze', unit: 'mm' }, safe: 'Power off before hands go near the intake.' },
      },
      {
        id: 'intake:path', name: 'One at a time', ask: 'Why feed the launcher one ball at a time?',
        guess: { q: 'The gate stays open too long and two balls slip through together. What happens to the second ball?', a: ['It lands short', 'It flies further than the first', 'Nothing changes: both score'], right: 0 },
        reveal: 'The first ball takes speed out of the flywheel. The second one arrives before the wheel is back up to speed, so it lands short.',
        checks: [
          { q: 'What does the gate (our hopper servo) do?', a: ['Spins the flywheel faster', 'Squeezes the ball so the wheel can grip it', 'Holds the line of balls and lets exactly one through'], right: 2, why: 'It is a small arm that opens for a moment. One ball rolls into the flywheel and the rest wait their turn.' },
          { q: 'Two balls keep sneaking through together. What do you change?', a: ['Keep the gate open for longer', 'Keep the gate open for a shorter time', 'Spin the flywheel slower'], right: 1, why: 'How long the gate stays open is one number in the code. Make it shorter and only one ball has time to get past.' },
        ],
        bench: { title: 'Fire three, one at a time', need: 'Three balls, safety glasses and a mentor.', steps: ['Glasses on. Load three balls. Nobody stands in front of the launcher.', 'With a mentor running the robot, fire them one at a time.', 'Count the times exactly one ball left. Did two ever go together?'], record: { label: 'Clean single shots', unit: 'of 3' }, safe: 'Glasses on, nobody in front of the launcher, and a mentor runs the robot.' },
      },
      {
        id: 'launcher:speed', name: 'Wheel to ball', ask: 'How fast does the ball leave the wheel?',
        guess: { q: 'The rim of the flywheel is moving at 12 metres a second. How fast does the ball leave?', a: ['About 12 m/s, the same as the rim', 'About 24 m/s, twice as fast', 'About 6 m/s, half as fast'], right: 2 },
        reveal: 'One side of the ball is dragged along by the wheel. The other side is held still by the hood. So the ball rolls out at about half the speed of the rim.',
        checks: [
          { q: 'What is the hood?', a: ['The curved wall the ball is squeezed against', 'The cover over the battery', 'The motor that spins the flywheel'], right: 0, why: 'The flywheel pinches the ball against the hood. The hood does not move, which is why the ball only gets half the rim speed.' },
          { q: 'You want the ball to leave faster. What works?', a: ['Open the gate for longer', 'Spin the flywheel faster', 'Lower the intake'], right: 1, why: 'The ball leaves at about half the rim speed, and the rim gets faster with every extra turn per second.' },
        ],
        bench: { title: 'Measure the flywheel', need: 'A tape measure, or a strip of paper and a ruler.', steps: ['Power off, and wait until the flywheel has stopped completely.', 'Wrap the tape or the paper once round the rim of the flywheel.', 'Read off the distance. The maths says π × 96 mm, about 302 mm. How close are you?'], record: { label: 'Once round our flywheel', unit: 'mm' }, safe: 'Power off, and never touch a flywheel that is still turning.' },
      },
      {
        id: 'launcher:arc', name: 'Angle and arc', ask: 'What decides where the ball lands?',
        guess: { q: 'The flywheel speed stays the same. Which launch angle drops the ball into a goal 2.65 m away and about 1 m up?', a: ['A flat 30°', 'A steeper 48°', 'A very steep 70°'], right: 1 },
        reveal: 'At this speed a flat shot is too low when it gets there, and a very steep one comes down before the goal. At about 48° the ball drops in from above.',
        checks: [
          { q: 'Once the ball has left the wheel, what steers it?', a: ['The hood', 'The flywheel', 'Only gravity'], right: 2, why: 'In the air nothing on the robot can touch it. Its speed and angle at the start decide the whole flight.' },
          { q: 'On our robot, what sets the launch angle?', a: ['The hood', 'The battery', 'The intake wheels'], right: 0, why: 'The hood sets the angle and the code sets the flywheel speed. Those are the two things we can tune.' },
        ],
        bench: { title: 'Five shots from one spot', need: 'Five balls, a tape measure, safety glasses and a mentor.', steps: ['Glasses on. Mark a spot on the floor and measure how far it is from the goal.', 'With a mentor running the robot, fire five balls from that spot. Change nothing between shots.', 'Count how many went in.'], record: { label: 'Shots that went in', unit: 'of 5' }, safe: 'Glasses on, nobody in front of the launcher, and a mentor runs the robot.' },
      },
    ],
    test: { name: 'Launch log', ask: 'From how far away do we score best?', steps: ['Mark three spots: close, middle and far. Measure how far each one is from the goal.', 'Fire five balls from each spot. Change nothing else.', 'Write down the hits for each spot. Which distance is our best?'], fields: [{ label: 'Close spot', unit: 'cm' }, { label: 'Hits from close', unit: 'of 5' }, { label: 'Middle spot', unit: 'cm' }, { label: 'Hits from the middle', unit: 'of 5' }, { label: 'Far spot', unit: 'cm' }, { label: 'Hits from far', unit: 'of 5' }], safe: 'Glasses on, nobody in front of the launcher, and a mentor runs the robot.' },
    side: ['intake:speed', 'intake:jam', 'launcher:recover'],
  },
  {
    id: 'spin', name: 'Follow the spin', icon: 'reset', sys: 'drivetrain',
    ask: 'How does a spinning motor become a moving robot?',
    goal: 'You can say how fast our robot should drive, and you have timed how fast it really does.',
    stops: [
      {
        id: 'motor:spin', name: 'Why it spins', ask: 'What makes a motor turn, and turn faster?',
        guess: { q: 'You flip the volts on a motor from +6 to −6. What does the motor do?', a: ['It stops', 'It spins the other way', 'It spins the same way, only slower'], right: 1 },
        reveal: 'Flip the volts and every coil’s magnet flips too, so the motor is pushed round the other way. More volts, in either direction, means more speed.',
        checks: [
          { q: 'What turns a coil of wire into a magnet?', a: ['Running electricity through it', 'Spinning it very fast', 'Putting it next to a gear'], right: 0, why: 'A coil is only a magnet while current flows. That is how a motor can switch its magnets on and off.' },
          { q: 'Our code changes a motor’s power from 0.5 to 1. What changes at the motor?', a: ['Nothing, until the robot restarts', 'It gets fewer volts and slows down', 'It gets more volts and spins faster'], right: 2, why: 'Motor power in the code is how many volts the Control Hub lets through. More volts, faster wheel.' },
        ],
        bench: { title: 'Read the motor labels', need: 'The robot, switched off.', steps: ['Find the label on a drive motor, and the label on the launcher motor.', 'Read the rpm printed on each one.', 'Are they the same kind of motor?'], record: { label: 'Drive motor rpm / launcher motor rpm', hint: '312 / 6000' }, safe: 'Power off before you reach into the robot.' },
      },
      {
        id: 'gears:ratio', name: 'Speed or muscle', ask: 'What do you give up to get more push?',
        guess: { q: 'A small 20-tooth gear drives a big 60-tooth gear. What does the big gear do?', a: ['Turns 3 times faster, and pushes harder too', 'Turns at the same speed', 'Turns 3 times slower, but pushes 3 times harder'], right: 2 },
        reveal: 'The big gear turns 3 times slower and pushes 3 times harder. You never get both: gears trade speed for turning force.',
        checks: [
          { q: 'How do you work out a gear ratio?', a: ['Add up the teeth on both gears', 'Divide the teeth on the driven gear by the teeth on the driving gear', 'Weigh the two gears'], right: 1, why: 'Count the teeth and divide. 60 teeth driven by 20 teeth is a ratio of 3 to 1.' },
          { q: 'On our intake a 100-tooth gear drives a 20-tooth gear. What does that do?', a: ['Spins the intake 5 times faster, with less push', 'Spins the intake 5 times slower, with more push', 'Nothing: the two gears cancel out'], right: 0, why: 'A big gear driving a small one is the same trade, the other way round: more speed and less turning force.' },
        ],
        bench: { title: 'Count the intake gears', need: 'The robot, switched off, and a marker pen.', steps: ['Find the two gears that drive the intake.', 'Count the teeth on each. Mark your first tooth with the pen so you do not lose your place.', 'Divide the big number by the small one. That is our intake’s ratio.'], record: { label: 'Teeth on the big gear / the small gear', hint: '100 / 20' }, safe: 'Power off. Fingers never go near gears on a robot that is switched on.' },
      },
      {
        id: 'wheels:size', name: 'Wheel size', ask: 'How far does one turn of a wheel take us?',
        guess: { q: 'Our wheels are 104 mm across. Roll one exactly one full turn. How far does the robot move?', a: ['About 327 mm', 'About 104 mm', 'About 208 mm'], right: 0 },
        reveal: 'One turn moves the wheel by the distance round its edge: π × 104 mm, which is about 327 mm.',
        checks: [
          { q: 'You fit bigger wheels and keep the same motors. What happens to the top speed?', a: ['It goes down', 'It goes up', 'It stays the same'], right: 1, why: 'A bigger wheel goes further on every turn, so the same turns per second cover more floor.' },
          { q: 'How do you work out how fast the robot drives?', a: ['Wheel diameter times the battery volts', 'Count the wheels and multiply by the motors', 'Turns each second times the distance of one turn'], right: 2, why: 'Our wheels make about 5.2 turns a second, and each turn is 0.327 m. That gives about 1.7 metres a second.' },
        ],
        bench: { title: 'Roll one turn', need: 'A bit of tape, a pen and a tape measure.', steps: ['Power off. Stick tape on a wheel where it touches the floor, and mark the floor at the same place.', 'Push the robot straight ahead until the tape comes back down to the floor. That is one full turn.', 'Measure from your floor mark to the tape.'], record: { label: 'One turn moved us', unit: 'mm' }, safe: 'Power off. Push it by hand.' },
      },
      {
        id: 'wheels:roller', name: 'The rollers', ask: 'Why are the rollers set at an angle?',
        guess: { q: 'One mecanum wheel spins forward. Which way does it push the robot?', a: ['Straight forward', 'Half forward and half sideways', 'Straight sideways'], right: 1 },
        reveal: 'The floor can only push along a roller’s axle, and the rollers sit at 45°. So a plain forward spin gives a push that is half forward and half sideways.',
        checks: [
          { q: 'Slide the roller angle to 90°. What kind of wheel do you have now?', a: ['A wheel that only pushes sideways', 'A wheel that cannot push at all', 'A normal tyre: all forward, nothing sideways'], right: 2, why: 'At 90° the rollers cannot roll in the drive direction, so the wheel grips like a normal tyre.' },
          { q: 'Look at our robot from above. What shape do the rollers on the four wheels make?', a: ['An X', 'A square', 'Four lines side by side'], right: 0, why: 'From above, the rollers point toward the middle of the robot and make an X. With one wheel on the wrong corner, strafing stops working.' },
        ],
        bench: { title: 'Find the X', need: 'The robot, switched off.', steps: ['Look straight down on the robot from above.', 'Trace the top roller of each wheel with a finger. Which way does each one point?', 'Do the four make an X? If one wheel breaks the pattern, tell a mentor.'], record: { label: 'From above, our rollers make', pick: ['An X', 'Not an X'] }, safe: 'Power off.' },
      },
      {
        id: 'wheels:four', name: 'Four wheels', ask: 'How do four wheels slide one robot sideways?',
        guess: { q: 'To slide straight sideways (a strafe), what do the four wheels do?', a: ['All four spin forward', 'The left pair spin forward and the right pair spin back', 'One diagonal pair spins forward and the other diagonal pair spins back'], right: 2 },
        reveal: 'In a strafe the wheels on each diagonal match. Their forward and backward pushes cancel out, and only the sideways pushes are left.',
        checks: [
          { q: 'What three things does the driver ask for with the sticks?', a: ['Speed, power and volts', 'Forward, strafe and turn', 'Left, right and stop'], right: 1, why: 'Forward, sideways (strafe) and turn. One line of adding and subtracting per wheel mixes them into four motor powers.' },
          { q: 'Pick Spin in the model. What do the wheels do?', a: ['The left wheels go one way and the right wheels go the other', 'All four spin forward', 'Only the front wheels move'], right: 0, why: 'Turning on the spot is the old tank move: one side forward, the other side back.' },
        ],
        bench: { title: 'Watch a strafe', need: 'Blocks to lift the robot, and a mentor.', steps: ['With a mentor, lift the robot onto blocks so all four wheels are off the floor.', 'Run TeleOp and hold the stick to strafe right.', 'Write F (forward) or B (back) for each wheel, in this order: front left, front right, back left, back right.'], record: { label: 'Front left, front right, back left, back right', hint: 'F B B F' }, safe: 'Wheels off the floor. Hands, hair and sleeves stay clear of the wheels.' },
      },
    ],
    test: { name: 'How fast are we really?', ask: 'The model says 1.7 metres a second. What does a stopwatch say?', steps: ['Tape a start line and a finish line 3 metres apart, with room to get up to speed before the start.', 'Drive flat out through both lines. A teammate times it between the lines with a phone.', 'Do it three times. Speed is 3 divided by your time in seconds.', 'Faster or slower than 1.7? Talk about why that might be.'], fields: [{ label: 'Run 1', unit: 's' }, { label: 'Run 2', unit: 's' }, { label: 'Run 3', unit: 's' }, { label: 'Our real speed', unit: 'm/s' }], safe: 'Clear the floor first, and keep a mentor at the Driver Hub’s Stop.' },
    side: ['motor:open', 'motor:gears', 'gears:planet', 'gears:drive', 'wheels:tank'],
  },
  {
    id: 'power', name: 'Follow the power', icon: 'zap', sys: 'power',
    ask: 'Where does the energy come from, and what happens when we ask for too much?',
    goal: 'You know what the battery can give, and you have watched our own voltage sag.',
    stops: [
      {
        id: 'battery:open', name: 'Inside the battery', ask: 'What is inside our 12 volt battery?',
        guess: { q: 'Peel the wrap off our 12 V battery. What is inside?', a: ['One big 12 volt cell', 'Ten small cells joined in a chain', 'A tank of liquid, like a car battery'], right: 1 },
        reveal: 'Ten small cells, welded end to end. Each one gives 1.2 volts, and ten in a chain add up to 12.',
        checks: [
          { q: 'How many volts does one cell give?', a: ['12 volts', '120 volts', '1.2 volts'], right: 2, why: 'Each cell gives 1.2 V. Ten of them in a chain make the pack’s 12 V.' },
          { q: 'Everything on our robot is fed through one safety part. Which one?', a: ['A 20 amp fuse', 'The Driver Hub', 'The intake'], right: 0, why: 'All the current passes through one 20 amp fuse. Pull more than that for too long and it blows, to protect the wires.' },
        ],
        bench: { title: 'Read the battery label', need: 'A battery that is not plugged in.', steps: ['Pick the battery up with two hands. Never carry it by its wires.', 'Read the label: volts (V) and capacity (mAh).', 'Look it over. Any dents, swelling or bare wire? If so, give it to a mentor and do not use it.'], record: { label: 'The label says: volts / mAh', hint: '12 / 3000' }, safe: 'Never carry a battery by its wires. A damaged battery goes straight to a mentor.' },
      },
      {
        id: 'battery:lab', name: 'Build your own pack', ask: 'How do you get more volts, or more running time?',
        guess: { q: 'You add a second chain of ten cells, side by side with the first. What changes?', a: ['The pack runs for about twice as long', 'The volts double to 24', 'Nothing changes'], right: 0 },
        reveal: 'Chains side by side share the work, so the pack runs longer but stays at 12 volts. Only adding cells to the chain raises the volts.',
        checks: [
          { q: 'You want more volts. What do you do?', a: ['Add a second chain beside the first', 'Add cells to the chain', 'Use thicker wire'], right: 1, why: 'Cells in a chain add up their volts. The word for that is series.' },
          { q: 'A robot needs 12 volts from 1.2 volt cells. How many go in the chain?', a: ['2', '12', '10'], right: 2, why: '10 × 1.2 V = 12 V. That is exactly what is inside our pack.' },
        ],
        bench: { title: 'Read our resting voltage', need: 'A charged battery, the Driver Hub and a mentor.', steps: ['With a mentor, plug in the battery and switch the robot on. Wheels off the floor.', 'Find the battery voltage on the Driver Hub screen.', 'Write it down before any motor runs. That is our resting voltage.'], record: { label: 'Resting voltage', unit: 'V' }, safe: 'A mentor plugs in the battery. Wheels off the floor before the robot is switched on.' },
      },
      {
        id: 'power:one', name: 'One motor', ask: 'When does a motor pull the most current?',
        guess: { q: 'When does a motor pull the most current?', a: ['When it spins freely at top speed', 'When it is switched off', 'When it is powered but held completely still'], right: 2 },
        reveal: 'A motor spinning freely sips about a quarter of an amp. Hold it still (a stall) and it gulps about 9 amps, and all of that turns into heat.',
        checks: [
          { q: 'What is a stall?', a: ['A motor that is powered but cannot turn', 'A motor spinning as fast as it can', 'A flat battery'], right: 0, why: 'Stalled means powered but stuck. It is when a motor pulls the most current and heats up fastest.' },
          { q: 'Our intake jams in the middle of a match. What should the driver do?', a: ['Hold the button until it clears', 'Let go of the button, so the motor is not left stalled', 'Speed up the flywheel'], right: 1, why: 'A jammed intake motor is stalled for as long as the button is held. Letting go saves the motor, the battery and the fuse.' },
        ],
        bench: { title: 'Find the hardest-working motor', need: 'The robot straight after a few minutes of driving, and a mentor.', steps: ['Right after practice, switch the robot off.', 'With a mentor, hold the back of your hand near each drive motor and the intake motor. Do not grab them.', 'Which one is warmest? That motor has been working hardest.'], record: { label: 'Our warmest motor', hint: 'Front left drive' }, safe: 'Power off first. A motor can be hot: feel near it with the back of your hand, and never grab it.' },
      },
      {
        id: 'power:budget', name: 'Power budget', ask: 'What happens when everything runs at once?',
        guess: { q: 'The robot is pushing, the launcher is spinning up and the intake is jammed, all at once. What happens to the battery voltage?', a: ['It climbs above 12.8 V', 'It sags well below 12.8 V', 'It stays at 12.8 V'], right: 1 },
        reveal: 'Every running motor adds its amps to the total. The more amps the battery has to give, the lower its voltage sinks, and above 20 amps for too long the fuse blows.',
        checks: [
          { q: 'How do you work out the total current?', a: ['Take the amps of the biggest motor', 'Count the motors', 'Add up the amps of everything that is running'], right: 2, why: 'It all comes out of one battery, so the amps add up.' },
          { q: 'What is the 20 amp fuse for?', a: ['It blows if we pull too much current for too long, to protect the wires', 'It makes the robot faster', 'It charges the battery'], right: 0, why: 'The fuse is the weakest link on purpose. It breaks before a wire can overheat.' },
        ],
        bench: { title: 'Find the fuse', need: 'The robot with the battery unplugged, and a mentor.', steps: ['With a mentor, find the main fuse on the battery’s lead.', 'Read the number printed on it.', 'Check the pit box. How many spare fuses do we have?'], record: { label: 'Fuse rating / spares in the box', hint: '20 A / 2' }, safe: 'Battery unplugged before anyone touches the fuse.' },
      },
    ],
    test: { name: 'Watch it sag', ask: 'How far does our voltage drop when the robot works hard?', steps: ['Wheels off the floor, a mentor at the robot. Write down the resting voltage from the Driver Hub.', 'Run the drive wheels at full power for 5 seconds. A teammate reads the lowest voltage on the screen.', 'Add the launcher, then the intake as well. Read the lowest voltage each time.', 'Stop and wait a minute. Does the voltage come back up?'], fields: [{ label: 'Resting', unit: 'V' }, { label: 'Driving', unit: 'V' }, { label: 'Driving + launcher', unit: 'V' }, { label: 'Driving + launcher + intake', unit: 'V' }], safe: 'Wheels off the floor, glasses on, nobody in front of the launcher, and a mentor runs the robot.' },
    side: ['battery:cell', 'battery:robot', 'power:match', 'hubs:power'],
  },
  {
    id: 'command', name: 'Follow the command', icon: 'gamepad', sys: 'hardware',
    ask: 'How does a push on the stick become a turning wheel?',
    goal: 'You can trace a stick push all the way to a motor, and you know which port every wheel is on.',
    stops: [
      {
        id: 'hubs:two', name: 'Two boxes', ask: 'Which box does what?',
        guess: { q: 'Where does our robot’s code run?', a: ['On the Driver Hub, in the drivers’ hands', 'On the gamepad', 'On the Control Hub, on the robot'], right: 2 },
        reveal: 'The Control Hub on the robot runs the code and feeds every motor. The Driver Hub sends it the stick numbers over Wi-Fi.',
        checks: [
          { q: 'How do the two hubs talk to each other?', a: ['By Wi-Fi', 'Through a long cable', 'They do not: each runs its own code'], right: 0, why: 'No wire joins the drivers and the robot. The two hubs have their own Wi-Fi link.' },
          { q: 'What does a driver tap to begin a match?', a: ['Start, then Init', 'Init, then Start', 'Stop'], right: 1, why: 'Init gets the program ready. Start runs it. Stop ends it.' },
        ],
        bench: { title: 'Find our TeleOp', need: 'The robot, the Driver Hub and a mentor.', steps: ['Switch on the robot and the Driver Hub, and wait for them to connect.', 'Find the name of our TeleOp program on the Driver Hub.', 'Find where Init, Start and Stop appear. Do not press Start.'], record: { label: 'Our TeleOp is called', hint: 'Main TeleOp' }, safe: 'Wheels off the floor before anyone presses Start.' },
      },
      {
        id: 'hubs:signal', name: 'Stick to wheel', ask: 'Why does the robot react a moment late?',
        guess: { q: 'At a busy event the Wi-Fi delay grows to 150 ms (thousandths of a second). What does the driver notice?', a: ['Nothing at all', 'The robot keeps going for a moment after the stick is let go', 'The robot drives faster'], right: 1 },
        reveal: 'Every stop on the trip adds delay. With slow Wi-Fi the robot is acting on old news, so it rolls on before it reacts. Drivers call it driving on ice.',
        checks: [
          { q: 'What is lag?', a: ['A kind of wheel', 'The battery running low', 'The delay between pushing the stick and the wheel reacting'], right: 2, why: 'Gamepad, Driver Hub, Wi-Fi, Control Hub, loop. Each stop takes a few thousandths of a second, and added up that is lag.' },
          { q: 'Which stop on the trip is most likely to slow down at a busy event?', a: ['The Wi-Fi', 'The gamepad', 'The motor'], right: 0, why: 'At an event the air is full of Wi-Fi from every team, so that is the link that slows down.' },
        ],
        bench: { title: 'Read the ping', need: 'The robot and the Driver Hub, connected.', steps: ['Look for the ping on the Driver Hub screen: a small number in ms. Ask a mentor if you cannot find it.', 'Watch it for 30 seconds.', 'Write down the biggest number you saw.'], record: { label: 'Biggest ping', unit: 'ms' }, safe: 'The robot stays still for this one.' },
      },
      {
        id: 'math:loop', name: 'The loop', ask: 'What is the program doing all match long?',
        guess: { q: 'The loop slows down from 20 ms a lap to 300 ms a lap. The robot is told to stop on a line. What happens?', a: ['It stops in the same place as before', 'It stops further past the line', 'It stops before the line'], right: 1 },
        reveal: 'Between two laps the robot is blind and keeps doing what it was last told. A slow loop notices the line late, so the robot stops further past it.',
        checks: [
          { q: 'What are the three steps in every lap of the loop?', a: ['Read the sensors, decide, set the motors', 'Charge, drive, park', 'Init, Start, Stop'], right: 0, why: 'Read, decide, act, then straight back to the top, many times a second.' },
          { q: 'One lap takes 20 ms. How many laps is that every second?', a: ['5', '500', '50'], right: 2, why: 'There are 1000 ms in a second, and 1000 ÷ 20 = 50 laps.' },
        ],
        bench: { title: 'Find the loop in our code', need: 'Our TeleOp code on a screen (Code, Our code), and a coder or a mentor.', steps: ['Open our TeleOp and find the loop. It is usually <code>while (opModeIsActive())</code> or a method called <code>loop()</code>.', 'Inside it, find one line that reads a gamepad stick and one line that sets a motor power.', 'Count how many motors get a power on every lap.'], record: { label: 'Motors set on every lap', unit: 'motors' }, safe: 'This one is reading only. Nothing to switch on.' },
      },
      {
        id: 'hubs:motor', name: 'Motor port', ask: 'What does power 0.5 really mean?',
        guess: { q: 'The code says motor power 0.5. What does the hub actually send the motor?', a: ['Full battery volts, switched on for half the time', 'A steady 6 volts', 'Half the amps, through a thinner wire'], right: 0 },
        reveal: 'The hub cannot make a steady 6 volts. It flicks full battery power on and off very fast, on for half the time, and the motor feels the average. That trick is called PWM.',
        checks: [
          { q: 'How does a motor port make the motor run backwards?', a: ['It lowers the volts to zero', 'It closes the other pair of switches, so the current flows the other way', 'It turns the battery round'], right: 1, why: 'Four switches make two pairs. One pair sends current one way through the motor, and the other pair sends it back the other way.' },
          { q: 'In plain words, what is PWM?', a: ['A kind of Wi-Fi', 'Charging the battery in pulses', 'Switching the power on and off very fast to set the speed'], right: 2, why: 'The longer the power is on in each flick, the more the motor gets on average. On all the time is full speed.' },
        ],
        bench: { title: 'Trace one motor wire', need: 'The robot, switched off.', steps: ['Find the motor ports on the hub. They are numbered 0 to 3.', 'Follow the wire from the front left drive motor back to the hub.', 'Which port number is it in? Check that it matches the name in our code’s hardware map.'], record: { label: 'Front left motor is in port number', hint: '0 to 3' }, safe: 'Power off. Never plug or unplug a wire while the robot is on.' },
      },
    ],
    test: { name: 'Which wheel is which?', ask: 'Does every wheel do what the code thinks it does?', steps: ['With a mentor, lift the robot onto blocks so the wheels are off the floor.', 'Run TeleOp and push the stick gently forward. Do all four wheels spin forward?', 'If one spins backward, find its line in the hardware map and fix its direction with a coder.', 'Fill in the port and the code name for each wheel.'], fields: [{ label: 'Front left: port and name', hint: '0 frontLeft' }, { label: 'Front right: port and name', hint: '1 frontRight' }, { label: 'Back left: port and name', hint: '2 backLeft' }, { label: 'Back right: port and name', hint: '3 backRight' }], safe: 'Wheels off the floor. Hands, hair and sleeves stay clear of the wheels.' },
    side: ['hubs:ports', 'hubs:inside', 'hubs:servo', 'hubs:sensor', 'math:stick', 'code:clock', 'code:names', 'motor:robot'],
  },
  {
    id: 'loop', name: 'Close the loop', icon: 'focus', sys: 'ballpath',
    ask: 'How does the robot know where it is, and fix its own mistakes?',
    goal: 'You can explain how an autonomous stays on course, and you have measured how well ours repeats.',
    stops: [
      {
        id: 'sensors:enc', name: 'Encoder', ask: 'How does a robot measure distance with no ruler?',
        guess: { q: 'The wheel makes one full turn. About how many ticks does the encoder count?', a: ['About 5', 'About 54', 'About 538'], right: 2 },
        reveal: '537.7 ticks for one turn of the wheel. One turn is 327 mm, so each tick is about 0.6 mm. That is finer than the marks on a ruler.',
        checks: [
          { q: 'What is a tick?', a: ['One click from the encoder as the motor turns', 'One second on the match clock', 'One lap of the loop'], right: 0, why: 'A ring of tiny magnets passes a sensor as the motor turns. Each click is one tick.' },
          { q: 'The encoder has counted 1075 ticks. About how far has the wheel rolled?', a: ['Half a turn', 'Two turns, about 65 cm', 'Ten turns'], right: 1, why: '1075 ÷ 537.7 is 2 turns, and 2 × 327 mm is about 654 mm.' },
        ],
        bench: { title: 'Count the encoder cables', need: 'The robot, switched off.', steps: ['Each motor has two cables: a thick one for power and a thin one for its encoder.', 'Follow the thin cable from every motor to the hub.', 'Count how many encoder cables are plugged in at both ends.'], record: { label: 'Encoder cables plugged in', unit: 'cables' }, safe: 'Power off. Look and count, and do not unplug anything.' },
      },
      {
        id: 'math:drive', name: 'Drive a distance', ask: 'Why is stopping the hard part?',
        guess: { q: 'The code cuts the power at exactly the right tick count. Where does the robot end up?', a: ['Exactly on the mark', 'Past the mark', 'Short of the mark'], right: 1 },
        reveal: 'A moving robot does not stop the instant the power is cut. It coasts past. Slowing down before the end is what lets it stop on the mark.',
        checks: [
          { q: 'How does the code know it has driven 120 cm?', a: ['It times the drive with a clock', 'The driver tells it', 'It turns 120 cm into encoder ticks and counts them'], right: 2, why: 'The distance becomes a number of ticks, and the code counts until it gets there.' },
          { q: 'Which way of stopping misses by less?', a: ['Slowing down near the end', 'Cutting the power at the count', 'Speeding up at the end'], right: 0, why: 'A slow robot has less coasting left to do, so it stops much closer to the mark.' },
        ],
        bench: { title: 'Stop on the line', need: 'Tape, a tape measure and a mentor.', steps: ['Tape a start line and a target line 120 cm apart.', 'In TeleOp, drive from the start and try to stop the front of the robot exactly on the target line. No fixing it afterwards.', 'Measure the miss. Take three goes and keep your best.'], record: { label: 'My best miss', unit: 'cm' }, safe: 'Clear the floor first, and keep a mentor at the Driver Hub’s Stop.' },
      },
      {
        id: 'sensors:imu', name: 'IMU (gyro)', ask: 'How does the robot know which way it faces?',
        guess: { q: 'A minute after a reset, the robot has not turned at all. What does its heading number say?', a: ['Still exactly right', 'A few degrees off', 'Back at zero'], right: 1 },
        reveal: 'The IMU adds up tiny turn readings, thousands of them a second. Tiny mistakes get added up too, so the heading slowly drifts.',
        checks: [
          { q: 'What does the IMU measure?', a: ['How fast the robot is turning, added up into a heading', 'How far the robot has driven', 'How full the battery is'], right: 0, why: 'It feels how fast the robot turns and keeps a running total: the heading, in degrees.' },
          { q: 'Where is the IMU on our robot?', a: ['Inside each wheel', 'On the gamepad', 'Inside the Control Hub'], right: 2, why: 'The chip is inside the Control Hub. That is why the hub must be bolted down tight: if the hub wobbles, so does the heading.' },
        ],
        bench: { title: 'Check how the hub sits', need: 'The robot, switched off.', steps: ['Find the Control Hub and try to wiggle it gently. Is it bolted down tight?', 'Which way does its logo face: up, forward, back, left or right?', 'Which way do its USB ports point? The code needs both answers to read the IMU properly.'], record: { label: 'Logo faces / USB ports point', hint: 'Up / forward' }, safe: 'Power off.' },
      },
      {
        id: 'math:pid', name: 'Turn to 90°', ask: 'How hard should the robot correct a mistake?',
        guess: { q: 'You turn kP (how hard the robot corrects) up very high. What does the turn look like?', a: ['It swings past 90° and wobbles back and forth', 'A slow, careful turn that stops short', 'It does not turn at all'], right: 0 },
        reveal: 'A big kP pushes hard even when the error is small. The robot arrives too fast, swings past and has to come back. Too small and it never quite gets there.',
        checks: [
          { q: 'What is the error?', a: ['A bug in the code', 'How far the robot is from where it should be', 'A warning on the Driver Hub'], right: 1, why: 'The target minus where you are now. At 60° on the way to 90°, the error is 30°.' },
          { q: 'Turning power is kP × error. What happens to the power as the robot gets close to 90°?', a: ['It grows', 'It stays the same', 'It fades, because the error is shrinking'], right: 2, why: 'Small error, small push. That is how the robot eases into the target.' },
        ],
        bench: { title: 'Turn square by hand', need: 'A floor with tile lines, or a taped L shape, and a mentor.', steps: ['Line the robot up along a tile line, or along one arm of the L.', 'In TeleOp, turn a quarter turn (90°) on the sticks and stop. No second nudge.', 'Check it against the other line. Do it five times and count the ones that end square.'], record: { label: 'Square first time', unit: 'of 5' }, safe: 'Clear the floor first, and keep a mentor at the Driver Hub’s Stop.' },
      },
      {
        id: 'code:plan', name: 'Plan an autonomous', ask: 'Why does an autonomous drift off course?',
        guess: { q: 'An autonomous runs on timing alone: drive 2 seconds, turn 1 second, drive, shoot. Run it five times. Where do the shots land?', a: ['All in the same place', 'A little closer every run', 'Scattered, and often outside the target'], right: 2 },
        reveal: 'Each timed step is a little off, and the mistakes stack up. Encoders and the gyro fix each step before the next one starts, so the shots bunch together.',
        checks: [
          { q: 'Why does a plan made of timings drift?', a: ['The battery, the floor and the wheels are a bit different every run, and each small error adds to the next', 'The clock in the hub runs slow', 'The Wi-Fi is busy'], right: 0, why: 'Two seconds of driving never covers quite the same distance twice. With no sensor to check, each step starts from the last step’s mistake.' },
          { q: 'Which sensors pull the plan back on course?', a: ['The gamepad sticks', 'Encoders for distance and the gyro for heading', 'The battery and the fuse'], right: 1, why: 'Encoders count how far the robot really went. The gyro says which way it really faces.' },
        ],
        bench: { title: 'How well does ours repeat?', need: 'Tape, a tape measure, our autonomous and a mentor.', steps: ['Tape a box round the wheels where the robot starts.', 'With a mentor, run our autonomous three times from exactly that box. Mark where the front of the robot stops each time.', 'Measure between the two marks that are furthest apart.'], record: { label: 'Our stop marks are spread over', unit: 'cm' }, safe: 'A mentor runs the robot, and everyone else stands back.' },
      },
    ],
    test: { name: 'Hit the mark', ask: 'Can we make the robot stop closer, by changing one number?', steps: ['Tape a target 120 cm from a start line.', 'With a coder, run a drive-a-distance program five times from the same start. Measure every miss.', 'Change one number only: the power, or where it starts to slow down. Run five more.', 'Did it help? Write down both averages and what you changed.'], fields: [{ label: 'Average miss before', unit: 'cm' }, { label: 'The one number we changed', hint: 'Power 0.8 to 0.5' }, { label: 'Average miss after', unit: 'cm' }], safe: 'Clear the floor first. A mentor runs the robot.' },
    side: ['sensors:dist', 'sensors:color', 'launcher:steady'],
  },
];

// A bonus trail with no missions: the chapters about how the parts are made.
export const BONUS = { id: 'made', name: 'How it’s made', ask: 'Where do the frame, the battery and the motors come from?', stops: ['frame:ore', 'frame:extrude', 'frame:stamp', 'frame:holes', 'frame:finish', 'frame:shape', 'battery:made', 'motor:made'] };

// Side quests and bonus stops are named by their chapter tab. These tabs say too little away from their explainer.
export const STOP_LABEL = { 'motor:open': 'Open up a motor', 'hubs:inside': 'Open up the Control Hub', 'battery:robot': 'The battery on the robot', 'motor:robot': 'The motor on the robot', 'hubs:power': 'Power through the hub', 'battery:made': 'How a battery is made', 'motor:made': 'How a motor is made', 'motor:gears': 'Gears inside the motor' };

const INDEX = new Map();
TRAILS.forEach((trail, ti) => trail.stops.forEach((stop, i) => INDEX.set(stop.id, { trail, ti, i, stop, next: trail.stops[i + 1] || null })));
/** The mission for a chapter ('intake:grab'), with its trail and the stop after it. Null for chapters that are not missions. */
export const findStop = (id) => INDEX.get(id) || null;
export const MISSION_COUNT = INDEX.size;

// ---------------------------------------------------------------- Progress
// Kept on this device, so it also survives a reload while the hub is in testing mode.
// Learn, Trails copies it to the student's own progress record when the hub has real accounts.
//   m: { 'intake:grab': { g: guess index, c: 1 when both checks are right, ok: checks right first time,
//                         b: { v: what they wrote down, by: who watched, at: time }, seen: 1 for a side quest } }
//   t: { ball: { v: [answers], by, at } }   one team test per trail
const KEY = 'kwc-trails-v1';
let mem = null;
export function progress() {
  if (mem) return mem;
  try { mem = JSON.parse(localStorage.getItem(KEY)); } catch (e) { mem = null; }
  if (!mem || typeof mem !== 'object') mem = {};
  if (!mem.m || typeof mem.m !== 'object') mem.m = {};
  if (!mem.t || typeof mem.t !== 'object') mem.t = {};
  return mem;
}
function commit(why) {
  try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* kept for this visit only */ }
  document.dispatchEvent(new CustomEvent('trails:change', { detail: why }));
}
export function saveStop(id, patch) {
  const p = progress();
  p.m[id] = { ...(p.m[id] || {}), ...patch };
  commit('stop');
}
export function saveTest(id, data) { progress().t[id] = data; commit('test'); }
export function clearProgress() { mem = { m: {}, t: {} }; commit('clear'); }
/** Fold in a copy saved to the student's account. Whatever is further along, or newer, wins. */
export function adopt(remote) {
  if (!remote || typeof remote !== 'object') return;
  const p = progress();
  let changed = false;
  for (const [id, r] of Object.entries(remote.m || {})) {
    if (!r || typeof r !== 'object') continue;
    const l = p.m[id] || {}, out = { ...r, ...l };
    if (r.c && !l.c) { out.c = r.c; out.ok = r.ok; }
    if (r.b && (!l.b || (r.b.at || 0) > (l.b.at || 0))) out.b = r.b;
    if (JSON.stringify(out) !== JSON.stringify(l)) { p.m[id] = out; changed = true; }
  }
  for (const [id, r] of Object.entries(remote.t || {})) {
    const l = p.t[id];
    if (r && (!l || (r.at || 0) > (l.at || 0))) { p.t[id] = r; changed = true; }
  }
  if (changed) commit('adopt');
}

export function stopState(id) {
  const s = progress().m[id] || {};
  return { rec: s, guessed: s.g != null, checked: !!s.c, bench: !!s.b, seen: !!s.seen, done: !!s.c && !!s.b };
}
export function trailState(trail) {
  const st = trail.stops.map((s) => stopState(s.id));
  const screen = st.filter((s) => s.checked).length, bench = st.filter((s) => s.bench).length, all = trail.stops.length;
  const test = progress().t[trail.id] || null;
  return { screen, bench, all, test, done: screen === all && bench === all && !!test, pct: ((screen + bench + (test ? 1 : 0)) / (all * 2 + 1)) * 100 };
}
/** What to do next: the first mission whose screen part is not finished, in trail order. */
export function nextStop() {
  for (const trail of TRAILS) for (const stop of trail.stops) if (!stopState(stop.id).checked) return findStop(stop.id);
  return null;
}
/** Missions finished on screen that still need their job at the robot. */
export function benchWaiting() {
  const out = [];
  for (const trail of TRAILS) for (const stop of trail.stops) { const s = stopState(stop.id); if (s.checked && !s.bench) out.push(findStop(stop.id)); }
  return out;
}
/** What a student wrote down, as short text: '12 mm', 'F B B F'. */
export function benchText(stop, rec) {
  if (!rec || !rec.b) return '';
  const unit = stop.bench.record.unit, v = String(rec.b.v ?? '');
  return unit ? `${v} ${unit}` : v;
}
