import {db} from '../db';
import {parsePhoneNumber} from 'libphonenumber-js';
import {hash} from '../utils';
import {RESTRICTED_COUNTRIES} from '../constants';
import BotManagerInterface from '../Interfaces/BotManagerInterface';

export default function ContactBotHandler(BotManager: BotManagerInterface) {
    BotManager.bot.on('contact', (msg) => {
        const currentUid = msg.from.id;
        const ownContact = msg.contact.user_id === msg.from.id;
        db.getUserById(currentUid)
            .then(
                res => {
                    const phone = msg.contact.phone_number.replace('+', '');
                    const phoneNumber = parsePhoneNumber(`+${phone}`);
                    const isRestrictedContact = RESTRICTED_COUNTRIES.includes(phoneNumber.country);
                    const phoneHash = hash(msg.contact.phone_number);
                    if (!ownContact) {
                        const aliasArray = [];
                        if (msg.contact.first_name) {
                            aliasArray.push(msg.contact.first_name);
                        }
                        if (msg.contact.last_name) {
                            aliasArray.push(msg.contact.last_name);
                        }
                        const alias = aliasArray.length ? aliasArray.join(' ') : '';
                        if (msg.contact.user_id) {
                            db.addOrUpdateUserSubs(currentUid, msg.contact.user_id, alias);
                            BotManager.sendSubAddedReply(currentUid, msg.message_id, res.lang, alias);
                        } else {
                            BotManager.processSharedPhoneContact(currentUid, msg.message_id, phoneNumber, res.lang, alias);
                        }
                    } else {
                        db.updateUserContactInformation(currentUid, !isRestrictedContact, phoneHash, phoneNumber.country)
                            .then(() => {
                                    if (phoneNumber.country === 'RU') {
                                        BotManager.sendRussianWarshipGoToHellReply(msg.chat.id, msg.message_id);
                                    } else {
                                        BotManager.sendThanksPhoneShareReply(msg.chat.id, res.lang, phoneHash);
                                        db.getAllWaitSubsByPhoneHash(phoneHash)
                                            .then(res => {
                                                if (!res.length) {
                                                    return;
                                                }
                                                for (const row of res) {
                                                    db.addOrUpdateUserSubs(row.uid, currentUid, row.alias)
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
                                                    for (const row of res) {
                                                        db.addOrUpdateUserSubs(row.uid, currentUid, row.alias)
                                                            .then(() => {
                                                                db.deleteWaitUserUsernameSubById(row.id);
                                                            })
                                                        ;
                                                    }
                                                })
                                            ;
                                        }
                                    }
                                    BotManager.sendHelpMessage(msg.chat.id, res.lang, res.tz, true);
                                }
                            )
                            .catch(reason => console.log('updateUserContactInformation error', reason))
                        ;
                    }
                })
        ;
    });
}