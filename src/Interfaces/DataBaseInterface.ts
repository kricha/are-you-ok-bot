export default interface DataBaseInterface {
    addNewUser(uid: number, username: string);

    setUserInActive(uid);

    getAllActiveUsers();

    updateUserTz(uid: number, tz: number);

    updateUserLang(uid: number, lng: string);

    updateAreYouOkField(uid: number, key: string): void

    addOrUpdateUserSubs(uid, key, alias);

    getAllWaitSubsByPhoneHash(phoneHash: string);

    getUserSubsById(uid);

    getUsersByIds(ids);

    deleteWaitUserPhoneSubById(id: number): void

    deleteWaitUserUsernameSubById(id: number): void

    getAllWaitSubsByUsername(username: string);

    getWaitAnswerByUid(uid);

    addToWaitAnswer(uid, ts, message_id);

    setWaitQueueProcessed(uid): void

    deleteFromWaitAnswer(uid);

    getAllWaitingAnswers(ts);

    getAllSubscribersByUid(uid);
}/* eslint-disable-line */
