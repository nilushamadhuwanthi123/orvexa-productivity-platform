/**
 * Task lifecycle, Kanban ordering and derived analytics.
 *
 *   MONGODB_URI_TEST="mongodb://127.0.0.1:27017/orvexa_test" npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import http from 'node:http';

const TEST_URI = process.env.MONGODB_URI_TEST;

if (!TEST_URI) {
  test('task suite', { skip: 'MONGODB_URI_TEST is not set' }, () => {});
} else {
  process.env.MONGODB_URI = TEST_URI;
  process.env.JWT_SECRET ||= 'test_secret_value_for_local_test_runs_only_0123456789';
  process.env.JWT_REFRESH_SECRET ||= 'test_refresh_secret_for_local_test_runs_only_9876543210';
  process.env.NODE_ENV = 'test';

  const { default: app } = await import('../src/app.js');
  const { default: User } = await import('../src/models/User.js');
  const { default: Project } = await import('../src/models/Project.js');
  const { default: Task } = await import('../src/models/Task.js');
  const { computeProjectHealth } = await import('../src/services/analytics.service.js');

  await mongoose.connect(TEST_URI);
  const server = http.createServer(app).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;

  const api = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: res.status, body: await res.json().catch(() => null) };
  };

  const unique = (p) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const email = `${unique('tasks')}@orvexa.test`;
  await api('/api/auth/register', {
    method: 'POST',
    body: { name: 'Task Owner', email, password: 'TestPass123' },
  });
  await User.updateOne({ email }, { $set: { role: 'manager' } });
  const login = await api('/api/auth/login', {
    method: 'POST',
    body: { email, password: 'TestPass123' },
  });
  const token = login.body.data.accessToken;

  const project = (
    await api('/api/projects', {
      method: 'POST',
      token,
      body: { name: '__test__ task lifecycle' },
    })
  ).body.data.project;

  test.after(async () => {
    await Promise.all([
      Task.deleteMany({ project: project._id }),
      Project.deleteMany({ name: /^__test__/ }),
      User.deleteMany({ email: /@orvexa\.test$/ }),
    ]);
    server.close();
    await mongoose.disconnect();
  });

  test('a task is created with the caller as reporter', async () => {
    const res = await api('/api/tasks', {
      method: 'POST',
      token,
      body: { title: '__test__ first task', project: project._id, priority: 'high' },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.data.task.priority, 'high');
    assert.equal(res.body.data.task.reporter.email, email);
    assert.equal(res.body.data.task.status, 'todo');
  });

  test('an invalid title is rejected with a field-level message', async () => {
    const res = await api('/api/tasks', {
      method: 'POST',
      token,
      body: { title: 'x', project: project._id },
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.details[0].field, 'title');
  });

  test('completing a task sets completedAt, and reopening clears it', async () => {
    const created = await api('/api/tasks', {
      method: 'POST',
      token,
      body: { title: '__test__ completion', project: project._id },
    });
    const id = created.body.data.task._id;

    const done = await api(`/api/tasks/${id}`, {
      method: 'PATCH',
      token,
      body: { status: 'done' },
    });
    assert.equal(done.status, 200);
    assert.ok(done.body.data.task.completedAt, 'completedAt must be set');

    const reopened = await api(`/api/tasks/${id}`, {
      method: 'PATCH',
      token,
      body: { status: 'in_progress' },
    });
    assert.equal(reopened.body.data.task.completedAt, null);
  });

  test('a Kanban move persists both status and position', async () => {
    const a = (
      await api('/api/tasks', {
        method: 'POST',
        token,
        body: { title: '__test__ move A', project: project._id, status: 'todo' },
      })
    ).body.data.task;

    const moved = await api(`/api/tasks/${a._id}/move`, {
      method: 'PATCH',
      token,
      body: { status: 'in_review', order: 0 },
    });
    assert.equal(moved.status, 200);
    assert.equal(moved.body.data.task.status, 'in_review');

    // Read back from the database, not the response, to prove it was persisted.
    const stored = await Task.findById(a._id);
    assert.equal(stored.status, 'in_review');
    assert.equal(stored.order, 0);
  });

  test('checklist items can be added and toggled', async () => {
    const t = (
      await api('/api/tasks', {
        method: 'POST',
        token,
        body: { title: '__test__ checklist', project: project._id },
      })
    ).body.data.task;

    const added = await api(`/api/tasks/${t._id}/checklist`, {
      method: 'POST',
      token,
      body: { text: 'Write the test' },
    });
    assert.equal(added.status, 200);
    const item = added.body.data.task.checklist[0];
    assert.equal(item.done, false);

    const toggled = await api(`/api/tasks/${t._id}/checklist/${item._id}`, {
      method: 'PATCH',
      token,
    });
    assert.equal(toggled.body.data.task.checklist[0].done, true);
  });

  test('comments are stored and increment the task comment count', async () => {
    const t = (
      await api('/api/tasks', {
        method: 'POST',
        token,
        body: { title: '__test__ comments', project: project._id },
      })
    ).body.data.task;

    const posted = await api(`/api/tasks/${t._id}/comments`, {
      method: 'POST',
      token,
      body: { body: 'Looks good to me.' },
    });
    assert.equal(posted.status, 201);

    const list = await api(`/api/tasks/${t._id}/comments`, { token });
    assert.equal(list.body.data.comments.length, 1);
    assert.equal(list.body.data.comments[0].body, 'Looks good to me.');

    const stored = await Task.findById(t._id);
    assert.equal(stored.commentCount, 1);
  });

  test('project health reports overdue work with an explanatory reason', async () => {
    const p = (
      await api('/api/projects', {
        method: 'POST',
        token,
        body: { name: '__test__ health' },
      })
    ).body.data.project;

    const yesterday = new Date(Date.now() - 86400000).toISOString();
    for (let i = 0; i < 3; i += 1) {
      await api('/api/tasks', {
        method: 'POST',
        token,
        body: { title: `__test__ overdue ${i}`, project: p._id, dueDate: yesterday },
      });
    }

    const health = await computeProjectHealth(p._id);
    assert.equal(health.totals.overdue, 3);
    assert.ok(health.score < 100, 'overdue work must reduce the score');
    assert.match(health.reason, /3 tasks are overdue/);
    assert.ok(['at_risk', 'critical', 'healthy'].includes(health.status));
  });

  test('a project with no tasks reports 0% rather than dividing by zero', async () => {
    const p = (
      await api('/api/projects', {
        method: 'POST',
        token,
        body: { name: '__test__ empty health' },
      })
    ).body.data.project;

    const health = await computeProjectHealth(p._id);
    assert.equal(health.completionRate, 0);
    assert.equal(health.totals.total, 0);
    assert.match(health.reason, /No tasks yet/);
  });

  test('the dashboard endpoint returns every block the UI renders', async () => {
    const res = await api('/api/analytics/dashboard', { token });
    assert.equal(res.status, 200);
    const d = res.body.data;
    for (const key of ['kpis', 'progress', 'projects', 'deadlines', 'goals', 'series', 'insights']) {
      assert.ok(key in d, `dashboard payload must include ${key}`);
    }
    assert.equal(d.series.length, 30, 'series must cover 30 days');
    assert.equal(typeof d.progress.percent, 'number');
  });

  test('deleting a task removes it and its comments', async () => {
    const t = (
      await api('/api/tasks', {
        method: 'POST',
        token,
        body: { title: '__test__ to delete', project: project._id },
      })
    ).body.data.task;

    await api(`/api/tasks/${t._id}/comments`, {
      method: 'POST',
      token,
      body: { body: 'about to disappear' },
    });

    const res = await api(`/api/tasks/${t._id}`, { method: 'DELETE', token });
    assert.equal(res.status, 200);
    assert.equal(await Task.findById(t._id), null);
  });
}
