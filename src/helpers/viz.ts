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
    type Transport,
    type SignedTransaction,
    type TransactionResult,
} from '@viz-cx/core'

// The public VIZ nodes (node.viz.cx, api.viz.world) only speak the legacy
// JSON-RPC envelope: {"method":"call","params":[api, method, args]}. The
// transport bundled with @viz-cx/core sends appbase-style dotted methods
// ("database_api.get_dynamic_global_properties"), which those nodes reject
// with a "Bad Cast" error. This adapter translates the library's dotted calls
// back into the legacy envelope so we can keep using the typed client.
// broadcast_transaction_synchronous holds the connection open until the
// transaction is confirmed in a block, so the broadcast (write) path needs a
// more generous timeout than the fast read calls.
const READ_TIMEOUT_MS = 15000
const BROADCAST_TIMEOUT_MS = 45000

function createLegacyTransport(endpoint: string): Transport & { endpoint: string } {
    let nextId = 1

    async function rpc<T>(method: string, params: unknown[], timeoutMs = READ_TIMEOUT_MS): Promise<T> {
        const dot = method.indexOf('.')
        const api = method.slice(0, dot)
        const apiMethod = method.slice(dot + 1)
        const id = nextId++
        const ac = new AbortController()
        const timer = setTimeout(() => ac.abort(), timeoutMs)
        let res: Response
        try {
            res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id, method: 'call', params: [api, apiMethod, params] }),
                signal: ac.signal,
            })
        } finally {
            clearTimeout(timer)
        }
        const body = await res.json() as { result?: T; error?: { message?: string } }
        if (body.error) {
            throw new Error(`${method}: ${body.error.message ?? JSON.stringify(body.error)}`)
        }
        return body.result
    }

    return {
        endpoint,
        call: rpc,
        broadcast: async (signed: SignedTransaction): Promise<TransactionResult> => {
            const r = await rpc<{ id: string; block_num: number; expiration: string }>(
                'network_broadcast_api.broadcast_transaction_synchronous',
                [signed],
                BROADCAST_TIMEOUT_MS,
            )
            return { id: r.id, blockNum: r.block_num, expiration: r.expiration }
        },
    }
}

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
            transport: createLegacyTransport(this.endpoint),
            account: process.env.ACCOUNT,
            activeKey: process.env.WIF,
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
