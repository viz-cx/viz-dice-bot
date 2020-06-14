export class VIZ {
    public viz: any

    constructor() {
        this.viz = require("viz-js-lib")
        this.findBestNode()
    }

    public findBestNode() {
        // TODO: need more nodes!
        this.viz.config.set('websocket', 'https://solox.world')
    }
}
