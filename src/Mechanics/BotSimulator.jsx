
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { roster } from "./Main Page/CharacterSelection.jsx";
import { getUnlockedCharacters } from "./Currency.js";
import { simulateBattle, simulateTeamBattle } from "./BattleSimulator.js";

import "./BotSimulator.css";

const MAX_ROUNDS = 100;

const DIFFICULTIES = ["Easy", "Normal", "Hard"];

function getFighterName(fighter) {
  return fighter?.data?.name ?? fighter?.name ?? "Unknown Fighter";
}

function getFighterData(fighter) {
  return fighter?.data ?? fighter;
}

function getTeamName(team) {
  return team.map(getFighterName).join(" + ");
}

function getTeamKey(team) {
  return team.map((fighter) => fighter.id).sort().join("+");
}

function getTeamMaximumHealth(team) {
  return team.reduce((total, fighter) => {
    const data = getFighterData(fighter);
    return total + (data.maximumHealth ?? data.health ?? 100);
  }, 0);
}

function chooseRandom(candidates) {
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

// -----------------------------------------------------------------------------
// EXISTING 1v1 SIMULATION HELPERS
// -----------------------------------------------------------------------------

function runStartingOrderSeries(
  firstFighter,
  secondFighter,
  requestedCount,
  firstDifficulty,
  secondDifficulty,
) {
  let firstWins = 0;
  let secondWins = 0;
  let draws = 0;
  let totalRounds = 0;

  let firstWinnerHealthTotal = 0;
  let secondWinnerHealthTotal = 0;

  let firstWinnerRoundsTotal = 0;
  let secondWinnerRoundsTotal = 0;

  let lastResult = null;

  for (let i = 0; i < requestedCount; i++) {
    const result = simulateBattle(
      getFighterData(firstFighter),
      getFighterData(secondFighter),
      {
        difficultyOne: firstDifficulty,
        difficultyTwo: secondDifficulty,
      },
    );

    totalRounds += result.rounds;

    if (result.winner === getFighterName(firstFighter)) {
      firstWins++;
      firstWinnerHealthTotal += result.fighters[0].health;
      firstWinnerRoundsTotal += result.rounds;
    } else if (result.winner === getFighterName(secondFighter)) {
      secondWins++;
      secondWinnerHealthTotal += result.fighters[1].health;
      secondWinnerRoundsTotal += result.rounds;
    } else {
      draws++;
    }

    lastResult = {
      ...result,
      selectedFighterOne: firstFighter,
      selectedFighterTwo: secondFighter,
    };
  }

  return {
    firstFighter,
    secondFighter,
    firstWins,
    secondWins,
    draws,
    completed: firstWins + secondWins + draws,

    averageRounds:
      requestedCount > 0 ? (totalRounds / requestedCount).toFixed(1) : "0.0",

    firstAverageHealthAfterWins:
      firstWins > 0 ? (firstWinnerHealthTotal / firstWins).toFixed(1) : "N/A",

    secondAverageHealthAfterWins:
      secondWins > 0
        ? (secondWinnerHealthTotal / secondWins).toFixed(1)
        : "N/A",

    firstAverageRoundsToWin:
      firstWins > 0 ? (firstWinnerRoundsTotal / firstWins).toFixed(1) : "N/A",

    secondAverageRoundsToWin:
      secondWins > 0
        ? (secondWinnerRoundsTotal / secondWins).toFixed(1)
        : "N/A",

    lastResult,
  };
}

function createFighterRecord(fighter) {
  return {
    id: fighter.id,
    name: getFighterName(fighter),

    wins: 0,
    losses: 0,
    draws: 0,
    battles: 0,

    totalRounds: 0,
    totalRoundsToWin: 0,
    totalHealthAfterWins: 0,

    startsFirstBattles: 0,
    startsFirstWins: 0,

    startsSecondBattles: 0,
    startsSecondWins: 0,
  };
}

function recordFighterBattle(
  fighterStats,
  fighter,
  ownHealth,
  result,
  position,
) {
  const stats = fighterStats[fighter.id];
  const won = result.winner === getFighterName(fighter);
  const drew = result.winner === null;

  stats.battles++;
  stats.totalRounds += result.rounds;

  if (position === "first") {
    stats.startsFirstBattles++;
    if (won) stats.startsFirstWins++;
  } else {
    stats.startsSecondBattles++;
    if (won) stats.startsSecondWins++;
  }

  if (won) {
    stats.wins++;
    stats.totalHealthAfterWins += ownHealth;
    stats.totalRoundsToWin += result.rounds;
  } else if (drew) {
    stats.draws++;
  } else {
    stats.losses++;
  }
}

function createFighterLeaderboard(fighterStats, availableFighters) {
  return Object.values(fighterStats)
    .map((fighter) => {
      const winRate =
        fighter.battles > 0 ? (fighter.wins / fighter.battles) * 100 : 0;

      const firstWinRate =
        fighter.startsFirstBattles > 0
          ? (fighter.startsFirstWins / fighter.startsFirstBattles) * 100
          : 0;

      const secondWinRate =
        fighter.startsSecondBattles > 0
          ? (fighter.startsSecondWins / fighter.startsSecondBattles) * 100
          : 0;

      const startingOrderScore = (firstWinRate + secondWinRate) / 2;

      const averageRounds =
        fighter.battles > 0 ? fighter.totalRounds / fighter.battles : 0;

      const averageRoundsToWin =
        fighter.wins > 0 ? fighter.totalRoundsToWin / fighter.wins : null;

      const averageHealthAfterWins =
        fighter.wins > 0 ? fighter.totalHealthAfterWins / fighter.wins : null;

      const fighterData = availableFighters.find(
        (availableFighter) => availableFighter.id === fighter.id,
      );

      const maximumHealth =
        getFighterData(fighterData)?.maximumHealth ??
        getFighterData(fighterData)?.health ??
        100;

      const healthScore =
        averageHealthAfterWins !== null && maximumHealth > 0
          ? Math.min(
              100,
              Math.max(0, (averageHealthAfterWins / maximumHealth) * 100),
            )
          : 50;

      const speedScore =
        averageRoundsToWin !== null
          ? Math.max(
              0,
              Math.min(
                100,
                ((MAX_ROUNDS - averageRoundsToWin) / MAX_ROUNDS) * 100,
              ),
            )
          : 50;

      const overallScore =
        winRate * 0.6 +
        startingOrderScore * 0.2 +
        healthScore * 0.1 +
        speedScore * 0.1;

      return {
        ...fighter,
        winRate: winRate.toFixed(1),
        firstWinRate: firstWinRate.toFixed(1),
        secondWinRate: secondWinRate.toFixed(1),
        startingOrderScore: startingOrderScore.toFixed(1),
        healthScore: healthScore.toFixed(1),
        speedScore: speedScore.toFixed(1),
        overallScore: overallScore.toFixed(1),
        averageRounds: averageRounds.toFixed(1),

        averageRoundsToWin:
          averageRoundsToWin !== null ? averageRoundsToWin.toFixed(1) : "N/A",

        averageHealthAfterWins:
          averageHealthAfterWins !== null
            ? averageHealthAfterWins.toFixed(1)
            : "N/A",
      };
    })
    .sort(
      (a, b) =>
        Number(b.overallScore) - Number(a.overallScore) ||
        Number(b.winRate) - Number(a.winRate) ||
        b.wins - a.wins,
    );
}

// -----------------------------------------------------------------------------
// NEW 2v2 SIMULATION HELPERS
// -----------------------------------------------------------------------------

function runTeamStartingOrderSeries(
  firstTeam,
  secondTeam,
  requestedCount,
  firstDifficulty,
  secondDifficulty,
) {
  let firstWins = 0;
  let secondWins = 0;
  let draws = 0;
  let totalRounds = 0;

  let firstWinnerHealthTotal = 0;
  let secondWinnerHealthTotal = 0;
  let firstWinnerRoundsTotal = 0;
  let secondWinnerRoundsTotal = 0;

  let lastResult = null;

  for (let i = 0; i < requestedCount; i++) {
    const result = simulateTeamBattle(
      firstTeam.map(getFighterData),
      secondTeam.map(getFighterData),
      {
        difficultyOne: firstDifficulty,
        difficultyTwo: secondDifficulty,
      },
    );

    totalRounds += result.rounds;

    const firstTeamHealth = result.teams[0].reduce(
      (total, fighter) => total + Math.max(0, fighter.health),
      0,
    );

    const secondTeamHealth = result.teams[1].reduce(
      (total, fighter) => total + Math.max(0, fighter.health),
      0,
    );

    if (result.winner === "Team 1") {
      firstWins++;
      firstWinnerHealthTotal += firstTeamHealth;
      firstWinnerRoundsTotal += result.rounds;
    } else if (result.winner === "Team 2") {
      secondWins++;
      secondWinnerHealthTotal += secondTeamHealth;
      secondWinnerRoundsTotal += result.rounds;
    } else {
      draws++;
    }

    lastResult = {
      ...result,
      selectedTeamOne: firstTeam,
      selectedTeamTwo: secondTeam,
    };
  }

  return {
    firstTeam,
    secondTeam,
    firstWins,
    secondWins,
    draws,
    completed: firstWins + secondWins + draws,

    averageRounds:
      requestedCount > 0 ? (totalRounds / requestedCount).toFixed(1) : "0.0",

    firstAverageHealthAfterWins:
      firstWins > 0 ? (firstWinnerHealthTotal / firstWins).toFixed(1) : "N/A",

    secondAverageHealthAfterWins:
      secondWins > 0
        ? (secondWinnerHealthTotal / secondWins).toFixed(1)
        : "N/A",

    firstAverageRoundsToWin:
      firstWins > 0 ? (firstWinnerRoundsTotal / firstWins).toFixed(1) : "N/A",

    secondAverageRoundsToWin:
      secondWins > 0 ? (secondWinnerRoundsTotal / secondWins).toFixed(1) : "N/A",

    lastResult,
  };
}

function createTeamRecord(team) {
  return {
    id: getTeamKey(team),
    name: getTeamName(team),
    team,

    wins: 0,
    losses: 0,
    draws: 0,
    battles: 0,

    totalRounds: 0,
    totalRoundsToWin: 0,
    totalHealthAfterWins: 0,

    startsFirstBattles: 0,
    startsFirstWins: 0,
    startsSecondBattles: 0,
    startsSecondWins: 0,
  };
}

function recordTeamBattle(teamStats, team, result, position) {
  const stats = teamStats[getTeamKey(team)];
  const teamIndex = position === "first" ? 0 : 1;
  const winnerLabel = position === "first" ? "Team 1" : "Team 2";
  const won = result.winner === winnerLabel;
  const drew = result.winner === null;

  const ownHealth = result.teams[teamIndex].reduce(
    (total, fighter) => total + Math.max(0, fighter.health),
    0,
  );

  stats.battles++;
  stats.totalRounds += result.rounds;

  if (position === "first") {
    stats.startsFirstBattles++;
    if (won) stats.startsFirstWins++;
  } else {
    stats.startsSecondBattles++;
    if (won) stats.startsSecondWins++;
  }

  if (won) {
    stats.wins++;
    stats.totalHealthAfterWins += ownHealth;
    stats.totalRoundsToWin += result.rounds;
  } else if (drew) {
    stats.draws++;
  } else {
    stats.losses++;
  }
}

function createTeamLeaderboard(teamStats) {
  return Object.values(teamStats)
    .map((team) => {
      const winRate =
        team.battles > 0 ? (team.wins / team.battles) * 100 : 0;

      const firstWinRate =
        team.startsFirstBattles > 0
          ? (team.startsFirstWins / team.startsFirstBattles) * 100
          : 0;

      const secondWinRate =
        team.startsSecondBattles > 0
          ? (team.startsSecondWins / team.startsSecondBattles) * 100
          : 0;

      const startingOrderScore = (firstWinRate + secondWinRate) / 2;

      const averageRounds =
        team.battles > 0 ? team.totalRounds / team.battles : 0;

      const averageRoundsToWin =
        team.wins > 0 ? team.totalRoundsToWin / team.wins : null;

      const averageHealthAfterWins =
        team.wins > 0 ? team.totalHealthAfterWins / team.wins : null;

      const maximumHealth = getTeamMaximumHealth(team.team);

      const healthScore =
        averageHealthAfterWins !== null && maximumHealth > 0
          ? Math.min(
              100,
              Math.max(0, (averageHealthAfterWins / maximumHealth) * 100),
            )
          : 50;

      const speedScore =
        averageRoundsToWin !== null
          ? Math.max(
              0,
              Math.min(
                100,
                ((MAX_ROUNDS - averageRoundsToWin) / MAX_ROUNDS) * 100,
              ),
            )
          : 50;

      const overallScore =
        winRate * 0.6 +
        startingOrderScore * 0.2 +
        healthScore * 0.1 +
        speedScore * 0.1;

      return {
        ...team,
        winRate: winRate.toFixed(1),
        firstWinRate: firstWinRate.toFixed(1),
        secondWinRate: secondWinRate.toFixed(1),
        startingOrderScore: startingOrderScore.toFixed(1),
        healthScore: healthScore.toFixed(1),
        speedScore: speedScore.toFixed(1),
        overallScore: overallScore.toFixed(1),
        averageRounds: averageRounds.toFixed(1),

        averageRoundsToWin:
          averageRoundsToWin !== null ? averageRoundsToWin.toFixed(1) : "N/A",

        averageHealthAfterWins:
          averageHealthAfterWins !== null
            ? averageHealthAfterWins.toFixed(1)
            : "N/A",
      };
    })
    .sort(
      (a, b) =>
        Number(b.overallScore) - Number(a.overallScore) ||
        Number(b.winRate) - Number(a.winRate) ||
        b.wins - a.wins,
    );
}

// -----------------------------------------------------------------------------
// MAIN COMPONENT
// -----------------------------------------------------------------------------

function BotSimulator() {
  const navigate = useNavigate();

  const [unlockedIds, setUnlockedIds] = useState(() =>
    getUnlockedCharacters(),
  );

  const [battleType, setBattleType] = useState("1v1");
  const [mode, setMode] = useState("custom");

  const [fighterOneId, setFighterOneId] = useState("random");
  const [fighterTwoId, setFighterTwoId] = useState("random");

  const [teamOneIds, setTeamOneIds] = useState(["random", "random"]);
  const [teamTwoIds, setTeamTwoIds] = useState(["random", "random"]);

  const [difficultyOne, setDifficultyOne] = useState("Easy");
  const [difficultyTwo, setDifficultyTwo] = useState("Easy");
  const [simulationCount, setSimulationCount] = useState("100");

  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const updateUnlocks = () => setUnlockedIds(getUnlockedCharacters());

    window.addEventListener("unlocksUpdated", updateUnlocks);
    return () => window.removeEventListener("unlocksUpdated", updateUnlocks);
  }, []);

  const availableFighters = roster.filter((fighter) =>
    unlockedIds.includes(fighter.id),
  );

  function chooseFighter(preferredId, excludedIds = []) {
    const candidates = availableFighters.filter(
      (fighter) => !excludedIds.includes(fighter.id),
    );

    if (candidates.length === 0) return null;

    if (preferredId !== "random") {
      const chosen = candidates.find((fighter) => fighter.id === preferredId);
      if (chosen) return chosen;
    }

    return chooseRandom(candidates);
  }

  function resolveTeam(selectedIds, excludedIds = []) {
    const team = [];
    const usedIds = [...excludedIds];

    for (const selectedId of selectedIds) {
      const fighter = chooseFighter(selectedId, usedIds);

      if (!fighter) return null;

      team.push(fighter);
      usedIds.push(fighter.id);
    }

    return team;
  }

  function runCustomSimulations(requestedCount) {
    const fighterOne = chooseFighter(fighterOneId);
    const fighterTwo = chooseFighter(
      fighterTwoId,
      fighterOne ? [fighterOne.id] : [],
    );

    if (!fighterOne || !fighterTwo) {
      alert("You need at least two available fighters.");
      return;
    }

    const fighterOneStarts = runStartingOrderSeries(
      fighterOne,
      fighterTwo,
      requestedCount,
      difficultyOne,
      difficultyTwo,
    );

    const fighterTwoStarts = runStartingOrderSeries(
      fighterTwo,
      fighterOne,
      requestedCount,
      difficultyTwo,
      difficultyOne,
    );

    const botOneWins =
      fighterOneStarts.firstWins + fighterTwoStarts.secondWins;

    const botTwoWins =
      fighterOneStarts.secondWins + fighterTwoStarts.firstWins;

    const draws = fighterOneStarts.draws + fighterTwoStarts.draws;
    const completed = fighterOneStarts.completed + fighterTwoStarts.completed;

    const totalRounds =
      Number(fighterOneStarts.averageRounds) * requestedCount +
      Number(fighterTwoStarts.averageRounds) * requestedCount;

    setResults({
      type: "custom",
      battleType: "1v1",
      selectedFighterOne: fighterOne,
      selectedFighterTwo: fighterTwo,
      botOneWins,
      botTwoWins,
      draws,
      completed,
      averageRounds:
        completed > 0 ? (totalRounds / completed).toFixed(1) : "0.0",
      startingOrderResults: [fighterOneStarts, fighterTwoStarts],
      lastResult: fighterTwoStarts.lastResult,
    });
  }

  function runAllMatchups(requestedCount) {
    const fighterStats = {};

    for (const fighter of availableFighters) {
      fighterStats[fighter.id] = createFighterRecord(fighter);
    }

    let totalBattles = 0;
    let totalRounds = 0;
    let lastResult = null;
    let matchupCount = 0;

    for (let i = 0; i < availableFighters.length; i++) {
      for (let j = i + 1; j < availableFighters.length; j++) {
        const fighterOne = availableFighters[i];
        const fighterTwo = availableFighters[j];

        matchupCount++;

        const startingOrders = [
          {
            first: fighterOne,
            second: fighterTwo,
            firstDifficulty: difficultyOne,
            secondDifficulty: difficultyTwo,
          },
          {
            first: fighterTwo,
            second: fighterOne,
            firstDifficulty: difficultyTwo,
            secondDifficulty: difficultyOne,
          },
        ];

        for (const order of startingOrders) {
          for (let battle = 0; battle < requestedCount; battle++) {
            const result = simulateBattle(
              getFighterData(order.first),
              getFighterData(order.second),
              {
                difficultyOne: order.firstDifficulty,
                difficultyTwo: order.secondDifficulty,
              },
            );

            recordFighterBattle(
              fighterStats,
              order.first,
              result.fighters[0].health,
              result,
              "first",
            );

            recordFighterBattle(
              fighterStats,
              order.second,
              result.fighters[1].health,
              result,
              "second",
            );

            totalBattles++;
            totalRounds += result.rounds;

            lastResult = {
              ...result,
              selectedFighterOne: order.first,
              selectedFighterTwo: order.second,
            };
          }
        }
      }
    }

    setResults({
      type: "all",
      battleType: "1v1",
      leaderboard: createFighterLeaderboard(
        fighterStats,
        availableFighters,
      ),
      totalBattles,
      matchupCount,
      averageRounds:
        totalBattles > 0 ? (totalRounds / totalBattles).toFixed(1) : "0.0",
      lastResult,
    });
  }

  function runCustomTeamSimulations(requestedCount) {
    const teamOne = resolveTeam(teamOneIds);
    const teamTwo = resolveTeam(
      teamTwoIds,
      teamOne ? teamOne.map((fighter) => fighter.id) : [],
    );

    if (!teamOne || !teamTwo) {
      alert("You need at least four different unlocked fighters for 2v2.");
      return;
    }

    const firstTeamStarts = runTeamStartingOrderSeries(
      teamOne,
      teamTwo,
      requestedCount,
      difficultyOne,
      difficultyTwo,
    );

    const secondTeamStarts = runTeamStartingOrderSeries(
      teamTwo,
      teamOne,
      requestedCount,
      difficultyTwo,
      difficultyOne,
    );

    const teamOneWins =
      firstTeamStarts.firstWins + secondTeamStarts.secondWins;

    const teamTwoWins =
      firstTeamStarts.secondWins + secondTeamStarts.firstWins;

    const draws = firstTeamStarts.draws + secondTeamStarts.draws;
    const completed = firstTeamStarts.completed + secondTeamStarts.completed;

    const totalRounds =
      Number(firstTeamStarts.averageRounds) * requestedCount +
      Number(secondTeamStarts.averageRounds) * requestedCount;

    setResults({
      type: "custom",
      battleType: "2v2",
      selectedTeamOne: teamOne,
      selectedTeamTwo: teamTwo,
      botOneWins: teamOneWins,
      botTwoWins: teamTwoWins,
      draws,
      completed,
      averageRounds:
        completed > 0 ? (totalRounds / completed).toFixed(1) : "0.0",
      startingOrderResults: [firstTeamStarts, secondTeamStarts],
      lastResult: secondTeamStarts.lastResult,
    });
  }

  function runAllTeamMatchups(requestedCount) {
    const allTeams = [];

    // Build every unique two-fighter combination.
    for (let i = 0; i < availableFighters.length; i++) {
      for (let j = i + 1; j < availableFighters.length; j++) {
        allTeams.push([availableFighters[i], availableFighters[j]]);
      }
    }

    if (allTeams.length < 2) {
      alert("You need at least four unlocked fighters to compare teams.");
      return;
    }

    const teamStats = {};

    for (const team of allTeams) {
      teamStats[getTeamKey(team)] = createTeamRecord(team);
    }

    let totalBattles = 0;
    let totalRounds = 0;
    let lastResult = null;
    let matchupCount = 0;

    // Each team combination is compared with every other team combination.
    for (let i = 0; i < allTeams.length; i++) {
      for (let j = i + 1; j < allTeams.length; j++) {
        const teamOne = allTeams[i];
        const teamTwo = allTeams[j];

        matchupCount++;

        const startingOrders = [
          {
            first: teamOne,
            second: teamTwo,
            firstDifficulty: difficultyOne,
            secondDifficulty: difficultyTwo,
          },
          {
            first: teamTwo,
            second: teamOne,
            firstDifficulty: difficultyTwo,
            secondDifficulty: difficultyOne,
          },
        ];

        for (const order of startingOrders) {
          for (let battle = 0; battle < requestedCount; battle++) {
            const result = simulateTeamBattle(
              order.first.map(getFighterData),
              order.second.map(getFighterData),
              {
                difficultyOne: order.firstDifficulty,
                difficultyTwo: order.secondDifficulty,
              },
            );

            recordTeamBattle(teamStats, order.first, result, "first");
            recordTeamBattle(teamStats, order.second, result, "second");

            totalBattles++;
            totalRounds += result.rounds;

            lastResult = {
              ...result,
              selectedTeamOne: order.first,
              selectedTeamTwo: order.second,
            };
          }
        }
      }
    }

    setResults({
      type: "all",
      battleType: "2v2",
      leaderboard: createTeamLeaderboard(teamStats),
      totalBattles,
      matchupCount,
      teamCombinationCount: allTeams.length,
      averageRounds:
        totalBattles > 0 ? (totalRounds / totalBattles).toFixed(1) : "0.0",
      lastResult,
    });
  }

  function runSimulations() {
    const minimumFighters = battleType === "2v2" ? 4 : 2;

    if (availableFighters.length < minimumFighters) {
      alert(
        battleType === "2v2"
          ? "You need at least four unlocked fighters for 2v2."
          : "You need at least two unlocked fighters to simulate battles.",
      );
      return;
    }

    const requestedCount = Math.min(
      1000,
      Math.max(1, Number(simulationCount) || 1),
    );

    setRunning(true);
    setResults(null);

    try {
      if (battleType === "1v1") {
        if (mode === "all") {
          runAllMatchups(requestedCount);
        } else {
          runCustomSimulations(requestedCount);
        }
      } else if (mode === "all") {
        runAllTeamMatchups(requestedCount);
      } else {
        runCustomTeamSimulations(requestedCount);
      }
    } catch (error) {
      console.error("Simulation failed:", error);
      alert("The simulation encountered an error. Check the console.");
    } finally {
      setRunning(false);
    }
  }

  function renderLastBattle(result) {
    if (!result) return null;

    const isTeamBattle = result.selectedTeamOne && result.selectedTeamTwo;

    const battleTitle = isTeamBattle
      ? `${getTeamName(result.selectedTeamOne)} vs ${getTeamName(result.selectedTeamTwo)}`
      : `${getFighterName(result.selectedFighterOne)} vs ${getFighterName(result.selectedFighterTwo)}`;

    return (
      <div className="last-simulation">
        <h3>LAST BATTLE</h3>

        <p>{battleTitle}</p>

        <p>
          Winner:{" "}
          <strong>
            {result.winner === "Team 1" && isTeamBattle
              ? getTeamName(result.selectedTeamOne)
              : result.winner === "Team 2" && isTeamBattle
                ? getTeamName(result.selectedTeamTwo)
                : result.winner ?? "Draw"}
          </strong>
        </p>

        <p>Rounds: {result.rounds}</p>
        <p>End reason: {result.endReason}</p>

        <h3>COMBAT LOG</h3>

        <div className="simulation-log">
          {result.log.map((entry, index) => (
            <div className="combat-log-entry" key={`${entry.round}-${index}`}>
              <p>
                <strong>Round {entry.round}:</strong>{" "}
                {entry.action === "skipped" ? (
                  <>
                    {entry.attacker} had no unique target and skipped their
                    turn.
                  </>
                ) : (
                  <>
                    {entry.attacker} used {entry.attack ?? "an attack"} against{" "}
                    {entry.defender ?? "no target"} — {entry.action},{" "}
                    {entry.damage ?? 0} damage.
                  </>
                )}
              </p>

              <div className="combat-log-health">
                <span>
                  <strong>{entry.attacker}</strong>
                  <span className="health-number">
                    {entry.attackerHealth ?? "—"} HP
                  </span>
                  <span className="mana-number">
                    {entry.attackerMana ?? "—"} MP
                  </span>
                </span>

                {entry.defender && (
                  <span>
                    <strong>{entry.defender}</strong>
                    <span className="health-number">
                      {entry.defenderHealth ?? "—"} HP
                    </span>
                    <span className="mana-number">
                      {entry.defenderMana ?? "—"} MP
                    </span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const teamOptions = [
    { value: "random", label: "Random unlocked fighter" },
    ...availableFighters.map((fighter) => ({
      value: fighter.id,
      label: getFighterName(fighter),
    })),
  ];

  function renderTeamSelector(title, ids, setIds, otherIds = []) {
    return (
      <div className="simulator-bot">
        <h3>{title}</h3>

        {[0, 1].map((slot) => (
          <React.Fragment key={slot}>
            <label htmlFor={`${title.replaceAll(" ", "")}-${slot}`}>
              Fighter {slot + 1}
            </label>

            <select
              id={`${title.replaceAll(" ", "")}-${slot}`}
              value={ids[slot]}
              onChange={(event) => {
                const nextIds = [...ids];
                nextIds[slot] = event.target.value;
                setIds(nextIds);
              }}
            >
              {teamOptions.map((option) => {
                const isUsedElsewhere =
                  option.value !== "random" &&
                  (ids.some(
                    (id, index) => index !== slot && id === option.value,
                  ) ||
                    otherIds.includes(option.value));

                return (
                  <option
                    key={option.value}
                    value={option.value}
                    disabled={isUsedElsewhere}
                  >
                    {option.label}
                  </option>
                );
              })}
            </select>
          </React.Fragment>
        ))}
      </div>
    );
  }

  function renderDifficultySelectors() {
    return (
      <div className="simulator-bots">
        <div className="simulator-bot">
          <h3>{battleType === "2v2" ? "TEAM 1 DIFFICULTY" : "BOT 1"}</h3>

          <label htmlFor="difficultyOne">Difficulty</label>
          <select
            id="difficultyOne"
            value={difficultyOne}
            onChange={(event) => setDifficultyOne(event.target.value)}
          >
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty}
              </option>
            ))}
          </select>
        </div>

        <div className="simulator-versus">VS</div>

        <div className="simulator-bot">
          <h3>{battleType === "2v2" ? "TEAM 2 DIFFICULTY" : "BOT 2"}</h3>

          <label htmlFor="difficultyTwo">Difficulty</label>
          <select
            id="difficultyTwo"
            value={difficultyTwo}
            onChange={(event) => setDifficultyTwo(event.target.value)}
          >
            {DIFFICULTIES.map((difficulty) => (
              <option key={difficulty} value={difficulty}>
                {difficulty}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }

  return (
    <main className="bot-simulator">
      <header className="simulator-header">
        <button onClick={() => navigate("/")}>← MAIN MENU</button>

        <div>
          <p>FIGHTER'S ARENA</p>
          <h1>BOT VS BOT</h1>
        </div>

        <button onClick={() => navigate("/watch-mode")}>
          ▶ WATCH BATTLE
        </button>
      </header>

      <section className="simulator-setup">
        <h2>SIMULATION SETUP</h2>

        <p>
          Run custom battles or compare fighters and teams using repeated
          simulations.
        </p>

        <div className="simulator-mode-buttons">
          <button
            className={battleType === "1v1" ? "active" : ""}
            onClick={() => {
              setBattleType("1v1");
              setResults(null);
            }}
          >
            1V1
          </button>

          <button
            className={battleType === "2v2" ? "active" : ""}
            onClick={() => {
              setBattleType("2v2");
              setResults(null);
            }}
          >
            2V2
          </button>
        </div>

        <div className="simulator-mode-buttons">
          <button
            className={mode === "custom" ? "active" : ""}
            onClick={() => {
              setMode("custom");
              setResults(null);
            }}
          >
            CUSTOM BATTLE
          </button>

          <button
            className={mode === "all" ? "active" : ""}
            onClick={() => {
              setMode("all");
              setResults(null);
            }}
          >
            ALL MATCHUPS
          </button>
        </div>

        {mode === "custom" && battleType === "1v1" && (
          <div className="simulator-bots">
            <div className="simulator-bot">
              <h3>BOT 1</h3>

              <label htmlFor="fighterOne">Fighter</label>
              <select
                id="fighterOne"
                value={fighterOneId}
                onChange={(event) => setFighterOneId(event.target.value)}
              >
                {teamOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="simulator-versus">VS</div>

            <div className="simulator-bot">
              <h3>BOT 2</h3>

              <label htmlFor="fighterTwo">Fighter</label>
              <select
                id="fighterTwo"
                value={fighterTwoId}
                onChange={(event) => setFighterTwoId(event.target.value)}
              >
                {teamOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {mode === "custom" && battleType === "2v2" && (
          <div className="simulator-bots">
            {renderTeamSelector(
              "TEAM 1",
              teamOneIds,
              setTeamOneIds,
              teamTwoIds.filter((id) => id !== "random"),
            )}

            <div className="simulator-versus">VS</div>

            {renderTeamSelector(
              "TEAM 2",
              teamTwoIds,
              setTeamTwoIds,
              teamOneIds.filter((id) => id !== "random"),
            )}
          </div>
        )}

        {mode === "all" && battleType === "1v1" && (
          <div className="all-matchups-info">
            <h3>EVERY UNLOCKED FIGHTER</h3>

            <p>
              The simulator tests each unique pair of unlocked fighters in
              both starting positions.
            </p>

            <p>
              Fighters available: <strong>{availableFighters.length}</strong>
            </p>

            <p>
              Unique matchups:{" "}
              <strong>
                {(availableFighters.length * (availableFighters.length - 1)) /
                  2}
              </strong>
            </p>
          </div>
        )}

        {mode === "all" && battleType === "2v2" && (
          <div className="all-matchups-info">
            <h3>EVERY TWO-FIGHTER TEAM</h3>

            <p>
              The simulator creates every unique pair of unlocked fighters,
              then tests each team against every other team in both starting
              positions.
            </p>

            <p>
              Available fighters: <strong>{availableFighters.length}</strong>
            </p>

            <p>
              Possible teams:{" "}
              <strong>
                {(availableFighters.length * (availableFighters.length - 1)) /
                  2}
              </strong>
            </p>

            <p className="simulation-warning">
              This mode can run many battles. Start with 1–10 battles per
              matchup, then increase the count if performance is good.
            </p>
          </div>
        )}

        {renderDifficultySelectors()}

        <div className="simulation-count">
          <label htmlFor="simulationCount">
            {mode === "all"
              ? "Battles per matchup (1–1000)"
              : "Battles per starting position (1–1000)"}
          </label>

          <input
            id="simulationCount"
            type="number"
            min="1"
            max="1000"
            value={simulationCount}
            onChange={(event) => setSimulationCount(event.target.value)}
          />
        </div>

        <button
          className="run-simulation-button"
          onClick={runSimulations}
          disabled={
            running ||
            availableFighters.length < (battleType === "2v2" ? 4 : 2)
          }
        >
          {running ? "SIMULATING..." : "RUN SIMULATION"}
        </button>
      </section>

      {results && results.type === "custom" && (
        <section className="simulation-results">
          <h2>
            {results.battleType === "2v2"
              ? "2V2 SIMULATION RESULTS"
              : "SIMULATION RESULTS"}
          </h2>

          {results.battleType === "2v2" && (
            <p>
              <strong>Team 1:</strong> {getTeamName(results.selectedTeamOne)}
              {" vs "}
              <strong>Team 2:</strong> {getTeamName(results.selectedTeamTwo)}
            </p>
          )}

          {results.battleType === "1v1" && (
            <p>
              <strong>Bot 1:</strong> {getFighterName(results.selectedFighterOne)}
              {" vs "}
              <strong>Bot 2:</strong> {getFighterName(results.selectedFighterTwo)}
            </p>
          )}

          <p>
            Battles completed: <strong>{results.completed}</strong>
          </p>

          <div className="simulation-stat-grid">
            <div>
              <span>{results.battleType === "2v2" ? "TEAM 1 WINS" : "BOT 1 WINS"}</span>
              <strong>{results.botOneWins}</strong>
            </div>

            <div>
              <span>{results.battleType === "2v2" ? "TEAM 2 WINS" : "BOT 2 WINS"}</span>
              <strong>{results.botTwoWins}</strong>
            </div>

            <div>
              <span>DRAWS</span>
              <strong>{results.draws}</strong>
            </div>

            <div>
              <span>AVG. ROUNDS</span>
              <strong>{results.averageRounds}</strong>
            </div>
          </div>

          <div className="starting-order-comparison">
            <h3>STARTING-ORDER COMPARISON</h3>

            <p>
              Each starting position was tested{" "}
              <strong>{results.startingOrderResults[0].completed}</strong>{" "}
              times.
            </p>

            <div className="starting-order-grid">
              {results.startingOrderResults.map((test, index) => {
                const isTeamTest = results.battleType === "2v2";

                const firstName = isTeamTest
                  ? getTeamName(test.firstTeam)
                  : getFighterName(test.firstFighter);

                const secondName = isTeamTest
                  ? getTeamName(test.secondTeam)
                  : getFighterName(test.secondFighter);

                return (
                  <div className="starting-order-card" key={index}>
                    <h4>{firstName} STARTS FIRST</h4>

                    <p>
                      <strong>{firstName}</strong> wins: {test.firstWins}
                    </p>

                    <p>
                      <strong>{secondName}</strong> wins: {test.secondWins}
                    </p>

                    <p>Draws: {test.draws}</p>
                    <p>Average rounds: {test.averageRounds}</p>

                    <hr />

                    <p>
                      <strong>{firstName}</strong>
                    </p>
                    <p>
                      Average team/fighter HP after wins:{" "}
                      {test.firstAverageHealthAfterWins}
                      {test.firstAverageHealthAfterWins !== "N/A" ? " HP" : ""}
                    </p>
                    <p>Average rounds to win: {test.firstAverageRoundsToWin}</p>

                    <hr />

                    <p>
                      <strong>{secondName}</strong>
                    </p>
                    <p>
                      Average team/fighter HP after wins:{" "}
                      {test.secondAverageHealthAfterWins}
                      {test.secondAverageHealthAfterWins !== "N/A" ? " HP" : ""}
                    </p>
                    <p>Average rounds to win: {test.secondAverageRoundsToWin}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {renderLastBattle(results.lastResult)}
        </section>
      )}

      {results && results.type === "all" && (
        <section className="simulation-results">
          <h2>
            {results.battleType === "2v2"
              ? "TEAM RANKINGS"
              : "MATCHUP LEADERBOARD"}
          </h2>

          <p>
            Battles completed: <strong>{results.totalBattles}</strong>
          </p>

          <p>
            {results.battleType === "2v2"
              ? "Team matchups tested: "
              : "Unique matchups tested: "}
            <strong>{results.matchupCount}</strong>
          </p>

          {results.battleType === "2v2" && (
            <p>
              Unique team combinations:{" "}
              <strong>{results.teamCombinationCount}</strong>
            </p>
          )}

          <p>
            Overall average rounds: <strong>{results.averageRounds}</strong>
          </p>

          <div className="matchup-table-wrapper">
            <table className="matchup-table">
              <thead>
                <tr>
                  <th>RANK</th>
                  <th>{results.battleType === "2v2" ? "TEAM" : "FIGHTER"}</th>
                  <th>OVERALL SCORE</th>
                  <th>WIN RATE</th>
                  <th>WINS</th>
                  <th>LOSSES</th>
                  <th>DRAWS</th>
                  <th>STARTS FIRST</th>
                  <th>STARTS SECOND</th>
                  <th>AVG. HP AFTER WINS</th>
                  <th>AVG. ROUNDS TO WIN</th>
                </tr>
              </thead>

              <tbody>
                {results.leaderboard.map((fighter, index) => (
                  <tr
                    key={fighter.id}
                    className={index === 0 ? "top-ranked-fighter" : ""}
                  >
                    <td>
                      {index === 0
                        ? "🥇"
                        : index === 1
                          ? "🥈"
                          : index === 2
                            ? "🥉"
                            : index + 1}
                    </td>

                    <td>
                      <strong>{fighter.name}</strong>
                    </td>

                    <td className="overall-score-cell">
                      {fighter.overallScore}/100
                    </td>

                    <td>{fighter.winRate}%</td>
                    <td>{fighter.wins}</td>
                    <td>{fighter.losses}</td>
                    <td>{fighter.draws}</td>
                    <td>{fighter.firstWinRate}%</td>
                    <td>{fighter.secondWinRate}%</td>

                    <td>
                      {fighter.averageHealthAfterWins === "N/A"
                        ? "N/A"
                        : `${fighter.averageHealthAfterWins} HP`}
                    </td>

                    <td>{fighter.averageRoundsToWin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="simulation-warning">
            Overall score combines win rate (60%), starting-position
            performance (20%), health remaining after wins (10%), and speed
            of victory (10%). Results depend on the selected AI difficulties
            and are not a definitive measure of character or team balance.
          </p>

          {renderLastBattle(results.lastResult)}
        </section>
      )}
    </main>
  );
}

export default BotSimulator;
