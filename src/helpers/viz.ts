export class VIZ {
    public static vizJS = require("viz-js-lib")

    constructor() {
        this.changeNode()
    }

    public changeNode() {
        let nodes = [
            'https://node.viz.cx/',
            'https://viz.lexai.host/',
            'https://api.viz.world/'
        ]
        const oldNode = VIZ.vizJS.config.get('websocket')
        nodes = nodes.filter(e => e !== oldNode)
        const node = nodes[Math.floor(Math.random() * nodes.length)]
        console.log('Change public node from %s to %s', oldNode, node)
        VIZ.vizJS.config.set('websocket', node)
    }

    public pay(to: string, amount: number) {
        const from = process.env.ACCOUNT
        const wif = process.env.WIF
        const stringAmount = amount.toFixed(3) + ' VIZ'
        return this.transferToVesting(wif, from, to, stringAmount)
    }

    public makeAward(receiver: string, memo: string, energy: number, referrer: string = null, account: any) {
        const from = process.env.ACCOUNT
        const wif = process.env.WIF
        return this.award(receiver, from, wif, energy, memo, referrer, account)
    }

    private award(receiver: string, from: string, wif: string, energy: number, memo: string, referrer: string, account: any) {
        return new Promise((resolve, reject) => {
            const custom_sequence = 0
            const beneficiaries = []
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
                            let finalReward = reward * 0.995 // because final value could be less
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

    public unstakeExcessShares() {
        return new Promise((resolve, reject) => {
            const from = process.env.ACCOUNT
            const wif = process.env.WIF
            this.getAccount(from)
                .then(
                    account => {
                        const amount = parseFloat(account['vesting_shares']) - parseFloat(process.env.BALANCE)
                        const shares = `${amount.toFixed(6)} SHARES`
                        this.unstake(wif, from, shares)
                            .then(unstakeResult => resolve(unstakeResult),
                                rejected => reject(rejected))
                    },
                    rejected => reject(rejected)
                )
                .catch(err => reject(err))
        })

    }

    private unstake(wif: string, username: string, shares: string) {
        return new Promise((resolve, reject) => {
            VIZ.vizJS.broadcast.withdrawVesting(
                wif,
                username,
                shares,
                function (err, result) {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(result)
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

    getOpsInBlock(blockID: number, onlyVirtual: boolean = true): Promise<Object> {
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

    private transferToVesting(wif, from, to, amount: string): Promise<Object> {
        return new Promise((resolve, reject) => {
            VIZ.vizJS.broadcast.transferToVesting(wif, from, to, amount, function (err, result) {
                if (err) {
                    reject(err)
                } else {
                    resolve(result)
                }
            })
        })
    }
}
