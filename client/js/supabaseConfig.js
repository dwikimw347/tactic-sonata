const SUPABASE_URL = "https://pounibztwanrvusjbxzb.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_71LdgAlB6hwVePvP5q-1nw_q2Kzkudi";

window.TACTIC_SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  isConfigured() {
    return Boolean(
      this.url
        && this.anonKey
        && this.url !== "YOUR_SUPABASE_URL"
        && this.anonKey !== "YOUR_SUPABASE_ANON_KEY"
    );
  },
};
