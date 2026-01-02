// src/person/common/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  "https://atafhpqhdtcwtrbrbvpc.supabase.co",
  "sb_publishable_C15k2AgqjTQtaXiFFvfOhw_jrHrwdiw"
);
