'use strict'

export class VIZ {
    public static vizJS = require("viz-js-lib")

    private static accountsCache = {}

    constructor() {
        VIZ.accountsCache = {}
        this.findBestNode()
    }

    public findBestNode() {
        // TODO: need more nodes!
        VIZ.vizJS.config.set('websocket', 'https://solox.world')
    }

    public award(login: string, wif: string, memo: string, referrer: string) {
        return new Promise((resolve, reject) => {
            var receiver = process.env.ACCOUNT
            var energy = 100 * parseInt(process.env.PERCENT)
            var custom_sequence = 0
            var beneficiaries = []
            if (referrer) {
                beneficiaries.push({ account: referrer, weight: 1000 })
            }
            VIZ.vizJS.broadcast.award(
                wif,
                login,
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

    public massAward(login: string, wif: string, memo: string, recipients: [string]) {
        return new Promise((resolve, reject) => {
            if (recipients.length <= 0) {
                return
            }
            var receiver = recipients[0]
            var energy = 100 * parseInt(process.env.PERCENT)
            var custom_sequence = 0
            var beneficiaries = []
            if (recipients.length > 1) {
                const weight = 10000 / (recipients.length - 1)
                for (var i = 1; i < recipients.length; i++) {
                    beneficiaries.push({ account: recipients[i], weight: weight })
                }
            }
            VIZ.vizJS.broadcast.award(
                wif,
                login,
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

    public payout(to: string, amount: number, memo: string): Promise<object> {
        return new Promise((resolve, reject) => {
            const wif = process.env.WIF
            const from = process.env.ACCOUNT
            if (amount < 0.001) {
                amount = 0.001
            }
            const amountWithSymbol = `${amount.toFixed(3)} VIZ`
            VIZ.vizJS.broadcast.transfer(wif, from, to, amountWithSymbol, memo, function (err, result) {
                if (err) {
                    reject(err)
                    return
                }
                resolve(result)
            })
        })
    }

    public getAccountShares(login: string): Promise<number> {
        return new Promise((resolve, reject) => {
            this.getAccount(login)
                .then(
                    account => {
                        const shares = parseFloat(account['vesting_shares'])
                            + parseFloat(account['received_vesting_shares'])
                            - parseFloat(account['delegated_vesting_shares'])
                        resolve(shares)
                    },
                    err => reject(err)
                )
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

    public calculatePayout(accountShares: number): Promise<number> {
        return new Promise((resolve, reject) => {
            VIZ.vizJS.api.getDynamicGlobalProperties(function (err, result) {
                if (err) {
                    reject(err)
                    return
                }
                const total_vesting_fund = parseFloat(result["total_vesting_fund"])
                const total_vesting_shares = parseFloat(result["total_vesting_shares"])
                const total_reward_fund = parseFloat(result["total_reward_fund"])
                const total_reward_shares = parseFloat(result["total_reward_shares"])
                const percent = parseInt(process.env.PERCENT)
                const payoutShares = accountShares * percent / (total_reward_shares / 1000000) * total_reward_fund / 100
                const payoutVIZ = VIZ.vizJS.formatter.sharesToVIZ(payoutShares, total_vesting_shares, total_vesting_fund).toFixed(3)
                resolve(payoutVIZ)
            })
        })
    }

    public getAccount(login: string): Promise<Object> {
        return new Promise((resolve, reject) => {
            if (VIZ.accountsCache && VIZ.accountsCache[login]) {
                resolve(VIZ.accountsCache[login])
                return
            }
            VIZ.vizJS.api.getAccounts([login], function (err, result) {
                if (err) {
                    reject(err)
                } else {
                    const account = result[0]
                    if (account) {
                        VIZ.accountsCache[login] = account
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
