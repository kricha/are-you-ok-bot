import {db} from '../db';
import BotManagerInterface from '../Interfaces/BotManagerInterface';

export default function StoUsernameBotHandler(BotManager: BotManagerInterface) {
    BotManager.bot.onText(/^\/sto @(?<username>[A-z0-9_]{5,}) ?(?<alias>.*)?$/, (msg, match) => {
        const username = match.groups.username.toString().toLowerCase();
        const uid = msg.from.id;
        const alias = match.groups.alias || null;
        db.getUserById(msg.from.id)
            .then(res => {
                const lng = res.lang;
                if (res.active === 1) {
                    db.getUserByUsername(username)
                        .then(res => {
                            if (!res) {
                                db.addToWaitSubsByUsername(uid, username, alias);
                            } else {
                                db.addOrUpdateUserSubs(uid, res.uid, alias);
                            }
                            BotManager.sendSubAddedReply(msg.chat.id, msg.message_id, lng, alias);
                        })
                    ;
                } else {
                    BotManager.sendNotActiveReply(msg.chat.id, msg.message_id, lng);
                    BotManager.requestPhone(msg.chat.id, lng);
                }
            })
        ;
    });
}