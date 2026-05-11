const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userStore = require('../data/userStore');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_EXPIRES_IN = '7d';
const runtimeJwtSecret = process.env.JWT_SECRET || crypto.randomBytes(48).toString('hex');

function getJwtSecret() {
  return process.env.JWT_SECRET || runtimeJwtSecret;
}

function sendError(res, status, message) {
  return res.status(status).json({
    success: false,
    message,
    data: null,
  });
}

async function validateRegister({ username, email, password, confirmPassword }) {
  const cleanUsername = String(username || '').trim();
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  if (cleanUsername.length < 3) return 'Username must be at least 3 characters.';
  if (!EMAIL_PATTERN.test(cleanEmail)) return 'Please enter a valid email address.';
  if (cleanPassword.length < 6) return 'Password must be at least 6 characters.';
  if (cleanPassword !== String(confirmPassword || '')) return 'Confirm password must match password.';
  if (await userStore.findByUsername(cleanUsername)) return 'Username is already taken.';
  if (await userStore.findByEmail(cleanEmail)) return 'Email is already registered.';

  return null;
}

function validateLogin({ email, password }) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  const cleanPassword = String(password || '');

  if (!EMAIL_PATTERN.test(cleanEmail)) return 'Please enter a valid email address.';
  if (!cleanPassword) return 'Password is required.';

  return null;
}

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      email: user.email,
    },
    getJwtSecret(),
    { expiresIn: TOKEN_EXPIRES_IN },
  );
}

function getTokenFromRequest(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
}

function verifyToken(token) {
  try {
    return jwt.verify(token, getJwtSecret());
  } catch (error) {
    return null;
  }
}

async function register(req, res) {
  try {
    const validationError = await validateRegister(req.body || {});
    if (validationError) return sendError(res, 400, validationError);

    const username = String(req.body.username).trim();
    const email = String(req.body.email).trim().toLowerCase();
    const passwordHash = await bcrypt.hash(String(req.body.password), 12);
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    const user = await userStore.createUser({ id, username, email, passwordHash });
    const token = createToken(user);

    return res.status(201).json({
      success: true,
      message: 'Account created.',
      data: {
        token,
        user: userStore.sanitizeUser(user),
      },
    });
  } catch (error) {
    if (error?.code === '23505') {
      return sendError(res, 400, 'Username or email is already registered.');
    }

    console.error('Register failed:', error);
    return sendError(res, 500, 'Unable to create account.');
  }
}

async function login(req, res) {
  const validationError = validateLogin(req.body || {});
  if (validationError) return sendError(res, 400, validationError);

  const email = String(req.body.email).trim().toLowerCase();
  try {
    const user = await userStore.findByEmail(email);
    if (!user) return sendError(res, 401, 'Invalid email or password.');

    const passwordMatches = await bcrypt.compare(String(req.body.password || ''), user.passwordHash);
    if (!passwordMatches) return sendError(res, 401, 'Invalid email or password.');

    return res.json({
      success: true,
      message: 'Logged in.',
      data: {
        token: createToken(user),
        user: userStore.sanitizeUser(user),
      },
    });
  } catch (error) {
    console.error('Login failed:', error);
    return sendError(res, 500, 'Unable to log in.');
  }
}

function logout(_req, res) {
  return res.json({
    success: true,
    message: 'Logged out.',
    data: null,
  });
}

async function me(req, res) {
  const token = getTokenFromRequest(req);
  if (!token) return sendError(res, 401, 'Not authenticated.');

  const payload = verifyToken(token);
  if (!payload?.sub) return sendError(res, 401, 'Session expired.');

  try {
    const user = await userStore.findById(payload.sub);
    if (!user) return sendError(res, 401, 'User not found.');

    return res.json({
      success: true,
      message: 'Authenticated.',
      data: {
        user: userStore.sanitizeUser(user),
      },
    });
  } catch (error) {
    console.error('Auth check failed:', error);
    return sendError(res, 500, 'Unable to verify session.');
  }
}

module.exports = {
  login,
  logout,
  me,
  register,
};
