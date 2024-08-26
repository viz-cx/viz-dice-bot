import { VIZ } from "./helpers/viz"

const viz = VIZ.origin

export function startUnstaking() {
    setTimeout(() => {
        console.log("Start unstaking")
        unstake()
        startUnstaking()
    }, 60 * 60 * 24 * 1000 + 30000)
}

function unstake() {
    viz.unstakeExcessShares()
        .then(result => {
            const operations: unknown = result['operations'];
            if (Array.isArray(operations) && operations.length > 0) {
                const operation = operations[0] as [string, Record<string, unknown>];
                console.log(operation[1]);
            } else {
                console.error("No operations found!");
            }
        })
        .catch(() => console.error("Unsuccessful vesting withdrawal!"))
}
