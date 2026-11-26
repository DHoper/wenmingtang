CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  img BLOB NOT NULL,
  title TEXT NOT NULL,
  descr TEXT NOT NULL,
  target TEXT NOT NULL,
  who TEXT NOT NULL,
  created INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS cards_who ON cards (who, created);
CREATE INDEX IF NOT EXISTS cards_created ON cards (created);
