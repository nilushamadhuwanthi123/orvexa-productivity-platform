/**
 * Seeds a realistic demo workspace.
 *
 * Safety: this script only removes documents it previously created (matched by
 * the demo email domain / seeded project keys). It never drops the database or
 * a collection, so existing data is preserved.
 *
 *   npm run seed
 */
import mongoose from 'mongoose';
import configureDns from '../config/dns.js';
import env from '../config/env.js';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';
import Comment from '../models/Comment.js';
import Milestone from '../models/Milestone.js';
import Goal from '../models/Goal.js';
import TimeEntry from '../models/TimeEntry.js';
import Notification from '../models/Notification.js';
import Activity from '../models/Activity.js';

const DEMO_DOMAIN = 'orvexa.demo';
const DEMO_PASSWORD = 'Orvexa#2026';

const daysFromNow = (n) => new Date(Date.now() + n * 86400000);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const PEOPLE = [
  { name: 'Nilusha Madhuwanthi', role: 'admin', jobTitle: 'Full-Stack Engineer', department: 'Engineering', skills: ['React', 'Node.js', 'MongoDB', 'Socket.IO'], location: 'Colombo, LK' },
  { name: 'Dinuka Perera', role: 'manager', jobTitle: 'Engineering Manager', department: 'Engineering', skills: ['Architecture', 'Mentoring'], location: 'Kandy, LK' },
  { name: 'Sanduni Rathnayake', role: 'employee', jobTitle: 'Frontend Engineer', department: 'Engineering', skills: ['React', 'CSS', 'Accessibility'], location: 'Galle, LK' },
  { name: 'Kavindu Silva', role: 'employee', jobTitle: 'Backend Engineer', department: 'Engineering', skills: ['Express', 'MongoDB', 'Testing'], location: 'Colombo, LK' },
  { name: 'Amaya Fernando', role: 'employee', jobTitle: 'Product Designer', department: 'Design', skills: ['Figma', 'Design Systems'], location: 'Negombo, LK' },
  { name: 'Ravindu Jayasuriya', role: 'manager', jobTitle: 'Product Manager', department: 'Product', skills: ['Roadmapping', 'Analytics'], location: 'Colombo, LK' },
];

const PROJECTS = [
  {
    key: 'PLAT',
    name: 'Platform Core Rebuild',
    description:
      'Rebuild the core platform services on a modular architecture with clean API boundaries, improved observability and a migration path that avoids downtime.',
    status: 'active',
    priority: 'critical',
    color: 'emerald',
    tags: ['backend', 'architecture', 'q3'],
    deadlineDays: 34,
    milestones: ['MVP', 'Beta', 'Production'],
  },
  {
    key: 'DSGN',
    name: 'Design System 2.0',
    description:
      'A single source of truth for Orvexa UI: tokens, component API, accessibility baselines and documentation the whole team can build against.',
    status: 'active',
    priority: 'high',
    color: 'champagne',
    tags: ['design', 'frontend'],
    deadlineDays: 21,
    milestones: ['Foundations', 'Components', 'Docs'],
  },
  {
    key: 'ANLY',
    name: 'Insights & Analytics',
    description:
      'Turn raw activity into decisions: aggregation pipelines, productivity trends and project health signals surfaced where people already work.',
    status: 'active',
    priority: 'high',
    color: 'cobalt',
    tags: ['analytics', 'data'],
    deadlineDays: 48,
    milestones: ['Data model', 'Dashboards'],
  },
  {
    key: 'MOBL',
    name: 'Mobile Companion',
    description:
      'A focused mobile experience for reviewing work, responding to mentions and updating task status on the move.',
    status: 'planning',
    priority: 'medium',
    color: 'teal',
    tags: ['mobile', 'discovery'],
    deadlineDays: 76,
    milestones: ['Discovery', 'Prototype'],
  },
  {
    key: 'ONBD',
    name: 'Customer Onboarding Revamp',
    description:
      'Reduce time-to-first-value for new workspaces with guided setup, sample data and clearer empty states.',
    status: 'on_hold',
    priority: 'medium',
    color: 'burgundy',
    tags: ['growth', 'ux'],
    deadlineDays: 12,
    milestones: ['Research', 'Launch'],
  },
];

