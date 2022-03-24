import TelegramBot from 'node-telegram-bot-api';
import stoPhoneHandler from './botHandlers/StoPhoneHandler';
import i18n from './i18n';
import {db} from './db';
import {buildTzKeyboardArray, getLangKeyboard, hash} from './utils';
import stoUsernameHandler from './botHandlers/StoUnsernameHandler';
import ContactHandler from './botHandlers/ContactHandler';
import LanguageCallbackHandler from './botHandlers/LanguageCallbackHandler';
import AreYouOkHandler from './botHandlers/AreYouOkHandler';
import HelpHandler from './botHandlers/HelpHandler';
import nconf from 'nconf';
import {PhoneNumber} from 'libphonenumber-js';

nconf.file({file: './config.json'});
const token = nconf.get('botToken');

export interface BotManagerInterface {
    bot: TelegramBot

    sendSubAddedReply(chat_id, reply_to_message_id, lng, name): void

    sendNotActiveReply(chat_id, reply_to_message_id, lng): void

    sendThanksPhoneShareReply(chat_id, lng, hash): void

    sendRussianWarshipGoToHellReply(chat_id, reply_to_message_id): void

    requestPhone(chat_id, lng): void

    requestTzUpdate(chat_id: number, lng: string): void

    sendHelpMessage(chat_id, lng, offset?: number, default_header?: boolean): void

    sendCommandHelpMessage(chat_id, lng): void

    processSharedPhoneContact(uid: number, message_id: number, phoneNumber: PhoneNumber, lng: string, alias?: string)

    handleForbiddenRequest(error, uid): void
}

class BotManager implements BotManagerInterface {
    bot = new TelegramBot(token, {polling: true});

    handleForbiddenRequest(error, uid) {
        if (error.response && error.response.statusCode === 403) {
            db.setUserInActive(uid);
        }
    }

    sendInvalidPhoneReply(chat_id, reply_to_message_id, lng) {
        this.bot.sendMessage(
            chat_id,
            i18n.t('invalid.phone', {lng}),
            {reply_to_message_id}
        );
    }

    sendSubAddedReply(chat_id, reply_to_message_id, lng, name) {
        this.bot.sendMessage(
            chat_id,
            i18n.t('sub.added', {lng, name}),
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
                keyboard: [
                    [
                        {
                            text: i18n.t('share.my.phone.number', {lng}),
                            request_contact: true
                        }
                    ],
                    // [i18n.t('🚫', {lng})]
                ],
            }
        });
    }

    tzCallBackHandler() {
        this.bot.on('callback_query', query => {
            const tzArray = query.data.split('_');
            if (tzArray.length === 2 && tzArray[0] === 'TZ') {
                db.getUserById(query.from.id)
                    .then(res => {
                        const tz = tzArray[1];
                        db.updateUserTz(query.from.id, tz)
                            .then(() => {
                                this.bot.editMessageText(i18n.t('tz.chosen', {
                                    lng: res.lang,
                                    offset: `GMT${parseInt(tz) > 0 ? '+' : ''}${+tz / 60}`
                                }), {
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
        buildTzKeyboardArray().then(array => {
            this.bot.sendMessage(chat_id, i18n.t('please.chose.local.time', {lng}), {
                reply_markup: {
                    inline_keyboard: array,
                }
            });
        });
    }

    sendAreYouOkRequest(chat_id, lng, callback_data) {
        return this.bot.sendMessage(chat_id, i18n.t('are.you.ok', {lng}), {
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
        this.bot.onText(/🚫/, (msg) => {
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
        });
    }

    startHandler() {
        this.bot.onText(/\/start/, (msg) => {
            const username = msg.from.username !== undefined ? msg.from.username.toLowerCase() : null;
            db.addNewUser(msg.from.id, username)
                .then(() => {
                        this.requestChooseKeyboard(msg.chat.id);
                    }
                )
                .catch(err => {
                    console.log(err);
                });
        });
    }

    changeTimeZoneHandler() {
        this.bot.onText(/\/change_timezone/, (msg) => {
            db.getUserById(msg.from.id)
                .then(res => {
                    this.requestTzUpdate(msg.chat.id, res.lang);
                })
            ;
        });
    }

    sendAreYouOkReport(chat_id, lng, report: any) {
        const reportTextArray = [];
        for (const uid in report) {
            const sub = report[uid];
            const status = i18n.t(sub.status, {lng});
            reportTextArray.push(`*[${sub.alias ? sub.alias : uid}](tg://user?id=${uid})*: ${status}`);
        }
        this.bot.sendMessage(chat_id, i18n.t('report', {lng, report: reportTextArray.join('\n')}), {
            parse_mode: 'MarkdownV2'
        });
    }

    processSharedPhoneContact(uid: number, message_id: number, phoneNumber: PhoneNumber, lng: string, alias?: string) {
        if (!phoneNumber.isValid()) {
            this.sendInvalidPhoneReply(uid, message_id, lng);
        }
        if (phoneNumber.country === 'RU') {
            this.sendRussianWarshipGoToHellReply(uid, message_id);
        }
        const phoneInter = phoneNumber.formatInternational().replace(/[\s+]/g, '');
        if (!alias) {
            alias = phoneInter.replace(phoneInter.substring(3, 8), '*****');
        }
        const phoneHash = hash(phoneInter);
        db.getUserByPhoneHash(phoneHash)
            .then(res => {
                if (!res) {
                    db.addToWaitSubsByPhoneHash(uid, phoneHash, alias);
                } else {
                    db.addOrUpdateUserSubs(uid, res.uid, alias);
                }
                this.sendSubAddedReply(uid, message_id, lng, alias);
            })
        ;
    }

    sendHelpMessage(chat_id, lng, offset = 120, default_header = false) {
        const gmt = (offset > 0 ? '+' : '') + (offset / 60).toString();
        const timeHeader = default_header
            ? i18n.t('the.time.is.set.default', {lng})
            : i18n.t('the.time.is.set.real', {lng, offset: gmt});
        this.bot.sendMessage(chat_id, i18n.t('help', {lng, time_set_header: timeHeader}), {
            parse_mode: 'HTML',
            disable_web_page_preview: true,
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: i18n.t('label.share.bot', {lng}),
                            switch_inline_query: i18n.t('call.join', {lng})
                        }
                    ]
                ]
            }
        });
    }

    sendCommandHelpMessage(chat_id, lng) {
        this.bot.sendMessage(chat_id, i18n.t('command.help', {lng}), {
            parse_mode: 'HTML',
            disable_web_page_preview: true
        });
    }

    init() {
        this.startHandler();
        this.changeTimeZoneHandler();
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




