export class VIZ {
    public static vizJS = require("viz-js-lib")

    constructor() {
        this.findBestNode()
    }

    private findBestNode() {
        // TODO: need more nodes!
        VIZ.vizJS.config.set('websocket', 'https://api.viz.world')
    }

    public payout(receiver: string, memo: string, percent: number, referrer: string = null) {
        const from = process.env.ACCOUNT
        const wif = process.env.WIF
        const energy = parseInt((100 * percent).toFixed(0))
        return this.award(receiver, from, wif, energy, memo, referrer)
    }

    private award(receiver: string, from: string, wif: string, energy: number, memo: string, referrer: string) {
        return new Promise((resolve, reject) => {
            var custom_sequence = 0
            var beneficiaries = []
            if (referrer) {
                beneficiaries.push({ account: referrer, weight: 1000 })
            }
            VIZ.vizJS.broadcast.award(
                wif,
                from,
                receiver,
                energy,
                custom_sequence,
                memo,
                beneficiaries,
                function (err, result) {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(result)
                    }
                })
        })
    }

    public getAccountEnergy(login: string): Promise<number> {
        return new Promise((resolve, reject) => {
            this.getAccount(login)
                .then(
                    account => {
                        const energy = parseFloat(account['energy'])
                        resolve(energy)
                    },
                    err => reject(err)
                )
        })
    }

    public getAccount(login: string): Promise<Object> {
        return new Promise((resolve, reject) => {
            VIZ.vizJS.api.getAccounts([login], function (err, result) {
                if (err) {
                    reject(err)
                } else {
                    const account = result[0]
                    if (account) {
                        resolve(account)
                    } else {
                        reject(new Error('Account not found in response'))
                    }
                }
            })
        })
    }

    isAccountExists(login: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            VIZ.vizJS.api.getAccounts([login], function (err, result) {
                if (err) {
                    reject(err)
                } else {
                    resolve(result.length > 0)
                }
            })
        })
    }
}
