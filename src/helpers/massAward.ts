import { getActiveUsers } from "../models/User"
import { VIZ } from "./viz";

export function setupMassAward() {
    const hoursInterval = 1
    setInterval(function () {
        var date = new Date()
        date.setHours(date.getHours() - hoursInterval)
        getActiveUsers(date).then(
            users => {
                const viz = new VIZ()
                const logins = users
                    .filter(user => user.login && user.postingKey)
                    .map(user => user.login)
                const energyRestoreDays = 5
                const energy = Math.trunc(10000 / energyRestoreDays / 24 * hoursInterval)
                viz.massAward(process.env.ACCOUNT, process.env.WIF, '🎲 🎯 🏀', energy, logins).then(
                    _ => console.log('Successfully mass awarded', logins.length, 'accounts'),
                    err => console.log('Mass award failed:', err)
                )
            },
            err => console.log('Mass award error:', err)
        )
    }, hoursInterval * 60 * 60 * 1000)
}
