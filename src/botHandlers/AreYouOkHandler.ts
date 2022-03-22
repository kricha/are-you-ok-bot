import {db} from "../db";
import botManager, {BotManagerInterface} from "../BotManager";
import moment from "moment";
import {AYOK_DATE_FORMAT} from "../constants";
import i18n from "../i18n";

export default function AreYouOkHandler(BotManager: BotManagerInterface) {
    BotManager.bot.on('callback_query', query => {
        const uid = query.from.id;
        const langArray = query.data.split('_');
        if (langArray.length === 2 && langArray[0] === 'ayok') {
            db.getUserById(uid)
                .then(res => {
                    const ayokHour = langArray[1];
                    const intHours = parseInt(ayokHour);
                    const messageDT =  moment(query.message.date*1000);
                    const dateKey = messageDT.format(AYOK_DATE_FORMAT);
                    let jsonInsert = [`'$.${dateKey}.${ayokHour}'`, 1];
                    if (intHours > 15) {
                        jsonInsert.push(`'$.${dateKey}.15'`)
                        jsonInsert.push(1);
                    }
                    if (intHours > 9) {
                        jsonInsert.push(`'$.${dateKey}.09'`);
                        jsonInsert.push(1);
                    }
                    if (messageDT.diff(moment(), 'days') < 1) {
                        db.updateAreYouOkField(uid, jsonInsert);
                    }
                    botManager.bot.editMessageText(i18n.t('good.thanks', {lng: res.lang}), {
                        chat_id: uid,
                        message_id: query.message.message_id
                    });
                })
            ;
        }
    });
}