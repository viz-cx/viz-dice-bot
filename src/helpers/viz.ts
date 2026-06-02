/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
    createClient,
    account as accountName,
    viz as vizAsset,
    shares as sharesAsset,
    type VizClient,
    type Beneficiary,
} from '@viz-cx/core'

// broadcast_transaction_synchronous holds the connection open until the
// transaction is confirmed in a block, so we use a generous client timeout.
const TIMEOUT_MS = 45000

export class VIZ {
    static origin = new VIZ()

    private nodes = [
        'https://node.viz.cx',
        'https://api.viz.world',
    ]
    private endpoint!: string
    private client!: VizClient

    private constructor() {
        this.changeNode()
    }

    public changeNode() {
        const oldNode = this.endpoint
        const candidates = this.nodes.filter(e => e !== oldNode)
        this.endpoint = candidates[Math.floor(Math.random() * candidates.length)]
        console.log('Change public node from %s to %s', oldNode, this.endpoint)
        this.client = createClient({
            endpoint: this.endpoint,
            account: process.env.ACCOUNT,
            activeKey: process.env.WIF,
            timeoutMs: TIMEOUT_MS,
        })
    }

    public pay(to: string, amount: number) {
        return this.client.transferToVesting({
            to: accountName(to),
            amount: vizAsset(amount.toFixed(3)),
        })
    }

    public makeAward(receiver: string, memo: string, energy: number, referrer: string = null, account: any) {
        return this.award(receiver, energy, memo, referrer, account)
    }

    private async award(receiver: string, energy: number, memo: string, referrer: string, account: any) {
        const beneficiaries: Beneficiary[] = []
        if (referrer) {
            beneficiaries.push({ account: accountName(referrer), weight: 1000 })
        }
        await this.client.award({
            receiver: accountName(receiver),
            energy,
            customSequence: 0,
            memo,
            beneficiaries,
        })
        const dgp = await this.client.api.getDynamicGlobalProperties()
        const effectiveShares = parseFloat(account['vesting_shares']) - parseFloat(account['delegated_vesting_shares']) + parseFloat(account['received_vesting_shares'])
        const voteShares = effectiveShares * 100 * energy
        const totalRewardShares = parseFloat(dgp['total_reward_shares'] as string) + voteShares
        const totalRewardFund = parseFloat(dgp['total_reward_fund'] as string) * 1000
        const reward = Math.ceil(totalRewardFund * voteShares / totalRewardShares) / 1000
        let finalReward = reward * 0.995 // because final value could be less
        if (beneficiaries.length > 0) {
            finalReward = finalReward * 0.9
        }
        return finalReward.toFixed(4)
    }

    public async getAccount(login: string): Promise<object> {
        const result = await this.client.api.getAccounts([login])
        const account = result[0]
        if (!account) {
            throw new Error('Account not found in response')
        }
        return account
    }

    public async unstakeExcessShares() {
        const from = process.env.ACCOUNT
        const account = await this.getAccount(from)
        const amount = parseFloat(account['vesting_shares']) - parseFloat(process.env.BALANCE)
        return this.client.withdrawVesting({
            vestingShares: sharesAsset(amount.toFixed(6)),
        })
    }

    async isAccountExists(login: string): Promise<boolean> {
        const result = await this.client.api.getAccounts([login])
        return result.length > 0
    }

    getDynamicGlobalProperties(): Promise<object> {
        return this.client.api.getDynamicGlobalProperties()
    }

    async getBlockHeader(blockID: number): Promise<object> {
        const result = await this.client.api.getBlockHeader(blockID)
        if (!result) {
            throw new Error('Block header not found')
        }
        return result
    }

    getOpsInBlock(blockID: number, onlyVirtual = true): Promise<object> {
        return this.client.api.getOpsInBlock(blockID, onlyVirtual)
    }
}
