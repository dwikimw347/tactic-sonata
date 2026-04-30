const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

window.TACTIC_SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  isConfigured() {
    return Boolean(
      this.url
        && this.anonKey
        && this.url !== "YOUR_SUPABASE_URL"
        && this.anonKey !== "YOUR_SUPABASE_ANON_KEY",
    );
  },
};
