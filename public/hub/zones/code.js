// Code zone: BioBuzz XR (the team's robot lab, match sim, Driver Academy and Code Lab), Our code, Snippets, Challenges.
// BioBuzz XR is a separate three.js site built from the team's BioBuzzXR project and served from /biobuzz-xr/.
// Our code shows starter files until a mentor connects the team's GitHub repo. Challenges and submissions are saved team data.
import { $, $$, esc, clamp, icon, tag, strip, av, avStack, sw, seg, wireSeg, copyText, codeBlock } from './common.js';
import { api, session, isMentor, me } from '../api.js';
import { myProgress, saveProgress } from './learn.js';

// ================================================================= BioBuzz XR
// The laptop site is a static build in public/biobuzz-xr (from the BioBuzzXR project's web/ folder, built with
// BASE_PATH=/biobuzz-xr/). Each part opens in its own tab, so gamepads, fullscreen and WebXR work.
const XR_BASE = '/biobuzz-xr/';
const XR_PARTS = [
  { href: 'index.html', t: 'BIOBUZZ Hub', ic: 'home', d: 'The start page for everything below, with the field and the robot in 3D.' },
  { href: 'showcase.html', t: 'Robot Lab', ic: 'bot', d: 'The StarterBot from goBILDA\'s CAD. Explode it, turn on labels and read what every part does.' },
  { href: 'game.html', t: 'Match Day', ic: 'trophy', d: 'A full BIOBUZZ match on the real field: drive, score pollen, and watch the simulator referee it.' },
  { href: 'academy.html', t: 'Driver Academy', ic: 'gamepad', d: 'Six timed driving drills with medals and ranks. Plug in a gamepad for the real feel.' },
  { href: 'code.html', t: 'Code Lab', ic: 'code', d: 'Real FTC-style Java in seven missions. Nothing to install, and the robot runs your code.' },
];
const xrLink = (href, label, cls = 'primary') => `<a class="btn ${cls} pill" href="${XR_BASE}${href}" target="_blank" rel="noopener">${icon('max', 'i sm')}${label}</a>`;

function biobuzzXr(view) {
  view.innerHTML = `<div class="zv">
    ${strip('BioBuzz XR is our own BIOBUZZ simulator: the robot in 3D, a full match on the real field, driving drills and a Java Code Lab. It runs in any browser, on laptops, Chromebooks and the Quest browser.', [tag('Opens in a new tab'), tag('Works with a gamepad', 'line')], xrLink('index.html', 'Open BioBuzz XR'))}
    <article class="card xr-hero">
      <a class="xr-shot" href="${XR_BASE}index.html" target="_blank" rel="noopener" aria-label="Open BioBuzz XR">
        <img src="${XR_BASE}hub-hero.jpg" alt="The BIOBUZZ field and the StarterBot in BioBuzz XR" loading="lazy">
      </a>
      <div class="xr-parts">${XR_PARTS.map((p) => `<a class="it xr-part" href="${XR_BASE}${p.href}" target="_blank" rel="noopener">
        <span class="oc2${p.href === 'index.html' ? ' volt' : ''}">${icon(p.ic, 'i sm')}</span>
        <div class="grow"><div class="t">${p.t}</div><div class="meta cap" style="font-weight:400">${p.d}</div></div>
        <span class="end">${icon('arrow', 'i sm')}</span></a>`).join('')}</div>
    </article>
    <article class="card c6 stretch">
      <div class="card-head"><span class="oc2">${icon('layers', 'i sm')}</span><h3 class="card-title">In the headset</h3><span class="tag">Quest 3</span></div>
      <p>The Quest app puts the Robot Lab on your table and the full 12 ft field on the floor. Explode the robot, throw parts in zero-G, walk through it at giant size, and play a match in AR.</p>
      <ol class="tv-how">
        <li>A mentor installs it once from the shop laptop with USB (the app is not in the Meta store).</li>
        <li>After that it lives in the headset under Library, Unknown Sources, BioBuzz XR.</li>
        <li>One student wears it and casts to the laptop, so the rest of the team can watch. Swap every 3 minutes.</li>
      </ol>
      <p class="cap" style="font-weight:400">No headset free? Open the Robot Lab above in the Quest browser instead.</p>
    </article>
    <article class="card c6 stretch">
      <div class="card-head"><span class="oc2">${icon('bulb', 'i sm')}</span><h3 class="card-title">Where to start</h3></div>
      <div class="items">
        <a class="it" href="${XR_BASE}academy.html" target="_blank" rel="noopener"><span class="oc2">${icon('gamepad', 'i sm')}</span><div class="grow"><div class="t">New driver?</div><div class="meta cap" style="font-weight:400">Driver Academy, drill 1. Try to earn a medal before the next meeting.</div></div></a>
        <a class="it" href="${XR_BASE}code.html" target="_blank" rel="noopener"><span class="oc2">${icon('code', 'i sm')}</span><div class="grow"><div class="t">Want to code?</div><div class="meta cap" style="font-weight:400">Code Lab, mission 1. The same Java you write in OnBot Java.</div></div></a>
        <a class="it" href="${XR_BASE}showcase.html" target="_blank" rel="noopener"><span class="oc2">${icon('wrench', 'i sm')}</span><div class="grow"><div class="t">Like building?</div><div class="meta cap" style="font-weight:400">Robot Lab: explode it and find the launcher, intake and ball path.</div></div></a>
      </div>
      <p class="cap" style="font-weight:400">BioBuzz XR builds on the open-source BIOBUZZ Digital Twin by FTC team 36682, the Camels Hump Coders (MIT license).</p>
    </article>
  </div>`;
}

