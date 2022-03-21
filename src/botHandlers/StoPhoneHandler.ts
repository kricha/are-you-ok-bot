import {db} from "../db";
import {parsePhoneNumber} from "libphonenumber-js";
import {hash} from "../utils";
import botManager, {BotManagerInterface} from "../BotManager";

export default function stoPhoneHandler(BotManager: BotManagerInterface) {
    BotManager.bot.onText(/^\/sto (?<phone>\+?\d{9,14}) ?(?<alias>.*)?$/, (msg, match) => {
        const phoneNumber = parsePhoneNumber(`+${match.groups.phone.replace(/[\s+]/g, '')}`);
        db.getUserById(msg.from.id)
            .then(res => {
                const lng = res.lang;
                if (res.active === 1) {
                    if (!phoneNumber.isValid()) {
                        botManager.sendInvalidPhoneReply(msg.chat.id, msg.message_id, lng);
                    }
                    if (phoneNumber.country === 'RU') {
                        BotManager.sendRussianWarshipGoToHellReply(msg.chat.id, msg.message_id);
                    }
                    const phoneHash = hash(phoneNumber.formatInternational().replace(/[\s+]/g, ''));
                    const alias = match.groups.alias || null;
                    const uid = msg.from.id;
                    db.getUserByPhoneHash(phoneHash)
                        .then(res => {
                            if (!res) {
                                db.addToWaitSubsByPhoneHash(uid, phoneHash, alias)
                            } else {
                                db.addOrUpdateUserSubs(uid, res.uid, alias);
                            }
                            BotManager.sendSubAddedReply(msg.chat.id, msg.message_id, lng, phoneHash, alias);
                        })
                    ;
                } else {
                    BotManager.sendNotActiveReply(msg.chat.id, msg.message_id, lng)
                    BotManager.requestPhone(msg.chat.id, lng);
                }
            })
        ;
    });
}