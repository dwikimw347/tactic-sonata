const fs = require('fs');
const path = require('path');
const supabaseUserStore = require('./supabaseUserStore');

const USERS_FILE = path.join(__dirname, 'users.json');

function ensureStoreFile() {
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ users: [] }, null, 2));
  }
}

function readStore() {
  ensureStoreFile();
  try {
    const parsed = JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    return Array.isArray(parsed.users) ? parsed : { users: [] };
  } catch (error) {
    return { users: [] };
  }
}

function writeStore(store) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(store, null, 2));
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || '').trim();
}

function sanitizeUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function findByEmailLocal(email) {
  const normalized = normalizeEmail(email);
  return readStore().users.find((user) => user.email === normalized) || null;
}

function findByUsernameLocal(username) {
  const normalized = normalizeUsername(username).toLowerCase();
  return readStore().users.find((user) => user.username.toLowerCase() === normalized) || null;
}

function findByIdLocal(id) {
  return readStore().users.find((user) => user.id === id) || null;
}

function createUserLocal({ id, username, email, passwordHash }) {
  const store = readStore();
  const user = {
    id,
    username: normalizeUsername(username),
    email: normalizeEmail(email),
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  writeStore(store);
  return user;
}

async function findByEmail(email) {
  if (supabaseUserStore.isConfigured()) return supabaseUserStore.findByEmail(email);
  return findByEmailLocal(email);
}

async function findByUsername(username) {
  if (supabaseUserStore.isConfigured()) return supabaseUserStore.findByUsername(username);
  return findByUsernameLocal(username);
}

async function findById(id) {
  if (supabaseUserStore.isConfigured()) return supabaseUserStore.findById(id);
  return findByIdLocal(id);
}

async function createUser(user) {
  if (supabaseUserStore.isConfigured()) return supabaseUserStore.createUser(user);
  return createUserLocal(user);
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  findByUsername,
  sanitizeUser,
};