// ================================================================= Our code (starter files until a mentor connects the team repo)
const FILES = {
  'opmodes/DriveTeleOp.java': {
    about: 'The driver-controlled program. Gamepad 1 drives the mecanum wheels; gamepad 2 runs the intake, launcher and ball path.',
    src: `package org.firstinspires.ftc.teamcode.opmodes;

import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.eventloop.opmode.TeleOp;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorSimple;
import org.firstinspires.ftc.teamcode.subsystems.BallPath;
import org.firstinspires.ftc.teamcode.subsystems.Intake;
import org.firstinspires.ftc.teamcode.subsystems.Launcher;

@TeleOp(name = "Drive TeleOp", group = "Kilowattchaos")
public class DriveTeleOp extends LinearOpMode {
    // Mecanum wheels strafe a little slower than they drive. Tune 1.1 with a strafe test.
    static final double STRAFE_FIX = 1.1;

    @Override
    public void runOpMode() {
        DcMotor frontLeft = hardwareMap.get(DcMotor.class, "frontLeft");
        DcMotor frontRight = hardwareMap.get(DcMotor.class, "frontRight");
        DcMotor backLeft = hardwareMap.get(DcMotor.class, "backLeft");
        DcMotor backRight = hardwareMap.get(DcMotor.class, "backRight");
        // The right-side motors face the other way, so reverse them.
        frontRight.setDirection(DcMotorSimple.Direction.REVERSE);
        backRight.setDirection(DcMotorSimple.Direction.REVERSE);

        Intake intake = new Intake(hardwareMap);
        BallPath ballPath = new BallPath(hardwareMap);
        Launcher launcher = new Launcher(hardwareMap);

        telemetry.addLine("Ready. Press Start!");
        telemetry.update();
        waitForStart();

        while (opModeIsActive()) {
            double drive = -gamepad1.left_stick_y;   // up on the stick is negative
            double strafe = gamepad1.left_stick_x * STRAFE_FIX;
            double turn = gamepad1.right_stick_x;

            // Scale everything down if any wheel would go past full power.
            double max = Math.max(1.0, Math.abs(drive) + Math.abs(strafe) + Math.abs(turn));
            frontLeft.setPower((drive + strafe + turn) / max);
            backLeft.setPower((drive - strafe + turn) / max);
            frontRight.setPower((drive - strafe - turn) / max);
            backRight.setPower((drive + strafe - turn) / max);

            intake.run(gamepad2.right_trigger - gamepad2.left_trigger);
            if (gamepad2.a) launcher.spinUp();
            if (gamepad2.b) launcher.stop();
            // Only feed a ball once the flywheel is at speed.
            if (gamepad2.right_bumper && launcher.atSpeed()) ballPath.feedOne();
            ballPath.update();

            telemetry.addData("Launcher", "%.0f ticks/s", launcher.speed());
            telemetry.addData("At speed", launcher.atSpeed());
            telemetry.update();
        }
    }
}`,
  },
  'opmodes/AutoDriveForward.java': {
    about: 'The first autonomous: drive forward 24 inches using the wheel encoders, then stop. A good first auto to tune.',
    src: `package org.firstinspires.ftc.teamcode.opmodes;

import com.qualcomm.robotcore.eventloop.opmode.Autonomous;
import com.qualcomm.robotcore.eventloop.opmode.LinearOpMode;
import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorSimple;

@Autonomous(name = "Auto: drive forward", group = "Kilowattchaos")
public class AutoDriveForward extends LinearOpMode {
    // goBILDA 312 rpm motor: 537.7 encoder ticks per turn. Our mecanum wheels are 104 mm across.
    static final double TICKS_PER_INCH = 537.7 / (Math.PI * 104 / 25.4);

    DcMotor[] wheels;

    @Override
    public void runOpMode() {
        wheels = new DcMotor[] {
            hardwareMap.get(DcMotor.class, "frontLeft"), hardwareMap.get(DcMotor.class, "frontRight"),
            hardwareMap.get(DcMotor.class, "backLeft"), hardwareMap.get(DcMotor.class, "backRight")
        };
        wheels[1].setDirection(DcMotorSimple.Direction.REVERSE);
        wheels[3].setDirection(DcMotorSimple.Direction.REVERSE);
        for (DcMotor m : wheels) {
            m.setMode(DcMotor.RunMode.STOP_AND_RESET_ENCODER);
            m.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.BRAKE);
        }

        waitForStart();
        driveInches(24, 0.4);
    }

    void driveInches(double inches, double power) {
        int ticks = (int) Math.round(inches * TICKS_PER_INCH);
        for (DcMotor m : wheels) {
            m.setTargetPosition(m.getCurrentPosition() + ticks);
            m.setMode(DcMotor.RunMode.RUN_TO_POSITION);
            m.setPower(power);
        }
        while (opModeIsActive() && wheels[0].isBusy() && wheels[1].isBusy()) {
            telemetry.addData("Front left", wheels[0].getCurrentPosition());
            telemetry.addData("Target", ticks);
            telemetry.update();
        }
        for (DcMotor m : wheels) m.setPower(0);
    }
}`,
  },
  'subsystems/Launcher.java': {
    about: 'The flywheel. It runs at a set speed, measured by the encoder, so every shot leaves the same way.',
    src: `package org.firstinspires.ftc.teamcode.subsystems;

import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.DcMotorEx;
import com.qualcomm.robotcore.hardware.HardwareMap;

/** The flywheel launcher. setVelocity holds the speed steady, even as the battery drops. */
public class Launcher {
    // Target speed in encoder ticks per second. Tuned by testing shots, not by math.
    public static double TARGET = 1500;
    public static double TOLERANCE = 40;

    private final DcMotorEx motor;
    private double target = 0;

    public Launcher(HardwareMap hw) {
        motor = hw.get(DcMotorEx.class, "launcher");
        motor.setMode(DcMotor.RunMode.RUN_USING_ENCODER);
        // Let the flywheel coast down instead of slamming to a stop.
        motor.setZeroPowerBehavior(DcMotor.ZeroPowerBehavior.FLOAT);
    }

    public void spinUp() { target = TARGET; motor.setVelocity(target); }

    public void stop() { target = 0; motor.setVelocity(0); }

    public double speed() { return motor.getVelocity(); }

    public boolean atSpeed() { return target > 0 && Math.abs(speed() - target) < TOLERANCE; }
}`,
  },
  'subsystems/Intake.java': {
    about: 'The gecko-wheel intake. One motor: positive pulls balls in, negative spits them out.',
    src: `package org.firstinspires.ftc.teamcode.subsystems;

import com.qualcomm.robotcore.hardware.DcMotor;
import com.qualcomm.robotcore.hardware.HardwareMap;

/** The intake. This file just spins it. */
public class Intake {
    private final DcMotor motor;

    public Intake(HardwareMap hw) {
        motor = hw.get(DcMotor.class, "intake");
    }

    /** power: 1 pulls balls in, -1 spits them out, 0 stops. */
    public void run(double power) {
        motor.setPower(Math.max(-1, Math.min(1, power)));
    }

    public void stop() { motor.setPower(0); }
}`,
  },
  'subsystems/BallPath.java': {
    about: 'The servo gate between the hopper and the flywheel. It lets one ball through, then waits before the next.',
    src: `package org.firstinspires.ftc.teamcode.subsystems;

import com.qualcomm.robotcore.hardware.HardwareMap;
import com.qualcomm.robotcore.hardware.Servo;
import com.qualcomm.robotcore.util.ElapsedTime;

/** One ball at a time: open the gate, close it, then pause before the next ball. */
public class BallPath {
    static final double CLOSED = 0.15, OPEN = 0.55;
    public static double OPEN_TIME = 0.25;   // seconds the gate stays open
    public static double PAUSE = 0.35;       // longer pause so two balls don't go together

    private final Servo gate;
    private final ElapsedTime timer = new ElapsedTime();
    private boolean open = false;

    public BallPath(HardwareMap hw) {
        gate = hw.get(Servo.class, "hopperServo");
        gate.setPosition(CLOSED);
    }

    public void feedOne() {
        if (!open && timer.seconds() > PAUSE) {
            gate.setPosition(OPEN);
            open = true;
            timer.reset();
        }
    }

    /** Call this every loop so the gate closes on time. */
    public void update() {
        if (open && timer.seconds() > OPEN_TIME) {
            gate.setPosition(CLOSED);
            open = false;
            timer.reset();
        }
    }
}`,
  },
  'README.md': {
    lang: 'md',
    about: 'How the code is organized and the names everything uses. Start here.',
    src: `# Kilowattchaos robot code · BIOBUZZ 2026–27

Built on the FTC SDK. Everything we write is in TeamCode.

## Where things are
- opmodes/     programs you pick on the Driver Station
- subsystems/  one file per part of the robot (intake, launcher...)

## Hardware names (set these in the robot configuration)
frontLeft  frontRight  backLeft  backRight   drive motors
intake                                        intake motor
launcher                                      flywheel motor
hopperServo                                   ball gate servo

## Before you change something
1. Try it in the BioBuzz XR Code Lab or as a snippet first.
2. Test on the robot with the wheels off the floor.
3. One idea per commit, with a message anyone can read.`,
  },
};
const TREE = [['dir', 'TeamCode', 0], ['dir', 'opmodes', 1], ['file', 'opmodes/DriveTeleOp.java', 2], ['file', 'opmodes/AutoDriveForward.java', 2], ['dir', 'subsystems', 1], ['file', 'subsystems/BallPath.java', 2], ['file', 'subsystems/Intake.java', 2], ['file', 'subsystems/Launcher.java', 2], ['file', 'README.md', 1]];
const folder = '<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';
function ourcode(view, ctx) {
  let cur = FILES[ctx.state.file] ? ctx.state.file : 'opmodes/DriveTeleOp.java';
  view.innerHTML = `<div class="zv">
    ${strip("Starter code. This page will show the team's GitHub repo once a mentor connects it. Until then, these example FTC files show how a robot program is put together. Write code in OnBot Java or Android Studio.", [tag('Starter code'), tag('No repo connected yet', 'line')])}
    <article class="card">
      <div class="repo">
        <ul class="tree" id="tree" aria-label="Files">${TREE.map(([k, p, d]) => (k === 'dir' ? `<li class="dir" style="padding-left:${8 + d * 14}px">${folder}${p}/</li>` : `<li style="padding:0;padding-left:${d * 14}px"><button type="button" data-file="${p}" aria-current="${p === cur}">${icon(p.endsWith('.md') ? 'note' : 'code', 'i')}${p.split('/').pop()}</button></li>`)).join('')}</ul>
        <div class="stack-v" style="gap:12px;min-width:0" id="fileView"></div>
      </div>
    </article>
    <article class="card c7">
      <div class="card-head"><span class="oc2">${icon('code', 'i sm')}</span><h3 class="card-title">How code will get here</h3></div>
      <ol class="bul"><li>A mentor connects the team's GitHub repo to the Hub.</li><li>You change code in OnBot Java or Android Studio.</li><li>A mentor helps you commit it with a clear message.</li><li>The new code, and who changed what, shows up on this page.</li></ol>
      <p class="cap" style="font-weight:400">Until then, the files above are examples, not the code on our robot.</p>
    </article>
    <article class="card c5">
      <div class="card-head"><span class="oc2 volt">${icon('bulb', 'i sm')}</span><h3 class="card-title">Use the starter code</h3></div>
      <p>Copy a file into OnBot Java to get going, then make it yours. Check that the hardware names in README.md match your robot configuration.</p>
      <div class="row wrap"><button class="btn soft pill" type="button" data-goto="code|Snippets">${icon('code', 'i sm')}Snippets</button><button class="btn ghost pill" type="button" data-goto="learn|Setup and FAQ">${icon('book', 'i sm')}Set up OnBot Java</button></div>
    </article>
  </div>`;
  const draw = () => {
    const f = FILES[cur];
    $('#fileView').innerHTML = `<div class="code-head"><span class="path">${cur}</span><span class="tag line">Starter code</span><span class="row" style="margin-left:auto;gap:6px"><button class="btn ghost pill sm" type="button" id="copyFile">Copy</button><button class="btn soft pill sm" type="button" data-toast="On the robot's Wi-Fi, open OnBot Java and paste this into a new file in the TeamCode folder.">${icon('arrow', 'i sm')}OnBot Java</button></span></div>
      <div class="callout" style="background:var(--raised);color:var(--text)">${icon('book')}<div><b>What this file does:</b> ${f.about}</div></div>
      ${codeBlock(f.src, f.lang || 'java')}`;
    $$('#tree [data-file]').forEach((b) => b.setAttribute('aria-current', String(b.dataset.file === cur)));
    $('#copyFile').addEventListener('click', () => copyText(f.src, ctx.toast));
  };
  draw();
  view.addEventListener('click', (e) => {
    const b = e.target.closest('[data-file]');
    if (!b) return;
    cur = b.dataset.file; ctx.state.file = cur; draw();
  });
}

