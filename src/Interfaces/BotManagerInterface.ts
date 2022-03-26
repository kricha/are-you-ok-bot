import TelegramBot from 'node-telegram-bot-api';
import {PhoneNumber} from 'libphonenumber-js';

export default interface BotManagerInterface {
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
}/* eslint-disable-line */
