export class VIZ {
    public static vizJS = require("viz-js-lib")

    constructor() {
        this.findBestNode()
    }

    private findBestNode() {
        // TODO: need more nodes!
        VIZ.vizJS.config.set('websocket', 'https://api.viz.world')
    }

    public payout(receiver: string, memo: string, percent: number, referrer: string = null, account: any) {
        const from = process.env.ACCOUNT
        const wif = process.env.WIF
        const energy = parseInt((100 * percent).toFixed(0))
        return this.award(receiver, from, wif, energy, memo, referrer, account)
    }

    private award(receiver: string, from: string, wif: string, energy: number, memo: string, referrer: string, account: any) {
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
                        return
                    }
                    console.log(account)
                    VIZ.vizJS.api.getDynamicGlobalProperties(function (err, dgp) {
                        if (err) {
                            reject(err)
                        } else {
                            const effectiveShares = parseFloat(account['vesting_shares']) - parseFloat(account['delegated_vesting_shares']) + parseFloat(account['received_vesting_shares'])
                            const voteShares = effectiveShares * 100 * energy
                            const totalRewardShares = parseFloat(dgp['total_reward_shares']) + voteShares
                            const totalRewardFund = parseFloat(dgp['total_reward_fund']) * 1000
                            const reward = Math.ceil(totalRewardFund * voteShares / totalRewardShares) / 1000
                            const finalReward = reward * 0.95 // because final value could be less
                            resolve(finalReward.toFixed(3))
                        }
                    })
                })
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

    getDynamicGlobalProperties(): Promise<Object> {
        return new Promise((resolve, reject) => {
            VIZ.vizJS.api.getDynamicGlobalProperties(function (err, result) {
                if (err) {
                    reject(err)
                } else {
                    resolve(result)
                }
            })
        })
    }

}