// ================================================================= Snippets
const SNIPS = [
  { t: 'Robot-centric mecanum drive', lvl: 'Start here', mode: 'robot', d: 'The drive code in our TeleOp. Up on the stick means "the way the robot faces".', src: `double drive = -gamepad1.left_stick_y;   // up is negative on the stick
double strafe = gamepad1.left_stick_x * 1.1;
double turn = gamepad1.right_stick_x;

// Scale down so no wheel goes past full power.
double max = Math.max(1.0, Math.abs(drive) + Math.abs(strafe) + Math.abs(turn));
frontLeft.setPower((drive + strafe + turn) / max);
backLeft.setPower((drive - strafe + turn) / max);
frontRight.setPower((drive - strafe - turn) / max);
backRight.setPower((drive + strafe - turn) / max);` },
  { t: 'Field-centric drive', lvl: 'Next step', mode: 'field', d: 'Up on the stick always means up the field, whichever way the robot faces. It uses the IMU heading.', src: `double heading = imu.getRobotYawPitchRollAngles().getYaw(AngleUnit.RADIANS);
double y = -gamepad1.left_stick_y;   // up the field
double x = gamepad1.left_stick_x;    // across the field
double turn = gamepad1.right_stick_x;

// Turn the stick direction by the robot's heading.
double strafe = x * Math.cos(-heading) - y * Math.sin(-heading);
double drive = x * Math.sin(-heading) + y * Math.cos(-heading);

if (gamepad1.options) imu.resetYaw();   // face up the field, then press` },
  { t: 'Slow mode toggle', lvl: 'Start here', mode: 'slow', d: 'Press once for slow, press again for fast. The trick is acting on the press, not while it is held.', src: `boolean slow = false;
boolean lastBumper = false;

// inside the loop:
if (gamepad1.right_bumper && !lastBumper) slow = !slow;
lastBumper = gamepad1.right_bumper;

double scale = slow ? 0.4 : 1.0;
frontLeft.setPower(scale * (drive + strafe + turn) / max);` },
  { t: 'Telemetry you can read', lvl: 'Start here', mode: 'telemetry', d: 'Labels, units and only a few lines. Telemetry is how the robot tells you what it thinks.', src: `telemetry.addData("Heading", "%.0f°", Math.toDegrees(heading));
telemetry.addData("Wheels", "FL %.2f  FR %.2f  BL %.2f  BR %.2f", fl, fr, bl, br);
telemetry.addData("Slow mode", slow);
telemetry.update();   // nothing shows without this` },
  { t: 'Go to the nearest pollen', lvl: 'Challenge', mode: 'auto', d: 'An autonomous idea: turn toward the target, drive, slow down when close. The pose comes from odometry.', src: `double dx = target.x - pose.x, dy = target.y - pose.y;
double error = AngleUnit.normalizeRadians(Math.atan2(dy, dx) - pose.heading);

// Turn toward it, and only drive once you're facing it.
double turn = Range.clip(-error * 2.2, -1, 1);
double drive = Math.abs(error) < 0.6
        ? Range.clip(Math.hypot(dx, dy) * 1.6, 0.25, 0.85)
        : 0.1;` },
];
function snippets(view, ctx) {
  view.innerHTML = `<div class="zv">
    ${strip('Small pieces of robot code you can copy into OnBot Java. Want to see code run first? Try the missions in the BioBuzz XR Code Lab.', [tag(`${SNIPS.length} snippets`)])}
    <div class="snips">${SNIPS.map((s, i) => `<article class="snip">
      <div class="row between"><h4>${s.t}</h4><span class="tag${s.lvl === 'Challenge' ? ' dark' : ''}">${s.lvl}</span></div>
      <p class="lead" style="font-size:13px;line-height:19px">${s.d}</p>
      ${codeBlock(s.src)}
      <div class="row wrap"><button class="btn primary pill sm" type="button" data-copy="${i}">Copy</button></div>
    </article>`).join('')}</div>
    <article class="card">
      <div class="row wrap"><span class="oc2 volt">${icon('plus', 'i sm')}</span><div class="grow"><div style="font:500 15px/20px Inter,sans-serif">Made something useful?</div><div class="cap" style="font-weight:400">Show it to a mentor. They check each one before it shows up here.</div></div><button class="btn soft pill" type="button" data-toast="Show it to a mentor at the next meeting. They check it and add it here.">Add a snippet</button></div>
    </article>
  </div>`;
  view.addEventListener('click', (e) => {
    const c = e.target.closest('[data-copy]');
    if (c) copyText(SNIPS[+c.dataset.copy].src, ctx.toast);
  });
}

