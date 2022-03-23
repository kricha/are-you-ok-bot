import {db} from '../db';
import {BotManagerInterface} from '../BotManager';

export default function HelpHandler(BotManager: BotManagerInterface) {
    BotManager.bot.onText(/^\/help/, (msg) => {
        db.getUserById(msg.from.id)
            .then(res => {
                const lng = res.lang;
                if (res.active === 1) {
                    BotManager.sendHelpMessage(msg.chat.id, lng, res.tz);
                } else {
                    BotManager.sendNotActiveReply(msg.chat.id, msg.message_id, lng);
                    BotManager.requestPhone(msg.chat.id, lng);
                }
            })
        ;
    });

    BotManager.bot.onText(/^\/command_help/, (msg) => {
        db.getUserById(msg.from.id)
            .then(res => {
                const lng = res.lang;
                if (res.active === 1) {
                    BotManager.sendCommandHelpMessage(msg.chat.id, lng);
                } else {
                    BotManager.sendNotActiveReply(msg.chat.id, msg.message_id, lng);
                    BotManager.requestPhone(msg.chat.id, lng);
                }
            })
        ;
    });
}