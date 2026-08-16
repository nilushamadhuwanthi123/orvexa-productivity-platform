/**
 * Role-based access control and project scoping.
 *
 * These assert that permissions are enforced on the SERVER — hiding a button
 * in the UI is not access control, so each case calls the API directly.
 *
 *   MONGODB_URI_TEST="mongodb://127.0.0.1:27017/orvexa_test" npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import http from 'node:http';

const TEST_URI = process.env.MONGODB_URI_TEST;

if (!TEST_URI) {
  test('rbac suite', { skip: 'MONGODB_URI_TEST is not set' }, () => {});
} else {
  process.env.MONGODB_URI = TEST_URI;
  process.env.JWT_SECRET ||= 'test_secret_value_for_local_test_runs_only_0123456789';
  process.env.JWT_REFRESH_SECRET ||= 'test_refresh_secret_for_local_test_runs_only_9876543210';
  process.env.NODE_ENV = 'test';

  const { default: app } = await import('../src/app.js');
  const { default: User } = await import('../src/models/User.js');
  const { default: Project } = await import('../src/models/Project.js');
  const { default: Task } = await import('../src/models/Task.js');

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

  /** Creates an account with an exact role (bypassing the self-signup rule). */
  const actor = async (role) => {
    const email = `${unique(role)}@orvexa.test`;
    const reg = await api('/api/auth/register', {
      method: 'POST',
      body: { name: `${role} user`, email, password: 'TestPass123' },
    });
    await User.updateOne({ email }, { $set: { role } });
    const login = await api('/api/auth/login', {
      method: 'POST',
      body: { email, password: 'TestPass123' },
    });
    return { token: login.body.data.accessToken, user: login.body.data.user, email };
  };

  test.after(async () => {
    await Promise.all([
      Task.deleteMany({ title: /^__test__/ }),
      Project.deleteMany({ name: /^__test__/ }),
      User.deleteMany({ email: /@orvexa\.test$/ }),
    ]);
    server.close();
    await mongoose.disconnect();
  });

  test('an employee cannot create a project', async () => {
    const employee = await actor('employee');
    const res = await api('/api/projects', {
      method: 'POST',
      token: employee.token,
      body: { name: '__test__ employee project' },
    });
    assert.equal(res.status, 403);
    assert.match(res.body.error.message, /requires one of the following roles/i);
  });

  test('a manager can create a project and becomes its owner', async () => {
    const manager = await actor('manager');
    const res = await api('/api/projects', {
      method: 'POST',
      token: manager.token,
      body: { name: '__test__ manager project' },
    });
    assert.equal(res.status, 201);
    assert.equal(String(res.body.data.project.owner), String(manager.user._id));
  });

  test('a non-member cannot read another project', async () => {
    const manager = await actor('manager');
    const outsider = await actor('employee');

    const created = await api('/api/projects', {
      method: 'POST',
      token: manager.token,
      body: { name: '__test__ private project' },
    });
    const id = created.body.data.project._id;

    const res = await api(`/api/projects/${id}`, { token: outsider.token });
    assert.equal(res.status, 403);
    assert.match(res.body.error.message, /not a member/i);
  });

  test('a non-member cannot create a task in that project', async () => {
    const manager = await actor('manager');
    const outsider = await actor('employee');

    const created = await api('/api/projects', {
      method: 'POST',
      token: manager.token,
      body: { name: '__test__ task scope project' },
    });
    const id = created.body.data.project._id;

    const res = await api('/api/tasks', {
      method: 'POST',
      token: outsider.token,
      body: { title: '__test__ sneaky task', project: id },
    });
    assert.equal(res.status, 403);
  });

  test('an added member can read the project and create tasks', async () => {
    const manager = await actor('manager');
    const member = await actor('employee');

    const created = await api('/api/projects', {
      method: 'POST',
      token: manager.token,
      body: { name: '__test__ shared project' },
    });
    const id = created.body.data.project._id;

    const added = await api(`/api/projects/${id}/members`, {
      method: 'POST',
      token: manager.token,
      body: { userId: member.user._id },
    });
    assert.equal(added.status, 200);

    const read = await api(`/api/projects/${id}`, { token: member.token });
    assert.equal(read.status, 200);

    const task = await api('/api/tasks', {
      method: 'POST',
      token: member.token,
      body: { title: '__test__ member task', project: id },
    });
    assert.equal(task.status, 201);
  });

  test('only an admin can change roles', async () => {
    const manager = await actor('manager');
    const target = await actor('employee');

    const denied = await api(`/api/users/${target.user._id}/role`, {
      method: 'PATCH',
      token: manager.token,
      body: { role: 'admin' },
    });
    assert.equal(denied.status, 403);

    const admin = await actor('admin');
    const allowed = await api(`/api/users/${target.user._id}/role`, {
      method: 'PATCH',
      token: admin.token,
      body: { role: 'manager' },
    });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.body.data.user.role, 'manager');
  });

  test('the admin overview is closed to non-admins', async () => {
    const manager = await actor('manager');
    assert.equal((await api('/api/admin/overview', { token: manager.token })).status, 403);

    const admin = await actor('admin');
    assert.equal((await api('/api/admin/overview', { token: admin.token })).status, 200);
  });

  test('task list is scoped to projects the caller can access', async () => {
    const managerA = await actor('manager');
    const managerB = await actor('manager');

    const projectA = (
      await api('/api/projects', {
        method: 'POST',
        token: managerA.token,
        body: { name: '__test__ scope A' },
      })
    ).body.data.project;

    await api('/api/tasks', {
      method: 'POST',
      token: managerA.token,
      body: { title: '__test__ hidden task', project: projectA._id },
    });

    const listB = await api('/api/tasks', { token: managerB.token });
    assert.equal(listB.status, 200);
    assert.equal(
      listB.body.data.some((t) => t.title === '__test__ hidden task'),
      false,
      "manager B must not see manager A's task"
    );
  });
}
