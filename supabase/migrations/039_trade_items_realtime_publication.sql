-- Phase 18: Realtime for trade line items (merge on trade detail without full refetch).

alter publication supabase_realtime add table public.trade_items;
