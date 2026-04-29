-- Phase 16: Expose tables to Supabase Realtime (postgres_changes).
-- Subscribers still only receive rows allowed by RLS; policies are not modified here.

alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.activity_log;
alter publication supabase_realtime add table public.trades;
alter publication supabase_realtime add table public.trade_messages;
alter publication supabase_realtime add table public.user_havelist_index;
alter publication supabase_realtime add table public.user_wantlist_index;
