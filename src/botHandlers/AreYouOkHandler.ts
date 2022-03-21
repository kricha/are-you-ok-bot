import {db} from "../db";
import botManager, {BotManagerInterface} from "../BotManager";
import moment from "moment";
import {AYOK_DATE_FORMAT} from "../constants";

export default function AreYouOkHandler(BotManager: BotManagerInterface) {
    BotManager.bot.on('callback_query', query => {
        const langArray = query.data.split('_');
        if (langArray.length === 2 && langArray[0] === 'ayok') {
            let ayokHour = langArray[1];
            let chat_id = query.message.chat.id;
            const messageDT =  moment(query.message.date*1000);
            if (messageDT.diff(moment(), 'days') < 1) {
                db.updateAreYouOkField(query.from.id, messageDT.format(AYOK_DATE_FORMAT), ayokHour);
            }
            botManager.bot.deleteMessage(query.from.id, query.message.message_id.toString());
        }
    });
}