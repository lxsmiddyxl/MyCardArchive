-- Allow authenticated users to delete their own index rows (quantity → 0 maintenance).

create policy "user_wantlist_index_delete_own"
  on public.user_wantlist_index
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "user_havelist_index_delete_own"
  on public.user_havelist_index
  for delete
  to authenticated
  using (auth.uid() = user_id);

grant delete on table public.user_wantlist_index to authenticated;
grant delete on table public.user_havelist_index to authenticated;
