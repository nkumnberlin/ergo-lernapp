-- Einmal im Supabase SQL Editor ausführen.

create table questions (
  nummer     int primary key,
  frage      text  not null,
  optionen   jsonb not null default '[]',  -- [{buchstabe, text}], leer = schriftliche Frage
  loesung    text  not null,
  material   jsonb,                        -- aufgabenmaterial (Tabelle, Aussagen, Bereiche)
  erklaerung text                          -- manuell im Table Editor pflegen
);

create table categories (
  id   bigint generated always as identity primary key,
  name text not null unique check (length(trim(name)) between 1 and 60)
);

create table question_categories (
  nummer      int    references questions  on delete cascade,
  category_id bigint references categories on delete cascade,
  primary key (nummer, category_id)
);

alter table questions           enable row level security;
alter table categories          enable row level security;
alter table question_categories enable row level security;

-- Ohne Anmeldung: alles lesen, Kategorien anlegen, umbenennen, löschen und zuordnen.
-- Fragen ändern geht nur mit dem Secret Key (Import-Skript) oder im Dashboard.
create policy "lesen" on questions           for select to anon using (true);
create policy "lesen" on categories          for select to anon using (true);
create policy "lesen" on question_categories for select to anon using (true);
create policy "anlegen"   on categories          for insert to anon with check (true);
create policy "zuordnen"  on question_categories for insert to anon with check (true);
create policy "entfernen" on question_categories for delete to anon using (true);
create policy "umbenennen" on categories for update to anon using (true) with check (true);
create policy "loeschen"   on categories for delete to anon using (true);

grant select on questions, categories, question_categories to anon;
grant insert, delete on categories to anon;
grant update (name) on categories to anon;
grant insert, delete on question_categories to anon;
