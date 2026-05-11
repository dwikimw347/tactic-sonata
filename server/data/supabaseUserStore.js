const { createClient } = require('@supabase/supabase-js');

let client = null;

function isConfigured() {
  return Boolean(
    process.env.SUPABASE_URL
      && process.env.SUPABASE_SERVICE_KEY
      && process.env.SUPABASE_URL !== 'your_supabase_url'
      && process.env.SUPABASE_SERVICE_KEY !== 'your_service_key_or_db_connection',
  );
}

function getClient() {
  if (!isConfigured()) return null;

  if (!client) {
    client = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return client;
}

function toAppUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.password_hash,
    createdAt: row.created_at,
  };
}

async function findByEmail(email) {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, password_hash, created_at')
    .eq('email', String(email || '').trim().toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return toAppUser(data);
}

async function findByUsername(username) {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, password_hash, created_at')
    .ilike('username', String(username || '').trim())
    .maybeSingle();

  if (error) throw error;
  return toAppUser(data);
}

async function findById(id) {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, password_hash, created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return toAppUser(data);
}

async function createUser({ id, username, email, passwordHash }) {
  const supabase = getClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('users')
    .insert({
      id,
      username: String(username || '').trim(),
      email: String(email || '').trim().toLowerCase(),
      password_hash: passwordHash,
    })
    .select('id, username, email, password_hash, created_at')
    .single();

  if (error) throw error;
  return toAppUser(data);
}

module.exports = {
  createUser,
  findByEmail,
  findById,
  findByUsername,
  isConfigured,
};
