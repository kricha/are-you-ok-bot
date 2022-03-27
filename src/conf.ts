import nconf from 'nconf';

export default nconf.file({file: './config.json'}).defaults({
    botToken: null,
    ownerId: null
});
