/* eslint-disable no-param-reassign */
const pmx = require('pmx');
const Sender = require('./sender');

const config = pmx.initModule();

class MessageQueue {
    constructor() {
        this.cache = [];
        this.maxMsgLength = 1900;
        this.rate = config.rate;
        this.queueMax = config.queueMax >= 10 ? config.queueMax : 100;
    }

    /**
     * Add a message to the queue
     * @param {String} message Message to be added to queue
     */
    addToQueue(message) {
        if (typeof message !== 'string') return;
        if (message.length > this.maxMsgLength) {
            const messages = this.split(message);
            messages.forEach((m) => this.cache.push(m));
        } else this.cache.push(message);
    }

    /**
     * Split a message to maximum 1900 characters, by newline
     * @param {String} output Message to split
     * @returns {Array<String>} Messages split by \n
     */
    split(output) {
        const msgArray = [];
        let str = '';
        let pos;
        while (output.length > 0) {
            pos = output.length > this.maxMsgLength ? output.lastIndexOf('\n', this.maxMsgLength) : output.length;
            if (pos > this.maxMsgLength) {
                pos = this.maxMsgLength;
            }
            str = output.substr(0, pos);
            output = output.substr(pos);
            msgArray.push(str);
        }
        return msgArray;
    }

    run() {
        Sender.run();
        setInterval(() => {
            const joined = this.cache.join('\n');
            this.cache = [];
            const clean = joined.replace(/\n```\n```js\n|\n```\n\n```js\n/g, '\n');
            if (!clean) return;
            if (clean.length > 1900) {
                const split = this.split(clean);
                let isCode = false;
                split.forEach((m) => {
                    if (isCode) m = `\`\`\`js\n${m}`;
                    if ((m.match(/```js\n/g) || []).length > (m.match(/\n```/g) || []).length) {
                        isCode = true;
                        m = `${m}\n\`\`\``;
                    }
                    if (isCode && (m.match(/```js\n/g) || []).length <= (m.match(/\n```/g) || []).length) isCode = false;
                    Sender.addToQueue(m);
                });
            } else Sender.addToQueue(clean);
        }, this.rate * 1000);
    }
}

module.exports = new MessageQueue();
