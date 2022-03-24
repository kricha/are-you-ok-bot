export default interface DataBaseInterface {
    addNewUser(uid: number, username: string);

    setUserInActive(uid);

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

    addToWaitAnswer(uid, ts, message_id);

    deleteFromWaitAnswer(uid);

    getAllWaitingAnswers(ts);

    getAllSubscriberByUid(uid);
}
