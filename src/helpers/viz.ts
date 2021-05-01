export class VIZ {
    public static vizJS = require("viz-js-lib")

    constructor() {
        VIZ.vizJS.config.set('websocket', 'https://node.viz.cx/')
    }

    public changeNode() {
        var nodes = [
            'https://node.viz.cx/',
            'https://node.viz.plus/',
            'https://node.viz.media/',
            'https://viz-node.dpos.space/',
            'https://vizrpc.lexai.host/',
            'https://viz.lexai.host/',
        ]
        const oldNode = VIZ.vizJS.config.get('websocket')
        nodes = nodes.filter(e => e !== oldNode)
        const node = nodes[Math.floor(Math.random() * nodes.length)]
        console.log('Change public node from %s to %s', oldNode, node)
        VIZ.vizJS.config.set('websocket', node)
    }

    public pay(to: string, amount: number, memo: string) {
        const from = process.env.ACCOUNT
        const wif = process.env.ACTIVE
        const stringAmount = amount.toFixed(3) + ' VIZ'
        return this.transfer(wif, from, to, stringAmount, memo)
    }

    public makeAward(receiver: string, memo: string, energy: number, referrer: string = null, account: any) {
        const from = process.env.ACCOUNT
        const wif = process.env.REGULAR
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
                function (err, _) {
                    if (err) {
                        reject(err)
                        return
                    }
                    VIZ.vizJS.api.getDynamicGlobalProperties(function (err, dgp) {
                        if (err) {
                            reject(err)
                        } else {
                            const effectiveShares = parseFloat(account['vesting_shares']) - parseFloat(account['delegated_vesting_shares']) + parseFloat(account['received_vesting_shares'])
                            const voteShares = effectiveShares * 100 * energy
                            const totalRewardShares = parseFloat(dgp['total_reward_shares']) + voteShares
                            const totalRewardFund = parseFloat(dgp['total_reward_fund']) * 1000
                            const reward = Math.ceil(totalRewardFund * voteShares / totalRewardShares) / 1000
                            var finalReward = reward * 0.995 // because final value could be less
                            if (beneficiaries.length > 0) {
                                finalReward = finalReward * 0.9
                            }
                            resolve(finalReward.toFixed(4))
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

    getBlockHeader(blockID: number): Promise<Object> {
        return new Promise((resolve, reject) => {
            VIZ.vizJS.api.getBlockHeader(blockID, function (err, result) {
                if (err) {
                    reject(err)
                } else {
                    resolve(result)
                }
            })
        })
    }

    getOpsInBlock(blockID: number, onlyVirtual: Boolean = true): Promise<Object> {
        const virtualOpsOnly = onlyVirtual ? 1 : 0
        return new Promise((resolve, reject) => {
            VIZ.vizJS.api.getOpsInBlock(blockID, virtualOpsOnly, function (err, result) {
                if (err) {
                    reject(err)
                } else {
                    resolve(result)
                }
            })
        })
    }

    private transfer(wif, from, to, amount, memo: string): Promise<Object> {
        return new Promise((resolve, reject) => {
            VIZ.vizJS.broadcast.transfer(wif, from, to, amount, memo, function (err, result) {
                if (err) {
                    reject(err)
                } else {
                    resolve(result)
                }
            })
        })
    }
}
