import {db} from '../db';
import {parsePhoneNumber} from 'libphonenumber-js';
import BotManagerInterface from '../Interfaces/BotManagerInterface';

export default function StoPhoneBotHandler(BotManager: BotManagerInterface) {
    BotManager.bot.onText(/^\/sto (?<phone>\+?[0-9]+[0-9\s]+[0-9]+) ?(?<alias>.*)?$/, (msg, match) => {
        const phoneNumber = parsePhoneNumber(`+${match.groups.phone.replace(/[\s+]/g, '')}`);
        db.getUserById(msg.from.id)
            .then(res => {
                const lng = res.lang;
                if (res.active === 1) {
                    const alias = match.groups.alias || null;
                    BotManager.processSharedPhoneContact(msg.from.id, msg.message_id, phoneNumber, lng, alias);
                } else {
                    BotManager.sendNotActiveReply(msg.chat.id, msg.message_id, lng);
                    BotManager.requestPhone(msg.chat.id, lng);
                }
            })
        ;
    });
}