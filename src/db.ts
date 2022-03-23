import {open} from 'sqlite';
import sqlite3 from 'sqlite3';

const connector = await open({
    filename: 'var/database.db',
    driver: sqlite3.Database
});

interface DbInterface {
    addNewUser(uid: number, username: string)

    setUserInActive(uid)

    updateUserTz(uid: number, tz: number)

    updateUserLang(uid: number, lng: string)

    updateAreYouOkField(uid: number, key: string): void

    addOrUpdateUserSubs(uid, key, alias)

    getAllWaitSubsByPhoneHash(phoneHash: string)

    getUserSubsById(uid)

    getUsersByIds(ids)

    deleteWaitUserPhoneSubById(id: number): void

    deleteWaitUserUsernameSubById(id: number): void

    getAllWaitSubsByUsername(username: string)

    addToWaitAnswer(uid, ts, message_id)

    deleteFromWaitAnswer(uid)

    getAllWaitingAnswers(ts);

    getAllSubscriberByUid(uid);
}

class DataBase implements DbInterface {
    addNewUser(uid, username) {
        return connector.run(
            'INSERT or IGNORE INTO users (uid, username, active) VALUES (:uid, :username, 0)',
            {
                ':uid': uid,
                ':username': username
            }
        );
    }

    setUserInActive(uid) {
        return connector.run(
            'UPDATE users SET active = 0 where uid = :uid;',
            {
                ':uid': uid
            }
        );
    }

    getUserById(uid) {
        return connector.get('SELECT * FROM users WHERE uid = :uid',
            {
                ':uid': uid
            })
            ;
    }

    getUserByUsername(username) {
        return connector.get(
            'SELECT * FROM users WHERE username = :username',
            {
                ':username': username
            }
        );
    }

    getUsersByTz(timezones) {
        return connector
            .all('select * from users where active = 1 and tz in (:timezones);', {
                ':timezones': timezones.join(',')
            });
    }

    getUsersByIds(ids) {
        return connector
            .all('select * from users where uid in (:ids);', {
                ':ids': ids.join(',')
            });
    }

    deleteWaitUserUsernameSubById(id: number) {
        connector.run('delete from wait_subs_username where id = :id', {':id': id});
    }

    deleteWaitUserPhoneSubById(id: number) {
        connector.run('delete from wait_subs_phone_hash where id = :id', {':id': id});
    }

    getAllWaitSubsByPhoneHash(phoneHash) {
        return connector
            .all(
                'SELECT * FROM wait_subs_phone_hash WHERE phone = :phoneHash;',
                {
                    ':phoneHash': phoneHash
                })
            ;
    }

    getAllWaitSubsByUsername(username) {
        return connector
            .all(
                'SELECT * FROM wait_subs_username WHERE username = :username;',
                {
                    ':username': username
                })
            ;
    }

    getUserByPhoneHash(phoneHash) {
        return connector.get(
            'SELECT * FROM users WHERE phone = :phoneHash',
            {
                ':phoneHash': phoneHash
            }
        );
    }

    updateUserLang(uid: number, lng: string) {
        return connector.run(
            'UPDATE users SET lang = :lng where uid = :uid;',
            {
                ':uid': uid,
                ':lng': lng
            }
        );
    }

    updateUserTz(uid, tz) {
        return connector.run(
            'UPDATE users SET tz = :tz where uid = :uid;',
            {
                ':uid': uid,
                ':tz': tz
            }
        );
    }

    addToWaitSubsByUsername(uid, username, alias) {
        connector.get('select * from wait_subs_username where uid = :uid and username = :username', {
            ':uid': uid,
            ':username': username,
        })
            .then(res => {
                if (res && res.alias !== alias) {
                    return connector.run('UPDATE wait_subs_username SET alias = :alias where id = :id', {
                        ':alias': alias,
                        ':id': res.id
                    });
                } else {
                    return connector.run('INSERT INTO wait_subs_username (uid, username, alias) VALUES (:uid, :username, :alias)', {
                        ':uid': uid,
                        ':username': username,
                        ':alias': alias
                    });
                }
            })
        ;
    }

    addToWaitSubsByPhoneHash(uid, phoneHash, alias) {
        connector.get('SELECT * FROM wait_subs_phone_hash WHERE uid = :uid and phone = :phoneHash;', {
            ':uid': uid,
            ':phoneHash': phoneHash,
        })
            .then(res => {
                if (res && res.alias !== alias) {
                    return connector.run('UPDATE wait_subs_phone_hash SET alias = :alias where id = :id;', {
                        ':alias': alias,
                        ':id': res.id
                    });
                } else {
                    return connector.run('INSERT INTO wait_subs_phone_hash (uid, phone, alias) VALUES (:uid, :phoneHash, :alias)', {
                        ':uid': uid,
                        ':phoneHash': phoneHash,
                        ':alias': alias
                    });
                }
            })
        ;
    }

    updateUserContactInformation(uid, active, phoneHash, country) {
        return connector.run(
            'UPDATE users SET phone = :phoneHash, active = :active, country = :country  where uid = :uid;',
            {
                ':uid': uid,
                ':active': active,
                ':phoneHash': phoneHash,
                ':country': country
            }
        );
    }

    addOrUpdateUserSubs(uid, key, alias) {
        return connector.run(
            'INSERT INTO subs (uid, users) VALUES (:uid, json_insert(\'{}\', :key, :alias )) ON CONFLICT(uid) DO UPDATE SET users = json_insert(users, :key, :alias );', {
                ':key': `$.${key}`,
                ':alias': alias,
                ':uid': uid
            });
    }

    updateAreYouOkField(uid, key) {
        connector.run(`UPDATE users SET answers = json_insert(answers, ${key}, 1) where uid = ${uid};`);
    }

    getUserSubsById(uid) {
        return connector.get('SELECT * from subs where uid = :uid;', {
            ':uid': uid
        });
    }

    addToWaitAnswer(uid, ts, message_id) {
        return connector.run(
            'INSERT or IGNORE INTO wait_answer_queue (uid, ts, message_id) VALUES (:uid, :ts, :message_id)',
            {
                ':uid': uid,
                ':ts': ts,
                ':message_id': message_id,
            }
        );
    }

    deleteFromWaitAnswer(uid) {
        return connector.run(
            'DELETE FROM wait_answer_queue where uid = :uid;',
            {
                ':uid': uid
            }
        );
    }

    getAllWaitingAnswers(ts) {
        return connector.all(
            'SELECT * FROM wait_answer_queue where ts < :ts;',
            {
                ':ts': ts,
            }
        );
    }

    getAllSubscriberByUid(uid){
        return connector.all('SELECT s.uid, json_extract(s.users, :key) as alias, u.tz, u.lang from subs s join users u on s.uid = u.uid where alias is not NULL and u.active =1;', {
            ':key': `$.${uid}`
        });
    }

    runMigrations() {
        connector.migrate()
            .catch(error => {
                console.log(error);
            })
        ;
    }
}

export const db = new DataBase();




