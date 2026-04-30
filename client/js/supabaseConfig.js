const SUPABASE_URL = "https://pounibztwanrvusjbxzb.supabase.co/rest/v1/";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdW5pYnp0d2FucnZ1c2pieHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MzU4NDgsImV4cCI6MjA5MzExMTg0OH0.mjRL7gx3XJ1erzfyXiDm2mgd8hQH8tNuvqgXckNsbFI";

window.TACTIC_SUPABASE_CONFIG = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  isConfigured() {
    return Boolean(
      this.url
        && this.anonKey
        && this.url !== "https://pounibztwanrvusjbxzb.supabase.co/rest/v1/"
        && this.anonKey !== "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvdW5pYnp0d2FucnZ1c2pieHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1MzU4NDgsImV4cCI6MjA5MzExMTg0OH0.mjRL7gx3XJ1erzfyXiDm2mgd8hQH8tNuvqgXckNsbFI",
    );
  },
};