const TASK_TITLES = {
  PLAT: [
    'Design service boundaries and module map', 'Extract authentication into its own module', 'Introduce request validation layer',
    'Add structured logging with correlation ids', 'Write migration plan for legacy records', 'Set up integration test harness',
    'Benchmark aggregation query performance', 'Add graceful shutdown handling', 'Document API error contract',
    'Introduce rate limiting on public endpoints', 'Cache hot project queries', 'Audit index coverage on task collection',
  ],
  DSGN: [
    'Define color tokens for light and dark themes', 'Audit contrast ratios against WCAG AA', 'Build Button component API',
    'Build Card and Surface primitives', 'Specify focus and keyboard states', 'Document spacing and radius scale',
    'Create chart palette guidance', 'Reduced-motion behaviour for transitions', 'Ship icon set and sizing rules',
  ],
  ANLY: [
    'Model daily completion rollups', 'Design project health scoring rules', 'Build productivity trend endpoint',
    'Streak calculation from completion history', 'Weekday productivity breakdown', 'Empty-state guidance for new workspaces',
    'Validate KPI numbers against raw data', 'Add 7/30/90 day window switching',
  ],
  MOBL: [
    'Interview five users about mobile needs', 'Map the three highest-value mobile flows', 'Prototype task detail on small screens',
    'Evaluate offline behaviour requirements', 'Decide navigation pattern',
  ],
  ONBD: [
    'Map current onboarding drop-off points', 'Draft guided setup copy', 'Design sample workspace content',
    'Define success metric for activation',
  ],
};

const COMMENTS = [
  'Picked this up — should have something reviewable by tomorrow.',
  'Blocked on the schema decision, moving to review once that lands.',
  'Nice catch. I updated the acceptance criteria to cover the edge case.',
  'I benchmarked this locally: about 40% faster than the previous approach.',
  'Can we split this into two? The second half is a separate concern.',
  'Left a few notes in the doc, otherwise this looks ready to ship.',
  'Confirmed working on mobile Safari as well.',
  'Rolling this back for now, it regressed the deadline view.',
];

