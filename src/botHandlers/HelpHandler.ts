import {db} from "../db";
import {parsePhoneNumber} from "libphonenumber-js";
import {hash} from "../utils";
import botManager, {BotManagerInterface} from "../BotManager";
import i18n from "../i18n";

export default function HelpHandler(BotManager: BotManagerInterface) {
    BotManager.bot.onText(/^\/help/, (msg, match) => {
        db.getUserById(msg.from.id)
            .then(res => {
                const lng = res.lang;
                if (res.active === 1) {
                    BotManager.sendHelpMessage(msg.chat.id, lng)
                } else {
                    BotManager.sendNotActiveReply(msg.chat.id, msg.message_id, lng)
                    BotManager.requestPhone(msg.chat.id, lng);
                }
            })
        ;
    });
}