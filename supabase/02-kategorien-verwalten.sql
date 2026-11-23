-- Nachtrag für die Kategorien-Verwaltung: Kategorien umbenennen und löschen.
-- Einmal im Supabase SQL Editor ausführen (bei Neuinstallation steckt das schon in schema.sql).

create policy "umbenennen" on categories for update to anon using (true) with check (true);
create policy "loeschen"   on categories for delete to anon using (true);
grant update (name), delete on categories to anon;
