/**
 * Backend integration tests.
 *
 * These run against a real MongoDB instance so they exercise the actual
 * queries, indexes and validation — not a mock. Point MONGODB_URI_TEST at a
 * throwaway database (a local mongod or a separate Atlas database):
 *
 *   MONGODB_URI_TEST="mongodb://127.0.0.1:27017/orvexa_test" npm test
 *
 * If MONGODB_URI_TEST is not set the suite skips rather than silently passing.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import http from 'node:http';

const TEST_URI = process.env.MONGODB_URI_TEST;

if (!TEST_URI) {
  test('backend integration suite', { skip: 'MONGODB_URI_TEST is not set' }, () => {});
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
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  const api = async (path, { method = 'GET', body, token } = {}) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const json = await res.json().catch(() => null);
    return { status: res.status, body: json };
  };

  const unique = (p) => `${p}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  const register = async (role = 'employee') => {
    const email = `${unique('test')}@orvexa.test`;
    const res = await api('/api/auth/register', {
      method: 'POST',
      body: { name: 'Test Person', email, password: 'TestPass123', role },
    });
    return { email, ...res };
  };

  test.after(async () => {
    await Promise.all([
      User.deleteMany({ email: /@orvexa\.test$/ }),
      Project.deleteMany({ name: /^__test__/ }),
    ]);
    server.close();
    await mongoose.disconnect();
  });

  /* ------------------------------- health ------------------------------ */

  test('GET /api/health reports API and database status', async () => {
    const { status, body } = await api('/api/health');
    assert.equal(typeof body.data.status, 'string');
    assert.equal(body.data.api.status, 'ok');
    assert.equal(body.data.database.status, 'ok');
    assert.ok([200, 503].includes(status));
  });

  /* -------------------------------- auth ------------------------------- */

  test('registration returns a user and an access token', async () => {
    const { status, body } = await register();
    assert.equal(status, 201);
    assert.ok(body.data.accessToken);
    assert.ok(body.data.user._id);
    assert.equal(body.data.user.password, undefined, 'password must never be returned');
  });

  test('registration rejects a weak password', async () => {
    const { status, body } = await api('/api/auth/register', {
      method: 'POST',
      body: { name: 'Weak', email: `${unique('weak')}@orvexa.test`, password: 'short' },
    });
    assert.equal(status, 400);
    assert.match(body.error.message, /Validation failed/i);
  });

  test('registration rejects a duplicate email', async () => {
    const { email } = await register();
    const { status } = await api('/api/auth/register', {
      method: 'POST',
      body: { name: 'Dupe', email, password: 'TestPass123' },
    });
    assert.equal(status, 409);
  });

  test('login succeeds with correct credentials and fails with wrong ones', async () => {
    const { email } = await register();

    const good = await api('/api/auth/login', {
      method: 'POST',
      body: { email, password: 'TestPass123' },
    });
    assert.equal(good.status, 200);
    assert.ok(good.body.data.accessToken);

    const bad = await api('/api/auth/login', {
      method: 'POST',
      body: { email, password: 'WrongPass123' },
    });
    assert.equal(bad.status, 401);
    assert.match(bad.body.error.message, /Incorrect email or password/);
  });

  test('passwords are stored hashed, never in plain text', async () => {
    const { email } = await register();
    const user = await User.findOne({ email }).select('+password');
    assert.notEqual(user.password, 'TestPass123');
    assert.match(user.password, /^\$2[aby]\$/, 'should be a bcrypt hash');
  });

  /* ------------------------- protected routes -------------------------- */

  test('protected routes reject missing and invalid tokens', async () => {
    const none = await api('/api/projects');
    assert.equal(none.status, 401);

    const bad = await api('/api/projects', { token: 'not-a-real-token' });
    assert.equal(bad.status, 401);
  });

  test('GET /api/auth/me returns the caller with a valid token', async () => {
    const { body } = await register();
    const me = await api('/api/auth/me', { token: body.data.accessToken });
    assert.equal(me.status, 200);
    assert.equal(me.body.data.user._id, body.data.user._id);
  });
}
