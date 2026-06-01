const SUPABASE_URL = "https://mgxnfcwlgtozzyhiqisi.supabase.co";
const SUPABASE_KEY = "sb_publishable_uP15AOFBOtxGXqsT2ckJAg_4EP6__Lu";

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);
