require('request');
const request = require('request-promise');
const Listener = require('./pm2-listener');

class Sender {
    constructor() {
        this.queue = [];
        this.rate = Listener.rate;
        this.limiter = [];
    }

    /**
     * Starts message sending processor
     */
    async run() {
        this.startRatelimit();
        setInterval(async () => {
            if (this.limiter.length >= 30) return;
            if (!this.queue.length) return;
            try {
                await request({
                    method: 'POST', uri: Listener.webhook, body: { content: this.queue[0] }, json: true, resolveWithFullResponse: true,
                });
            } catch (error) {
                let errorMessage = `${error.statusCode} ${error.name}: ${error.error.code} - ${error.error.message}`;
                if (error.statusCode === 429) errorMessage += '\nRate limits are not working, please open an issue at https://github.com/bsian03/discord-pm2-logs';
                else if (error.statusCode === 401
                    || error.statusCode === 403
                    || error.statusCode === 404) {
                    errorMessage += '\nPlease try again with another webhook'
                + '\nFor more info regarding webhooks, please see https://support.discordapp.com/hc/en-us/articles/228383668-Intro-to-Webhooks';
                }
                console.error(errorMessage);
                return;
            }
            this.queue = this.queue.slice(1);
            this.limiter.push(Date.now());
        }, this.rate);
    }

    /**
     * Starts rate limiter
     */
    startRatelimit() {
        setInterval(() => {
            this.limiter = this.limiter.filter((t) => t + 60000 > Date.now());
        });
    }

    /**
     * Add a message to the queue
     * @param {String} content Message to add to queue
     */
    addToQueue(content) {
        this.queue.push(content);
    }
}

module.exports = new Sender();
