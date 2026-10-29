import { runClassicSimulations } from '../packages/rules-classic/src/simulation.js'

const reports = Array.from({ length: 7 }, (_, index) => {
  const playerCount = index + 2
  return {
    playerCount,
    ...runClassicSimulations({
      runs: playerCount < 8 ? 143 : 142,
      seed: 20_260_228 + index * 10_000,
      playerCount,
    }),
  }
})
console.log(JSON.stringify({
  completedGames: reports.reduce((total, report) => total + report.completedGames, 0),
  totalActions: reports.reduce((total, report) => total + report.totalActions, 0),
  reports,
}, null, 2))
