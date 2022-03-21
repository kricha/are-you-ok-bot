import {db} from "../db";
import {BotManagerInterface} from "../BotManager";
import {parsePhoneNumber} from "libphonenumber-js";
import {hash} from "../utils";

export default function ContactHandler(BotManager: BotManagerInterface) {
    BotManager.bot.on("contact", (msg) => {
        db.getUserById(msg.contact.user_id)
            .then(
                res => {
                    const phone = msg.contact.phone_number;
                    const phoneNumber = parsePhoneNumber(`+${phone}`);
                    const active = phoneNumber.country !== 'RU';
                    const phoneHash = hash(msg.contact.phone_number);
                    db.updateUserContactInformation(msg.contact.user_id, active, phoneHash, phoneNumber.country)
                        .then(result => {
                                if (phoneNumber.country === 'RU') {
                                    BotManager.sendRussianWarshipGoToHellReply(msg.chat.id, msg.message_id);
                                } else {
                                    BotManager.sendThanksPhoneShareReply(msg.chat.id, res.lang, phoneHash);
                                    db.getAllWaitSubsByPhoneHash(phoneHash)
                                        .then(res => {
                                            if (!res.length) {
                                                return;
                                            }
                                            for (let row of res) {
                                                db.addOrUpdateUserSubs(row.uid, msg.contact.user_id, row.alias)
                                                    .then(() => {
                                                        db.deleteWaitUserPhoneSubById(row.id);
                                                    })
                                                ;
                                            }
                                        })
                                    ;
                                    if (msg.from.username !== undefined) {
                                        db.getAllWaitSubsByUsername(msg.from.username.toLowerCase())
                                            .then(res => {
                                                if (!res.length) {
                                                    return;
                                                }
                                                for (let row of res) {
                                                    db.addOrUpdateUserSubs(row.uid, msg.contact.user_id, row.alias)
                                                        .then(() => {
                                                            db.deleteWaitUserUsernameSubById(row.id);
                                                        })
                                                    ;
                                                }
                                            })
                                        ;
                                    }
                                }
                                setTimeout(()=>{
                                    BotManager.requestTzUpdate(msg.chat.id, res.lang);
                                }, 1000);
                                setTimeout(()=>{
                                    BotManager.sendHelpMessage(msg.chat.id, res.lang);
                                }, 10000);
                            }
                        )
                        .catch(reason => console.log('updateUserContactInformation error', reason));
                });
    });
}