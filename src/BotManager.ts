import TelegramBot, {InlineKeyboardMarkup} from "node-telegram-bot-api";
import stoPhoneHandler from "./botHandlers/StoPhoneHandler";
import i18n from "./i18n";
import {db} from "./db";
import {buildTzKeyboardArray, getLangKeyboard} from "./utils";
import stoUsernameHandler from "./botHandlers/StoUnsernameHandler";
import ContactHandler from "./botHandlers/ContactHandler";
import LanguageCallbackHandler from "./botHandlers/LanguageCallbackHandler";
import AreYouOkHandler from "./botHandlers/AreYouOkHandler";
import HelpHandler from "./botHandlers/HelpHandler";
import nconf from 'nconf';

nconf.file({file: './config.json'});
const token = nconf.get('botToken');

export interface BotManagerInterface {
    bot: TelegramBot

    sendSubAddedReply(chat_id, reply_to_message_id, lng, contact, name): void

    sendNotActiveReply(chat_id, reply_to_message_id, lng): void

    sendThanksPhoneShareReply(chat_id, lng, hash): void

    sendRussianWarshipGoToHellReply(chat_id, reply_to_message_id): void

    requestPhone(chat_id, lng): void

    requestTzUpdate(chat_id: Number, lng: String): void

    sendHelpMessage(chat_id, lng): void
}

class BotManager implements BotManagerInterface {
    bot = new TelegramBot(token, {polling: true});

    sendInvalidPhoneReply(chat_id, reply_to_message_id, lng) {
        this.bot.sendMessage(
            chat_id,
            i18n.t('invalid.phone', {lng}),
            {reply_to_message_id}
        );
    }

    sendSubAddedReply(chat_id, reply_to_message_id, lng, contact, name) {
        this.bot.sendMessage(
            chat_id,
            i18n.t('sub.added', {lng, contact, name}),
            {reply_to_message_id}
        );
    }

    sendNotActiveReply(chat_id, reply_to_message_id, lng) {
        this.bot.sendMessage(
            chat_id,
            i18n.t('sorry.not.active', {lng}),
            {reply_to_message_id}
        );
    }

    sendThanksPhoneShareReply(chat_id, lng, hash) {
        this.bot.sendMessage(
            chat_id,
            i18n.t('thanks.phone.share', {lng, hash}),
            {
                reply_markup: {
                    remove_keyboard: true,
                }
            })
        ;
    }

    sendRussianWarshipGoToHellReply(chat_id, reply_to_message_id) {
        this.bot.sendMessage(chat_id, '🇷🇺 🚢 🖕', {reply_to_message_id});
    }

    requestPhone(chat_id, lng) {
        this.bot.sendMessage(chat_id, i18n.t('share.phone', {lng}), {
            reply_markup: {
                keyboard: [[{
                    text: i18n.t('share.my.phone.number', {lng}),
                    request_contact: true
                }], [i18n.t('🚫', {lng})]
                ],
            }
        });
    };

    tzCallBackHandler() {
        this.bot.on('callback_query', query => {
            const tzArray = query.data.split('_');
            if (tzArray.length === 2 && tzArray[0] === 'TZ') {
                db.getUserById(query.from.id)
                    .then(res => {
                        const tz = tzArray[1];
                        db.updateUserTz(query.from.id, tz)
                            .then(() => {
                                this.bot.editMessageText(i18n.t('tz.chosen', {lng: res.lang, offset: `${+tz/60}`}), {
                                    chat_id: query.message.chat.id,
                                    message_id: query.message.message_id
                                });
                            })
                        ;
                    })
                ;
            }
        });
    }

    requestTzUpdate(chat_id, lng) {
        buildTzKeyboardArray.then(array => {
            this.bot.sendMessage(chat_id, i18n.t('please.chose.local.time', {lng}), {
                reply_markup: {
                    inline_keyboard: array,
                }
            });
        });
    }

    sendAreYouOkRequest(chat_id, lng, callback_data) {
        this.bot.sendMessage(chat_id, i18n.t('are.you.ok', {lng}), {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: i18n.t('im.ok', {lng}),
                            callback_data
                        }
                    ]
                ],
            }
        });
    }

    cancelContactHandler() {
        this.bot.onText(/🚫/, (msg, match) => {
            db.getUserById(msg.from.id)
                .then(res => {
                    this.bot.sendMessage(
                        msg.chat.id,
                        i18n.t('thanks.sorry', {lng: res.lang}),
                        {
                            reply_markup: {
                                remove_keyboard: true
                            }
                        })
                    ;
                    this.bot.deleteMessage(msg.chat.id, msg.message_id.toString());
                })
            ;
        });
    }

    requestChooseKeyboard(chat_id) {
        this.bot.sendMessage(chat_id, 'Виберіть мову / Choose language', {
            reply_markup: {
                inline_keyboard: getLangKeyboard()
            }
        })
    }

    startHandler() {
        this.bot.onText(/\/start/, (msg, match) => {
            const username = msg.from.username !== undefined ? msg.from.username.toLowerCase() : null;
            db.addNewUser(msg.from.id, username)
                .then(() => {
                        this.requestChooseKeyboard(msg.chat.id);
                    }
                )
                .catch(err => {
                    console.log(err)
                })
        });
    }

    sendAreYouOkReport(chat_id, lng, report:any) {
        console.log(report)
        const reportTextArray = [];
        for (const uid in report) {
            const sub = report[uid];
            const status = i18n.t(`im.status.${sub.status}`, {lng});
            console.log(status)
            reportTextArray.push(`[${sub.alias ? sub.alias : uid}](tg://user?id=${uid}): ${status}`)
        }
        console.log(i18n.t('report', {lng, report: reportTextArray.join("\n")}))
        this.bot.sendMessage(chat_id, i18n.t('report', {lng, report: reportTextArray.join("\n")}), {
            parse_mode: 'MarkdownV2'
        });
    }

    sendHelpMessage(chat_id, lng) {
        this.bot.sendMessage(chat_id, i18n.t('help', {lng}), {
            parse_mode: 'MarkdownV2',
            disable_web_page_preview: true
        })
    }

    init() {
        this.startHandler();
        stoPhoneHandler(this);
        stoUsernameHandler(this);
        ContactHandler(this);
        AreYouOkHandler(this);
        HelpHandler(this);
        LanguageCallbackHandler(this);
        this.tzCallBackHandler();
        this.cancelContactHandler();
    }
}

export default new BotManager();




