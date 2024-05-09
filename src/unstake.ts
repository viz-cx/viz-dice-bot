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
        .then(result => console.log(result['operations'][0][1]))
        .catch(() => console.error("Unsuccessful vesting withdrawal!"))
}
