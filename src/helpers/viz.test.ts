/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as core from '@viz-cx/core'

// A single shared fake client returned by the mocked createClient. Its methods
// are vi.fn()s we configure per-test. The real account()/viz()/shares() helpers
// are kept so we exercise the facade's actual argument building and validation.
const mockClient = vi.hoisted(() => ({
    transferToVesting: vi.fn(),
    award: vi.fn(),
    withdrawVesting: vi.fn(),
    api: {
        getAccounts: vi.fn(),
        getDynamicGlobalProperties: vi.fn(),
        getBlockHeader: vi.fn(),
        getOpsInBlock: vi.fn(),
    },
}))

vi.mock('@viz-cx/core', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@viz-cx/core')>()
    return {
        ...actual,
        createClient: vi.fn(() => mockClient),
    }
})

// Imported after the mock is registered so the VIZ.origin singleton's
// constructor picks up the mocked createClient.
import { VIZ } from './viz'

const viz = VIZ.origin
const createClientMock = core.createClient as unknown as ReturnType<typeof vi.fn>

beforeEach(() => {
    vi.clearAllMocks()
    process.env.ACCOUNT = 'vizbot'
    process.env.WIF = '5wif'
    process.env.BALANCE = '40.000000'
})

describe('VIZ.pay', () => {
    it('transfers to vesting with the account name and a VIZ asset', async () => {
        mockClient.transferToVesting.mockResolvedValue({ id: 'tx', blockNum: 1 })
        await viz.pay('alice', 1)
        expect(mockClient.transferToVesting).toHaveBeenCalledTimes(1)
        const arg = mockClient.transferToVesting.mock.calls[0][0]
        expect(String(arg.to)).toBe('alice')
        expect(arg.amount.toString()).toBe('1.000 VIZ')
    })

    it('formats fractional amounts to 3 decimals', async () => {
        mockClient.transferToVesting.mockResolvedValue({})
        await viz.pay('alice', 1.5)
        expect(mockClient.transferToVesting.mock.calls[0][0].amount.toString()).toBe('1.500 VIZ')
    })

    it('accepts short account names the strict validator would reject (e.g. "id")', async () => {
        mockClient.transferToVesting.mockResolvedValue({})
        await viz.pay('id', 1)
        expect(String(mockClient.transferToVesting.mock.calls[0][0].to)).toBe('id')
    })
})

describe('VIZ.isAccountExists', () => {
    it('returns true when the account is found', async () => {
        mockClient.api.getAccounts.mockResolvedValue([{ name: 'alice' }])
        await expect(viz.isAccountExists('alice')).resolves.toBe(true)
        expect(mockClient.api.getAccounts).toHaveBeenCalledWith(['alice'])
    })

    it('returns false when the lookup is empty', async () => {
        mockClient.api.getAccounts.mockResolvedValue([])
        await expect(viz.isAccountExists('ghost')).resolves.toBe(false)
    })

    it('does not validate/throw on malformed input (graceful false)', async () => {
        mockClient.api.getAccounts.mockResolvedValue([])
        await expect(viz.isAccountExists('Not A Login')).resolves.toBe(false)
    })
})

describe('VIZ.getAccount', () => {
    it('returns the first account from the response', async () => {
        const account = { name: 'alice', balance: '1.000 VIZ' }
        mockClient.api.getAccounts.mockResolvedValue([account])
        await expect(viz.getAccount('alice')).resolves.toBe(account)
    })

    it('throws when the account is missing', async () => {
        mockClient.api.getAccounts.mockResolvedValue([])
        await expect(viz.getAccount('ghost')).rejects.toThrow('Account not found in response')
    })
})

