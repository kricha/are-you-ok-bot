import {db} from "../db";
import i18n from "../i18n";
import {BotManagerInterface} from "../BotManager";

export default function LanguageCallbackHandler(BotManager: BotManagerInterface) {
    BotManager.bot.on('callback_query', query => {
        const langArray = query.data.split('_');
        if (langArray.length === 2 && langArray[0] === 'lang') {
            let lng = langArray[1];
            let chat_id = query.message.chat.id;
            db.updateUserLang(query.from.id, lng)
                .then(() => {
                        BotManager.bot.editMessageText(i18n.t('language.chosen', {lng}), {
                            chat_id,
                            message_id: query.message.message_id
                        });
                        BotManager.requestPhone(chat_id, lng);
                    }
                )
            ;
            BotManager.bot.answerCallbackQuery(query.id)
        }
    });
}