// ================================================================= Challenges
// challenge (mentor): { title, brief, checks: [text], points, due: 'YYYY-MM-DD' }
// submission (student): { challenge: id, notes, link, accepted, points }. Ticks live in the person's progress record.
const isoDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dueLabel = (iso) => { const [y, m, d] = String(iso || '').split('-').map(Number); if (!y) return 'No due date'; return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); };
const multiline = (t) => esc(t || '').replace(/\n/g, '<br>');
const safeLink = (u) => (/^https?:\/\/[^\s]+$/i.test(u || '') ? u : '');

function challenges(view, ctx) {
  const mentor = isMentor(), meId = session.user?.id;
  let chs = [], subs = [], ticks = {}, loaded = false, dead = false, sel = ctx.state.challenge || null;
  view.innerHTML = `<div class="zv">
    ${strip('A small coding challenge, sized for one meeting. Tick each check, send in your work, and a mentor accepts it for points.', [tag('Points for accepted work')], mentor ? `<button class="btn primary pill" type="button" id="newCh">${icon('plus', 'i sm')}New challenge</button>` : '')}
    ${mentor ? '<article class="card" id="chForm" hidden></article>' : ''}
    <article class="card c7 stretch" id="chNow"><div class="live-empty">Loading challenges…</div></article>
    <article class="card c5 stretch">
      <div class="card-head"><h3 class="card-title">Season points</h3><span class="tag">Team</span></div>
      <ol class="lb" id="pts"></ol>
      <p class="cap" style="font-weight:400">Each accepted challenge earns its points.</p>
    </article>
    ${mentor ? `<article class="card" id="reviewCard">
      <div class="card-head"><span class="oc2 volt">${icon('check', 'i sm')}</span><h3 class="card-title">Submissions to review</h3><span class="tag" id="revN"></span></div>
      <div class="items" id="review"></div>
    </article>` : ''}
    <article class="card c6">
      <div class="card-head"><span class="oc2">${icon('gamepad', 'i sm')}</span><h3 class="card-title">Warm up in BioBuzz XR</h3><span class="tag">Any time</span></div>
      <p>Stuck, or done early? Driver Academy has six timed drills and Code Lab has seven Java missions. Both run in the browser.</p>
      <div class="row wrap">${xrLink('academy.html', 'Driver Academy', 'soft')}${xrLink('code.html', 'Code Lab', 'ghost')}</div>
    </article>
    <article class="card c6">
      <div class="card-head"><h3 class="card-title">Past challenges</h3></div>
      <div class="items" id="past"></div>
    </article>
  </div>`;

  const today = () => isoDay();
  const open = () => chs.filter((c) => !c.data?.due || c.data.due >= today()).sort((a, b) => String(a.data.due || '9').localeCompare(String(b.data.due || '9')));
  const past = () => chs.filter((c) => c.data?.due && c.data.due < today()).sort((a, b) => b.data.due.localeCompare(a.data.due));
  const subsFor = (cid) => subs.filter((s) => s.data?.challenge === cid);
  const accepted = (cid) => subsFor(cid).filter((s) => s.data?.accepted);
  const mySub = (cid) => subs.find((s) => s.data?.challenge === cid && s.user_id === meId) || null;
  const chById = (id) => chs.find((c) => c.id === id);

  const drawNow = () => {
    const el = $('#chNow', view);
    const list = open();
    if (!list.length) {
      el.innerHTML = `<div class="card-head"><span class="oc2 volt">${icon('trophy', 'i sm')}</span><h3 class="card-title">This week</h3></div>
        <div class="live-empty">${mentor ? 'No open challenge yet. Make one with "New challenge" and the team sees it right away.' : 'No challenge right now. A mentor posts the next one soon. Try a BioBuzz XR drill or a snippet meanwhile.'}</div>`;
      return;
    }
    if (!list.some((c) => c.id === sel)) sel = list[0].id;
    const c = list.find((x) => x.id === sel), d = c.data || {};
    const checks = Array.isArray(d.checks) ? d.checks : [];
    const t = new Set(ticks[c.id] || []);
    const sub = mySub(c.id), acc = accepted(c.id);
    const allTicked = checks.every((_, i) => t.has(i));
    el.innerHTML = `${list.length > 1 ? `<div class="chips lv-chips" role="tablist" aria-label="Open challenges">${list.map((x) => `<button class="chip" type="button" data-sel="${esc(x.id)}" aria-pressed="${x.id === c.id}">${esc(x.data.title || 'Challenge')}</button>`).join('')}</div>` : ''}
      <div class="card-head lv-wrap"><span class="oc2 volt">${icon('trophy', 'i sm')}</span><h3 class="card-title">${esc(d.title || 'Challenge')}</h3><span class="tag">Due ${dueLabel(d.due)}</span></div>
      ${d.brief ? `<p>${multiline(d.brief)}</p>` : ''}
      <div class="row wrap"><span class="st">${Number(d.points) || 0} points</span><span class="st">${acc.length ? avStack(acc.map((s) => s.author).slice(0, 5), 20) : ''}${acc.length} finished</span>${mentor ? `<span class="row" style="margin-left:auto;gap:6px"><button class="btn ghost pill sm" type="button" data-edit="${esc(c.id)}">Edit</button><button class="btn ghost pill sm" type="button" data-del="${esc(c.id)}">Delete</button></span>` : ''}</div>
      ${checks.length ? `<h4 class="sub">Check your work</h4>
      <div class="pack" id="checks">${checks.map((x, i) => `<button class="tick" type="button" role="checkbox" data-tick="${i}" aria-checked="${t.has(i)}"${sub ? ' disabled' : ''}><span class="bx">${icon('check')}</span><span>${esc(x)}</span></button>`).join('')}</div>` : ''}
      <div id="subBox">${sub ? subStatus(sub, d) : mentor ? '<p class="cap" style="font-weight:400">Students tick the checks and send their work here. You review it below.</p>' : `
        <div class="form-grid lv-form">
          <label class="field full"><span>What did you do? (optional)</span><textarea class="inp" id="subNotes" maxlength="1000" placeholder="I used a lastA variable so holding A doesn't flicker."></textarea></label>
          <label class="field full"><span>Link (optional)</span><input class="inp" id="subLink" type="url" maxlength="300" placeholder="https://… (a GitHub file or a video of the robot)"><small>No photos of faces, and nothing with your real name.</small></label>
        </div>
        <div class="card-foot" style="flex-wrap:wrap"><button class="btn ghost pill" type="button" data-goto="code|Snippets">${icon('bulb', 'i sm')}Need a hint? See Snippets</button><button class="btn primary pill" type="button" id="submitCh"${allTicked ? '' : ' disabled'}>${allTicked ? 'Submit for review' : `${t.size} of ${checks.length} checked`}</button></div>`}</div>`;
  };
  const subStatus = (sub, d) => `<div class="verdict${sub.data.accepted ? ' good' : ''}">${icon(sub.data.accepted ? 'check' : 'clock')}<div><b>${sub.data.accepted ? `Accepted. +${Number(sub.data.points ?? d.points) || 0} points` : 'Submitted. A mentor reviews it soon.'}</b>${sub.data.notes ? `<br>${esc(sub.data.notes)}` : ''}${safeLink(sub.data.link) ? ` <a href="${esc(safeLink(sub.data.link))}" target="_blank" rel="noopener noreferrer">Your link</a>` : ''}</div></div>
    ${sub.data.accepted ? '' : `<div class="card-foot"><span class="cap">Want to change it?</span><button class="btn ghost pill sm" type="button" data-unsub="${esc(sub.id)}">Take it back</button></div>`}`;

  const drawPoints = () => {
    const tally = new Map();
    const add = (uid, name, n) => { const r = tally.get(uid) || { name, n: 0 }; r.n += n; tally.set(uid, r); };
    for (const s of subs) if (s.data?.accepted && chById(s.data.challenge)) add(s.user_id, s.author, Number(s.data.points ?? chById(s.data.challenge)?.data?.points) || 0);
    const rows = [...tally.entries()].filter(([, r]) => r.n > 0).sort((a, b) => b[1].n - a[1].n);
    $('#pts', view).innerHTML = rows.length ? rows.map(([uid, r], i) => `<li class="${uid === meId ? 'me' : ''}"><span class="r">${i + 1}</span>${av(r.name, 28)}<span>${esc(r.name)}${uid === meId ? ' (you)' : ''}</span><span class="sc">${r.n}</span></li>`).join('')
      : '<li class="lv-lbempty">No points yet. The first accepted challenge puts someone on the board.</li>';
  };
  const drawPast = () => {
    const list = past();
    $('#past', view).innerHTML = list.length ? list.map((c) => {
      const acc = accepted(c.id), mine = mySub(c.id);
      return `<div class="it"><span class="oc2${mine?.data?.accepted ? ' solid' : ''}">${icon('flag', 'i sm')}</span><div class="grow"><div class="t">${esc(c.data.title || 'Challenge')}</div><div class="meta cap" style="font-weight:400">Due ${dueLabel(c.data.due)} · ${Number(c.data.points) || 0} points · ${acc.length} finished${mine ? (mine.data.accepted ? ' · you finished it' : ' · yours is waiting') : ''}</div></div><span class="end">${acc.length ? avStack(acc.map((s) => s.author).slice(0, 4), 22) : ''}${mentor ? `<button class="btn ghost pill sm" type="button" data-del="${esc(c.id)}">Delete</button>` : ''}</span></div>`;
    }).join('') : '<div class="live-empty">Finished challenges show up here after their due date.</div>';
  };
  const drawReview = () => {
    if (!mentor) return;
    const list = [...subs].sort((a, b) => Number(!!a.data?.accepted) - Number(!!b.data?.accepted));
    const waiting = subs.filter((s) => !s.data?.accepted).length;
    $('#revN', view).textContent = `${waiting} waiting`;
    $('#review', view).innerHTML = list.length ? list.map((s) => {
      const c = chById(s.data?.challenge), link = safeLink(s.data?.link);
      return `<div class="it lv-sug">${av(s.author, 28)}<div class="grow"><div class="t">${esc(s.author)} · ${esc(c?.data?.title || 'A deleted challenge')}</div>${s.data?.notes ? `<div class="meta cap" style="font-weight:400">${esc(s.data.notes)}</div>` : ''}${link ? `<div class="meta cap"><a href="${esc(link)}" target="_blank" rel="noopener noreferrer">${esc(link.length > 60 ? `${link.slice(0, 57)}…` : link)}</a></div>` : ''}</div>
        <span class="end lv-wrap">${s.data?.accepted ? `<span class="st volt">${icon('check', 'i sm')}+${Number(s.data.points) || 0}</span><button class="btn ghost pill sm" type="button" data-acc="${esc(s.id)}">Undo</button>` : `<button class="btn primary pill sm" type="button" data-acc="${esc(s.id)}">Accept${c ? ` · ${Number(c.data.points) || 0}` : ''}</button>`}</span></div>`;
    }).join('') : '<div class="live-empty">Nothing to review yet. Submissions show up here as soon as someone sends one.</div>';
  };
  const drawAll = () => { drawNow(); drawPoints(); drawPast(); drawReview(); };

  Promise.all([api.list('challenge'), api.list('submission'), myProgress()]).then(([c, s, prog]) => {
    if (dead) return;
    chs = c; subs = s; ticks = { ...(prog?.data?.ticks || {}) }; loaded = true;
    drawAll();
  }).catch((err) => { if (!dead) { $('#chNow', view).innerHTML = `<div class="live-empty">Could not load challenges. ${esc(err.message)}</div>`; ctx.toast(err.message); } });

  // ---- Mentor: new or edit challenge
  const form = (rec) => {
    const f = $('#chForm', view);
    if (!f) return;
    const d = rec?.data || {};
    const due = d.due || isoDay(new Date(Date.now() + 6 * 864e5));
    f.hidden = false;
    f.innerHTML = `<div class="card-head"><h3 class="card-title">${rec ? 'Edit challenge' : 'New challenge'}</h3><button class="icon-btn sm" type="button" id="chX" aria-label="Close" style="margin-left:auto">${icon('x')}</button></div>
      <div class="form-grid">
        <label class="field full"><span>Title</span><input class="inp" id="chT" maxlength="80" placeholder="Toggle the intake" value="${esc(d.title || '')}"></label>
        <label class="field full"><span>The brief</span><textarea class="inp" id="chB" maxlength="1200" placeholder="Right now the intake only runs while you hold the trigger. Make A a toggle.">${esc(d.brief || '')}</textarea></label>
        <label class="field full"><span>Checks, one per line</span><textarea class="inp" id="chC" maxlength="1500" placeholder="Press A once to start, again to stop&#10;Telemetry shows Intake: on or off">${esc((d.checks || []).join('\n'))}</textarea></label>
        <label class="field"><span>Points</span><input class="inp" id="chP" type="number" min="0" max="50" value="${Number(d.points ?? 5)}"></label>
        <label class="field"><span>Due</span><input class="inp" id="chD" type="date" value="${esc(due)}"></label>
      </div>
      <div class="card-foot"><span class="cap">The whole team sees it right away.</span><button class="btn primary pill" type="button" id="chSave">${rec ? 'Save changes' : 'Post challenge'}</button></div>`;
    $('#chX', f).addEventListener('click', () => { f.hidden = true; });
    $('#chT', f).focus();
    f.scrollIntoView({ behavior: ctx.reduced ? 'auto' : 'smooth', block: 'start' });
    $('#chSave', f).addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const data = {
        title: $('#chT', f).value.trim(), brief: $('#chB', f).value.trim(),
        checks: $('#chC', f).value.split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 12),
        points: clamp(Math.round(Number($('#chP', f).value) || 0), 0, 50), due: $('#chD', f).value,
      };
      if (!data.title) { ctx.toast('Give the challenge a title.'); $('#chT', f).focus(); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.due)) { ctx.toast('Pick a due date.'); $('#chD', f).focus(); return; }
      btn.disabled = true;
      try {
        if (rec) { const r = await api.update('challenge', rec.id, data); rec.data = r.data; }
        else { const r = await api.create('challenge', data); chs.unshift({ ...r, author: me() }); sel = r.id; }
        f.hidden = true; drawAll();
        ctx.toast(rec ? 'Challenge saved.' : 'Challenge posted.');
      } catch (err) { ctx.toast(err.message); btn.disabled = false; }
    });
  };
  const nb = $('#newCh', view);
  if (nb) nb.addEventListener('click', () => form(null));

  view.addEventListener('click', async (e) => {
    if (!loaded) return;
    const s = e.target.closest('[data-sel]');
    if (s) { sel = s.dataset.sel; ctx.state.challenge = sel; drawNow(); return; }
    const t = e.target.closest('[data-tick]');
    if (t && !t.disabled) {
      const i = +t.dataset.tick, cur = new Set(ticks[sel] || []);
      if (cur.has(i)) cur.delete(i); else cur.add(i);
      const prev = ticks;
      ticks = { ...ticks, [sel]: [...cur].sort((a, b) => a - b) };
      const notes = $('#subNotes', view)?.value, link = $('#subLink', view)?.value;
      drawNow();
      if (notes != null && $('#subNotes', view)) { $('#subNotes', view).value = notes; $('#subLink', view).value = link; }
      $(`[data-tick="${i}"]`, view)?.focus({ preventScroll: true });
      try { await saveProgress({ ticks }); } catch (err) { ticks = prev; drawNow(); ctx.toast(err.message); }
      return;
    }
    if (e.target.closest('#submitCh')) {
      const btn = e.target.closest('#submitCh');
      const c = chById(sel); if (!c || mySub(c.id)) return;
      const link = $('#subLink', view).value.trim();
      if (link && !safeLink(link)) { ctx.toast('Links need to start with https://'); $('#subLink', view).focus(); return; }
      btn.disabled = true;
      try {
        const r = await api.create('submission', { challenge: c.id, notes: $('#subNotes', view).value.trim(), link, accepted: false });
        subs.unshift({ ...r, author: me() });
        drawAll();
        ctx.toast('Submitted. A mentor reviews it soon.');
      } catch (err) { ctx.toast(err.message); btn.disabled = false; }
      return;
    }
    const un = e.target.closest('[data-unsub]');
    if (un) {
      try { await api.remove('submission', un.dataset.unsub); subs = subs.filter((x) => x.id !== un.dataset.unsub); drawAll(); ctx.toast('Taken back. You can change it and send it again.'); }
      catch (err) { ctx.toast(err.message); }
      return;
    }
    const a = e.target.closest('[data-acc]');
    if (a && mentor) {
      const sub = subs.find((x) => x.id === a.dataset.acc); if (!sub) return;
      const on = !sub.data.accepted, pts = Number(chById(sub.data.challenge)?.data?.points) || 0;
      a.disabled = true;
      try { const r = await api.update('submission', sub.id, { accepted: on, points: on ? pts : 0 }); sub.data = r.data; drawAll(); ctx.toast(on ? `Accepted. ${sub.author} gets ${pts} points.` : 'Accept undone.'); }
      catch (err) { ctx.toast(err.message); a.disabled = false; }
      return;
    }
    const ed = e.target.closest('[data-edit]');
    if (ed && mentor) { form(chById(ed.dataset.edit)); return; }
    const del = e.target.closest('[data-del]');
    if (del && mentor) {
      const c = chById(del.dataset.del); if (!c) return;
      if (!confirm(`Delete "${c.data.title}"? Its submissions stay, but they will not count for points.`)) return;
      try { await api.remove('challenge', c.id); chs = chs.filter((x) => x.id !== c.id); drawAll(); ctx.toast('Challenge deleted.'); }
      catch (err) { ctx.toast(err.message); }
    }
  });
  return () => { dead = true; };
}

export const CODE = { 'BioBuzz XR': biobuzzXr, 'Our code': ourcode, Snippets: snippets, Challenges: challenges };