describe('VIZ.makeAward', () => {
    const account = {
        vesting_shares: '100.000000',
        delegated_vesting_shares: '0.000000',
        received_vesting_shares: '0.000000',
    }
    const dgp = { total_reward_shares: '9000000', total_reward_fund: '1000.000' }

    it('broadcasts an award and computes the reward', async () => {
        mockClient.award.mockResolvedValue({ id: 'tx' })
        mockClient.api.getDynamicGlobalProperties.mockResolvedValue(dgp)

        const reward = await viz.makeAward('winner', 'memo-payload', 100, null, account)

        expect(mockClient.award).toHaveBeenCalledTimes(1)
        const arg = mockClient.award.mock.calls[0][0]
        expect(String(arg.receiver)).toBe('winner')
        expect(arg.energy).toBe(100)
        expect(arg.customSequence).toBe(0)
        expect(arg.memo).toBe('memo-payload')
        expect(arg.beneficiaries).toEqual([])
        // effectiveShares=100, voteShares=1e6, fund=1e6, shares=1e7 => reward=100 => *0.995
        expect(reward).toBe('99.5000')
    })

    it('adds a 10% beneficiary to the referrer and discounts the reward', async () => {
        mockClient.award.mockResolvedValue({ id: 'tx' })
        mockClient.api.getDynamicGlobalProperties.mockResolvedValue(dgp)

        const reward = await viz.makeAward('winner', 'memo', 100, 'bob', account)

        expect(mockClient.award.mock.calls[0][0].beneficiaries).toEqual([
            { account: 'bob', weight: 1000 },
        ])
        // 99.5 * 0.9
        expect(reward).toBe('89.5500')
    })
})

describe('VIZ.unstakeExcessShares', () => {
    it('withdraws the vesting above the configured balance', async () => {
        mockClient.api.getAccounts.mockResolvedValue([{ vesting_shares: '100.000000' }])
        mockClient.withdrawVesting.mockResolvedValue({ id: 'tx', blockNum: 7 })

        const result = await viz.unstakeExcessShares()

        const arg = mockClient.withdrawVesting.mock.calls[0][0]
        // 100 vesting - 40 balance = 60 SHARES
        expect(arg.vestingShares.toString()).toBe('60.000000 SHARES')
        expect(result).toEqual({ id: 'tx', blockNum: 7 })
    })
})

describe('VIZ.getBlockHeader', () => {
    it('returns the header', async () => {
        const header = { previous: '0x', witness: 'val', timestamp: 't' }
        mockClient.api.getBlockHeader.mockResolvedValue(header)
        await expect(viz.getBlockHeader(42)).resolves.toBe(header)
        expect(mockClient.api.getBlockHeader).toHaveBeenCalledWith(42)
    })

    it('throws when the header is null', async () => {
        mockClient.api.getBlockHeader.mockResolvedValue(null)
        await expect(viz.getBlockHeader(42)).rejects.toThrow('Block header not found')
    })
})

describe('VIZ.getOpsInBlock', () => {
    it('defaults to virtual-only and passes a boolean', async () => {
        mockClient.api.getOpsInBlock.mockResolvedValue([])
        await viz.getOpsInBlock(99)
        expect(mockClient.api.getOpsInBlock).toHaveBeenCalledWith(99, true)
    })

    it('forwards an explicit onlyVirtual flag', async () => {
        mockClient.api.getOpsInBlock.mockResolvedValue([])
        await viz.getOpsInBlock(99, false)
        expect(mockClient.api.getOpsInBlock).toHaveBeenCalledWith(99, false)
    })
})

describe('VIZ.changeNode', () => {
    it('rebuilds the client with a legacy transport against a known endpoint', () => {
        viz.changeNode()
        expect(createClientMock).toHaveBeenCalledTimes(1)
        const opts = createClientMock.mock.calls[0][0]
        expect(['https://node.viz.cx', 'https://api.viz.world']).toContain(opts.transport.endpoint)
        expect(opts.account).toBe('vizbot')
        expect(opts.activeKey).toBe('5wif')
    })

    it('switches to the other node on the next change', () => {
        viz.changeNode()
        const first = createClientMock.mock.calls[0][0].transport.endpoint
        viz.changeNode()
        const second = createClientMock.mock.calls[1][0].transport.endpoint
        expect(second).not.toBe(first)
    })
})
