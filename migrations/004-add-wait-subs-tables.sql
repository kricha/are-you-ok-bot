--------------------------------------------------------------------------------
-- Up
--------------------------------------------------------------------------------


CREATE TABLE wait_subs_username (id INTEGER PRIMARY KEY, uid INTEGER, username varchar);
CREATE TABLE wait_subs_phone_hash (id INTEGER PRIMARY KEY, uid INTEGER, phone varchar);

--------------------------------------------------------------------------------
-- Down
--------------------------------------------------------------------------------

DROP TABLE wait_subs_username;
DROP TABLE wait_subs_phone_hash;