async function run() {
  // Must run before any MongoDB connection: Atlas `mongodb+srv://` URIs need an
  // SRV lookup, and some networks' default resolvers refuse SRV queries.
  configureDns();

  console.log(`\n[seed] connecting to ${env.mongoUri.replace(/:\/\/[^@]+@/, '://***@')}`);
  await connectDB();

  // --- clean up only previously seeded demo data ---
  const oldUsers = await User.find({ email: { $regex: `@${DEMO_DOMAIN}$` } }).select('_id');
  const oldUserIds = oldUsers.map((u) => u._id);
  const oldProjects = await Project.find({ key: { $in: PROJECTS.map((p) => p.key) } }).select('_id');
  const oldProjectIds = oldProjects.map((p) => p._id);

  if (oldUserIds.length || oldProjectIds.length) {
    console.log('[seed] removing previous demo data (existing non-demo data is untouched)');
    await Promise.all([
      Task.deleteMany({ project: { $in: oldProjectIds } }),
      Comment.deleteMany({ project: { $in: oldProjectIds } }),
      Milestone.deleteMany({ project: { $in: oldProjectIds } }),
      TimeEntry.deleteMany({ project: { $in: oldProjectIds } }),
      Goal.deleteMany({ owner: { $in: oldUserIds } }),
      Notification.deleteMany({ recipient: { $in: oldUserIds } }),
      Activity.deleteMany({ project: { $in: oldProjectIds } }),
      Project.deleteMany({ _id: { $in: oldProjectIds } }),
      User.deleteMany({ _id: { $in: oldUserIds } }),
    ]);
  }

  // --- users ---
  const users = [];
  for (const p of PEOPLE) {
    const email = `${p.name.split(' ')[0].toLowerCase()}@${DEMO_DOMAIN}`;
    const user = await User.create({
      ...p,
      email,
      password: DEMO_PASSWORD,
      onboardingCompleted: true,
      weeklyTaskGoal: randInt(12, 25),
      availability: pick(['available', 'available', 'busy', 'away']),
      lastActiveAt: new Date(Date.now() - randInt(0, 4) * 3600000),
    });
    users.push(user);
  }
  const [nilusha, dinuka] = users;
  console.log(`[seed] created ${users.length} users`);

  // --- projects, milestones, tasks ---
  let taskCount = 0;
  let commentCount = 0;

  for (const spec of PROJECTS) {
    const owner = pick([nilusha, dinuka]);
    const memberPool = users.filter((u) => String(u._id) !== String(owner._id));
    const members = memberPool.slice(0, randInt(3, memberPool.length));

    const project = await Project.create({
      name: spec.name,
      key: spec.key,
      description: spec.description,
      owner: owner._id,
      status: spec.status,
      priority: spec.priority,
      color: spec.color,
      tags: spec.tags,
      startDate: daysFromNow(-randInt(30, 90)),
      deadline: daysFromNow(spec.deadlineDays),
      members: [
        { user: owner._id, projectRole: 'owner' },
        ...members.map((m) => ({ user: m._id, projectRole: m.role === 'manager' ? 'manager' : 'contributor' })),
      ],
    });

    const milestones = [];
    for (let i = 0; i < spec.milestones.length; i += 1) {
      milestones.push(
        await Milestone.create({
          name: spec.milestones[i],
          project: project._id,
          dueDate: daysFromNow(Math.round((spec.deadlineDays / spec.milestones.length) * (i + 1))),
          status: i === 0 ? 'in_progress' : 'upcoming',
        })
      );
    }

    const titles = TASK_TITLES[spec.key];
    const assignable = [owner, ...members];

    for (let i = 0; i < titles.length; i += 1) {
      // Weighted so boards look like real work in flight, not evenly spread.
      const status = pick([
        'done', 'done', 'done', 'done',
        'in_progress', 'in_progress',
        'todo', 'todo', 'todo',
        'in_review',
        'backlog',
      ]);
      const assignee = pick(assignable);
      const createdAt = daysFromNow(-randInt(3, 60));
      const completedAt = status === 'done' ? daysFromNow(-randInt(0, 25)) : null;

      const task = await Task.create({
        title: titles[i],
        description:
          'Acceptance criteria:\n' +
          '- The change is covered by the existing test suite\n' +
          '- Behaviour is documented for the team\n' +
          '- No regression in the related dashboard metrics',
        project: project._id,
        assignee: assignee._id,
        reporter: owner._id,
        status,
        priority: pick(['low', 'medium', 'medium', 'high', 'high', 'critical']),
        dueDate: daysFromNow(randInt(-10, 30)),
        labels: spec.tags.slice(0, randInt(1, 2)),
        milestone: pick(milestones)._id,
        estimatedHours: randInt(2, 16),
        order: i,
        checklist: Array.from({ length: randInt(0, 4) }, (_, n) => ({
          text: ['Write the implementation', 'Add tests', 'Update docs', 'Request review'][n],
          done: Math.random() > 0.45,
        })),
        createdAt,
      });

      if (completedAt) {
        task.completedAt = completedAt;
        await task.save({ timestamps: false });
      }
      taskCount += 1;

      // dependencies between consecutive tasks make the timeline meaningful
      if (i > 0 && Math.random() > 0.75) {
        const prev = await Task.findOne({ project: project._id, order: i - 1 }).select('_id');
        if (prev) {
          task.dependsOn = [prev._id];
          await task.save({ timestamps: false });
        }
      }

      // comments + real tracked time on a subset of tasks
      if (Math.random() > 0.5) {
        const n = randInt(1, 3);
        for (let c = 0; c < n; c += 1) {
          await Comment.create({
            body: pick(COMMENTS),
            task: task._id,
            project: project._id,
            author: pick(assignable)._id,
          });
          commentCount += 1;
        }
        await Task.updateOne({ _id: task._id }, { $set: { commentCount: n } });
      }

      if (status !== 'backlog' && Math.random() > 0.4) {
        const minutes = randInt(25, 240);
        const startedAt = daysFromNow(-randInt(1, 20));
        await TimeEntry.create({
          user: assignee._id,
          task: task._id,
          project: project._id,
          startedAt,
          endedAt: new Date(startedAt.getTime() + minutes * 60000),
          durationSeconds: minutes * 60,
          source: pick(['timer', 'manual']),
        });
        await Task.updateOne(
          { _id: task._id },
          { $inc: { actualHours: Math.round((minutes / 60) * 100) / 100 } }
        );
      }

      await Activity.create({
        actor: owner._id,
        action: 'task.created',
        entityType: 'task',
        entityId: task._id,
        entityLabel: task.title,
        project: project._id,
      });
    }

    await Activity.create({
      actor: owner._id,
      action: 'project.created',
      entityType: 'project',
      entityId: project._id,
      entityLabel: project.name,
      project: project._id,
    });

    console.log(`[seed] ${spec.key}  ${project.name} — ${titles.length} tasks`);
  }

  // --- goals ---
  for (const user of users.slice(0, 4)) {
    await Goal.create({
      title: 'Weekly task goal',
      owner: user._id,
      metric: 'task_count',
      target: user.weeklyTaskGoal,
      period: 'weekly',
      startDate: daysFromNow(-7),
      deadline: daysFromNow(0),
    });
  }
  await Goal.create({
    title: 'Complete the analytics module',
    owner: nilusha._id,
    metric: 'manual',
    target: 100,
    current: 72,
    period: 'monthly',
    deadline: daysFromNow(18),
  });

  // --- a few notifications for the primary demo account ---
  await Notification.insertMany([
    {
      recipient: nilusha._id,
      actor: dinuka._id,
      type: 'mention',
      title: 'Dinuka Perera mentioned you',
      body: 'Can you take a look at the aggregation query before we merge?',
      link: '/dashboard',
      entity: { kind: 'task' },
    },
    {
      recipient: nilusha._id,
      actor: users[2]._id,
      type: 'task_assigned',
      title: 'Sanduni assigned you a task',
      body: 'Audit contrast ratios against WCAG AA',
      link: '/my-work',
      entity: { kind: 'task' },
    },
  ]);

  console.log(`\n[seed] done — ${users.length} users, ${PROJECTS.length} projects, ${taskCount} tasks, ${commentCount} comments`);
  console.log(`\n  Sign in with any of these:`);
  for (const u of users) console.log(`    ${u.email.padEnd(34)} ${DEMO_PASSWORD}   (${u.role})`);
  console.log('');

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(async (err) => {
  console.error('[seed] failed:', err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
