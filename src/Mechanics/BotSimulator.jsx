import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { roster } from "./Main Page/CharacterSelection.jsx";
import { getUnlockedCharacters } from "./Currency.js";
import {
  getAttackKey,
  getAttackSlotLimit,
  getEquippedAttackKeys,
  getEquippedAttacks,
  isAttackUnlocked,
  saveEquippedAttackKeys,
} from "./AttackLoadouts.js";
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
  return team
    .map((fighter) => fighter.id)
    .sort()
    .join("+");
}

function getTeamMaximumHealth(team) {
  return team.reduce((total, fighter) => {
    const data = getFighterData(fighter);
    return total + (data.maximumHealth ?? data.health ?? 100);
  }, 0);
}

function getFighterWithEquippedAttacks(fighter) {
  const data = getFighterData(fighter);
  return {
    ...data,
    attacks: getEquippedAttacks(fighter.id, data.attacks ?? [], data.slot),
  };
}

function buildAttackCombinations(attacks, slotLimit, maxCandidates, currentKeys = []) {
  const size = Math.min(slotLimit, attacks.length);
  if (size <= 0) return [];

  const combinations = [];
  const seen = new Set();
  const add = (items) => {
    if (items.length !== size) return;
    const keys = items.map(getAttackKey);
    const signature = [...keys].sort().join("|");
    if (seen.has(signature)) return;
    seen.add(signature);
    combinations.push(items);
  };

  const current = currentKeys
    .map((key) => attacks.find((attack) => getAttackKey(attack) === key))
    .filter(Boolean);
  if (current.length === size) add(current);

  const chooseCount = (n, r) => {
    let value = 1;
    for (let i = 1; i <= Math.min(r, n - r); i += 1) {
      value = (value * (n - i + 1)) / i;
    }
    return Math.round(value);
  };

  const total = chooseCount(attacks.length, size);
  if (total <= maxCandidates) {
    const walk = (start, chosen) => {
      if (combinations.length >= maxCandidates) return;
      if (chosen.length === size) {
        add(chosen);
        return;
      }
      for (let i = start; i <= attacks.length - (size - chosen.length); i += 1) {
        walk(i + 1, [...chosen, attacks[i]]);
        if (combinations.length >= maxCandidates) return;
      }
    };
    walk(0, []);
  } else {
    // Sample unique legal loadouts instead of blocking the page by enumerating
    // thousands of possible combinations.
    let attempts = 0;
    while (combinations.length < maxCandidates && attempts < maxCandidates * 80) {
      attempts += 1;
      const shuffled = [...attacks].sort(() => Math.random() - 0.5);
      add(shuffled.slice(0, size));
    }
  }

  return combinations.slice(0, maxCandidates);
}

function chooseRandom(candidates) {
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function getOneVsOneOutcome(result) {
  const winner = result?.winner?.trim?.();

  const firstName = result?.fighters?.[0]?.name;
  const secondName = result?.fighters?.[1]?.name;

  // First, use the winner reported by BattleSimulator.
  if (winner && winner === firstName) return "first";
  if (winner && winner === secondName) return "second";

  // Fallback: compare the fighters' remaining health.
  const firstHealth = result?.fighters?.[0]?.health ?? 0;
  const secondHealth = result?.fighters?.[1]?.health ?? 0;

  if (firstHealth > secondHealth) return "first";
  if (secondHealth > firstHealth) return "second";

  return "draw";
}

function getTeamBattleOutcome(result) {
  if (result?.winner === "Team 1") return "first";
  if (result?.winner === "Team 2") return "second";

  // Fallback: compare the remaining health of both teams.
  const firstHealth = (result?.teams?.[0] ?? []).reduce(
    (total, fighter) => total + Math.max(0, fighter.health ?? 0),
    0,
  );

  const secondHealth = (result?.teams?.[1] ?? []).reduce(
    (total, fighter) => total + Math.max(0, fighter.health ?? 0),
    0,
  );

  if (firstHealth > secondHealth) return "first";
  if (secondHealth > firstHealth) return "second";

  return "draw";
}

// -----------------------------------------------------------------------------
// EXISTING 1v1 SIMULATION HELPERS
// -----------------------------------------------------------------------------

async function runStartingOrderSeries(
  firstFighter,
  secondFighter,
  requestedCount,
  firstDifficulty,
  secondDifficulty,
  onProgress,
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
      getFighterWithEquippedAttacks(firstFighter),
      getFighterWithEquippedAttacks(secondFighter),
      {
        difficultyOne: firstDifficulty,
        difficultyTwo: secondDifficulty,
      },
    );

    

    totalRounds += result.rounds;

    const outcome = getOneVsOneOutcome(result);

    if (outcome === "first") {
      firstWins++;
      firstWinnerHealthTotal += result.fighters[0].health;
      firstWinnerRoundsTotal += result.rounds;
    } else if (outcome === "second") {
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
    onProgress?.();

    if ((i + 1) % 5 === 0 || i === requestedCount - 1) {
      await yieldToBrowser();
    }
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
  const outcome = getOneVsOneOutcome(result);

  const won =
    (position === "first" && outcome === "first") ||
    (position === "second" && outcome === "second");

  const drew = outcome === "draw";

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
function createMatchupStats(fighters) {
  const stats = {};

  for (const fighter of fighters) {
    stats[fighter.id] = {
      id: fighter.id,
      name: getFighterName(fighter),
      opponents: {},
    };
  }

  return stats;
}


function recordHeadToHead(matchupStats, fighter, opponent, outcome) {
  const fighterStats = matchupStats[fighter.id];

  if (!fighterStats.opponents[opponent.id]) {
    fighterStats.opponents[opponent.id] = {
      id: opponent.id,
      name: getFighterName(opponent),
      wins: 0,
      losses: 0,
      draws: 0,
    };
  }

  const counterKey = {
    win: "wins",
    loss: "losses",
    draw: "draws",
  }[outcome];

  if (!counterKey) return;

  fighterStats.opponents[opponent.id][counterKey]++;
}


function createMatchupRankings(matchupStats) {
  return Object.values(matchupStats).map((fighter) => {
    const opponents = Object.values(fighter.opponents);

    const mostDifficult = [...opponents]
      .filter((opponent) => opponent.losses > 0)
      .sort((a, b) => b.losses - a.losses || a.name.localeCompare(b.name))
      .slice(0, 3);

    const mostFavorable = [...opponents]
      .filter((opponent) => opponent.wins > 0)
      .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name))
      .slice(0, 3);

    return {
      id: fighter.id,
      name: fighter.name,
      mostDifficult,
      mostFavorable,
    };
  });
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

async function runTeamStartingOrderSeries(
  firstTeam,
  secondTeam,
  requestedCount,
  firstDifficulty,
  secondDifficulty,
  onProgress,
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
      firstTeam.map(getFighterWithEquippedAttacks),
      secondTeam.map(getFighterWithEquippedAttacks),
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

    const outcome = getTeamBattleOutcome(result);

    if (outcome === "first") {
      firstWins++;
      firstWinnerHealthTotal += firstTeamHealth;
      firstWinnerRoundsTotal += result.rounds;
    } else if (outcome === "second") {
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
    onProgress?.();

    if ((i + 1) % 5 === 0 || i === requestedCount - 1) {
      await yieldToBrowser();
    }
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
      secondWins > 0
        ? (secondWinnerRoundsTotal / secondWins).toFixed(1)
        : "N/A",

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
  const outcome = getTeamBattleOutcome(result);

  const won =
    (position === "first" && outcome === "first") ||
    (position === "second" && outcome === "second");

  const drew = outcome === "draw";

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
      const winRate = team.battles > 0 ? (team.wins / team.battles) * 100 : 0;

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

  const [unlockedIds, setUnlockedIds] = useState(() => getUnlockedCharacters());
  const [selectedFighterIds, setSelectedFighterIds] = useState(() =>
    getUnlockedCharacters(),
  );
  const [battleType, setBattleType] = useState("1v1");
  const [mode, setMode] = useState("custom");
  const [activeTab, setActiveTab] = useState("1v1");

  const [loadoutFighterId, setLoadoutFighterId] = useState(
    () => getUnlockedCharacters()[0] ?? roster[0]?.id ?? "",
  );
  const [loadoutAttackKeys, setLoadoutAttackKeys] = useState([]);
  const [loadoutOpponentIds, setLoadoutOpponentIds] = useState([]);
  const [loadoutCandidateLimit, setLoadoutCandidateLimit] = useState("12");
  const [loadoutRepeats, setLoadoutRepeats] = useState("2");
  const [loadoutResults, setLoadoutResults] = useState(null);

  const [fighterOneId, setFighterOneId] = useState("random");
  const [fighterTwoId, setFighterTwoId] = useState("random");

  const [teamOneIds, setTeamOneIds] = useState(["random", "random"]);
  const [teamTwoIds, setTeamTwoIds] = useState(["random", "random"]);

  const [difficultyOne, setDifficultyOne] = useState("Easy");
  const [difficultyTwo, setDifficultyTwo] = useState("Easy");
  const [simulationCount, setSimulationCount] = useState("100");

  const [progress, setProgress] = useState({
    completed: 0,
    total: 0,
  });

  const progressPercentage =
    progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : 0;

  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const updateUnlocks = () => {
      const nextUnlockedIds = getUnlockedCharacters();

      setUnlockedIds(nextUnlockedIds);

      // Preserve the user's current selection.
      // Newly unlocked fighters are automatically included.
      setSelectedFighterIds((previousIds) => [
        ...previousIds.filter((id) => nextUnlockedIds.includes(id)),
        ...nextUnlockedIds.filter((id) => !previousIds.includes(id)),
      ]);
    };

    window.addEventListener("unlocksUpdated", updateUnlocks);

    return () => {
      window.removeEventListener("unlocksUpdated", updateUnlocks);
    };
  }, []);

  const availableFighters = roster.filter((fighter) =>
    unlockedIds.includes(fighter.id),
  );

  const analysisFighters = availableFighters.filter((fighter) =>
    selectedFighterIds.includes(fighter.id),
  );
  const loadoutFighter = availableFighters.find((fighter) => fighter.id === loadoutFighterId);
  const loadoutAttackPool = (loadoutFighter?.data?.attacks ?? []).filter((attack) =>
    isAttackUnlocked(loadoutFighterId, attack),
  );
  const loadoutSelectedAttacks = loadoutAttackPool.filter((attack) =>
    loadoutAttackKeys.includes(getAttackKey(attack)),
  );
  const loadoutOpponents = availableFighters.filter(
    (fighter) => fighter.id !== loadoutFighterId && loadoutOpponentIds.includes(fighter.id),
  );
  const loadoutSlotLimit = getAttackSlotLimit(loadoutFighter?.data?.slot ?? 0);

  useEffect(() => {
    if (!loadoutFighterId) return;
    const fighter = roster.find((entry) => entry.id === loadoutFighterId);
    if (!fighter) return;
    const unlockedAttacks = (fighter.data?.attacks ?? []).filter((attack) =>
      isAttackUnlocked(fighter.id, attack),
    );
    setLoadoutAttackKeys(unlockedAttacks.map(getAttackKey));
    setLoadoutOpponentIds(
      availableFighters
        .filter((opponent) => opponent.id !== fighter.id)
        .map((opponent) => opponent.id),
    );
    setLoadoutResults(null);
  }, [loadoutFighterId, unlockedIds]);

  function toggleLoadoutAttack(key) {
    setLoadoutAttackKeys((previous) =>
      previous.includes(key)
        ? previous.filter((entry) => entry !== key)
        : [...previous, key],
    );
    setLoadoutResults(null);
  }

  function toggleLoadoutOpponent(id) {
    setLoadoutOpponentIds((previous) =>
      previous.includes(id)
        ? previous.filter((entry) => entry !== id)
        : [...previous, id],
    );
    setLoadoutResults(null);
  }

  async function runLoadoutOptimization() {
    if (!loadoutFighter || loadoutSelectedAttacks.length < loadoutSlotLimit) {
      alert(`Choose at least ${loadoutSlotLimit} unlocked attacks for this fighter.`);
      return;
    }
    if (loadoutOpponents.length === 0) {
      alert("Select at least one opponent to test against.");
      return;
    }

    const candidateLimit = Math.min(40, Math.max(1, Number(loadoutCandidateLimit) || 12));
    const repeats = Math.min(20, Math.max(1, Number(loadoutRepeats) || 1));
    const currentKeys = getEquippedAttackKeys(
      loadoutFighter.id,
      loadoutFighter.data.attacks ?? [],
      loadoutFighter.data.slot,
    );
    const candidates = buildAttackCombinations(
      loadoutSelectedAttacks,
      loadoutSlotLimit,
      candidateLimit,
      currentKeys,
    );
    if (!candidates.length) {
      alert("No legal attack combinations could be generated.");
      return;
    }

    const total = candidates.length * loadoutOpponents.length * repeats * 2;
    let completed = 0;
    const progressUpdate = () => {
      completed += 1;
      setProgress({ completed, total });
    };

    setLoadoutResults(null);
    setResults(null);
    setRunning(true);
    setProgress({ completed: 0, total });
    await yieldToBrowser();

    try {
      let best = null;
      const candidateResults = [];

      for (let candidateIndex = 0; candidateIndex < candidates.length; candidateIndex += 1) {
        const candidate = candidates[candidateIndex];
        const candidateKeys = candidate.map(getAttackKey);
        let wins = 0;
        let losses = 0;
        let draws = 0;
        let roundsTotal = 0;
        const opponentResults = [];

        for (const opponent of loadoutOpponents) {
          let opponentWins = 0;
          let opponentLosses = 0;
          let opponentDraws = 0;

          for (let startingOrder = 0; startingOrder < 2; startingOrder += 1) {
            for (let repeat = 0; repeat < repeats; repeat += 1) {
              const candidateData = {
                ...loadoutFighter.data,
                attacks: candidate.map((attack) => ({ ...attack })),
              };
              const opponentData = getFighterWithEquippedAttacks(opponent);
              const firstIsCandidate = startingOrder === 0;
              const result = simulateBattle(
                firstIsCandidate ? candidateData : opponentData,
                firstIsCandidate ? opponentData : candidateData,
                { difficultyOne: "Normal", difficultyTwo: "Normal" },
              );
              const outcome = getOneVsOneOutcome(result);
              const candidateWon =
                (firstIsCandidate && outcome === "first") ||
                (!firstIsCandidate && outcome === "second");
              const opponentWon =
                (firstIsCandidate && outcome === "second") ||
                (!firstIsCandidate && outcome === "first");

              if (candidateWon) {
                wins += 1;
                opponentWins += 1;
              } else if (opponentWon) {
                losses += 1;
                opponentLosses += 1;
              } else {
                draws += 1;
                opponentDraws += 1;
              }
              roundsTotal += result.rounds;
              progressUpdate();
            }
          }

          const opponentBattles = opponentWins + opponentLosses + opponentDraws;
          opponentResults.push({
            id: opponent.id,
            name: getFighterName(opponent),
            wins: opponentWins,
            losses: opponentLosses,
            draws: opponentDraws,
            winRate: opponentBattles
              ? ((opponentWins / opponentBattles) * 100).toFixed(1)
              : "0.0",
          });
          await yieldToBrowser();
        }

        const battles = wins + losses + draws;
        const score = battles ? ((wins + draws * 0.5) / battles) * 100 : 0;
        const entry = {
          keys: candidateKeys,
          attacks: candidate,
          wins,
          losses,
          draws,
          battles,
          score,
          averageRounds: battles ? roundsTotal / battles : 0,
          opponentResults,
        };
        candidateResults.push(entry);
        if (!best || entry.score > best.score ||
          (entry.score === best.score && entry.wins > best.wins)) {
          best = entry;
        }
      }

      if (best) {
        saveEquippedAttackKeys(
          loadoutFighter.id,
          best.keys,
          loadoutFighter.data.attacks ?? [],
          loadoutFighter.data.slot,
        );
      }
      candidateResults.sort((a, b) => b.score - a.score || b.wins - a.wins);
      setLoadoutResults({
        fighter: loadoutFighter,
        best,
        candidatesTested: candidateResults.length,
        opponentsTested: loadoutOpponents.length,
        candidateResults,
      });
      setProgress({ completed: total, total });
    } catch (error) {
      console.error("Loadout optimization failed:", error);
      alert("The loadout test encountered an error. Check the console.");
    } finally {
      setRunning(false);
    }
  }

  function toggleAnalysisFighter(id) {
    setSelectedFighterIds((previousIds) =>
      previousIds.includes(id)
        ? previousIds.filter((fighterId) => fighterId !== id)
        : [...previousIds, id],
    );

    setResults(null);
  }

  function selectAllAnalysisFighters() {
    setSelectedFighterIds(availableFighters.map((fighter) => fighter.id));
    setResults(null);
  }

  function deselectAllAnalysisFighters() {
    setSelectedFighterIds([]);
    setResults(null);
  }

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

  async function runCustomSimulations(requestedCount, onProgress) {
    const fighterOne = chooseFighter(fighterOneId);
    const fighterTwo = chooseFighter(
      fighterTwoId,
      fighterOne ? [fighterOne.id] : [],
    );

    if (!fighterOne || !fighterTwo) {
      alert("You need at least two available fighters.");
      return;
    }

    const fighterOneStarts = await runStartingOrderSeries(
      fighterOne,
      fighterTwo,
      requestedCount,
      difficultyOne,
      difficultyTwo,
      onProgress,
    );

    const fighterTwoStarts = await runStartingOrderSeries(
      fighterTwo,
      fighterOne,
      requestedCount,
      difficultyTwo,
      difficultyOne,
      onProgress,
    );

    const botOneWins = fighterOneStarts.firstWins + fighterTwoStarts.secondWins;

    const botTwoWins = fighterOneStarts.secondWins + fighterTwoStarts.firstWins;

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

  async function runAllMatchups(requestedCount, onProgress) {
    const fighterStats = {};
    const matchupStats = createMatchupStats(analysisFighters);

    for (const fighter of analysisFighters) {
      fighterStats[fighter.id] = createFighterRecord(fighter);
    }

    let totalBattles = 0;
    let totalRounds = 0;
    let lastResult = null;
    let matchupCount = 0;

    for (let i = 0; i < analysisFighters.length; i++) {
      for (let j = i + 1; j < analysisFighters.length; j++) {
        const fighterOne = analysisFighters[i];
        const fighterTwo = analysisFighters[j];

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
              getFighterWithEquippedAttacks(order.first),
              getFighterWithEquippedAttacks(order.second),
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

            const battleOutcome = getOneVsOneOutcome(result);

            const firstOutcome =
              battleOutcome === "first"
                ? "win"
                : battleOutcome === "second"
                  ? "loss"
                  : "draw";

            const secondOutcome =
              battleOutcome === "second"
                ? "win"
                : battleOutcome === "first"
                  ? "loss"
                  : "draw";

            recordHeadToHead(
              matchupStats,
              order.first,
              order.second,
              firstOutcome,
            );

            recordHeadToHead(
              matchupStats,
              order.second,
              order.first,
              secondOutcome,
            );

            totalBattles++;

            onProgress?.();

            if (totalBattles % 5 === 0) {
              await yieldToBrowser();
            }

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
      leaderboard: createFighterLeaderboard(fighterStats, analysisFighters),
      matchupRankings: createMatchupRankings(matchupStats),
      totalBattles,
      matchupCount,
      averageRounds:
        totalBattles > 0 ? (totalRounds / totalBattles).toFixed(1) : "0.0",
      lastResult,
    });
    await yieldToBrowser();
  }

  async function runCustomTeamSimulations(requestedCount, onProgress) {
    const teamOne = resolveTeam(teamOneIds);
    const teamTwo = resolveTeam(
      teamTwoIds,
      teamOne ? teamOne.map((fighter) => fighter.id) : [],
    );

    if (!teamOne || !teamTwo) {
      alert("You need at least four different unlocked fighters for 2v2.");
      return;
    }

    const firstTeamStarts = await runTeamStartingOrderSeries(
      teamOne,
      teamTwo,
      requestedCount,
      difficultyOne,
      difficultyTwo,
      onProgress,
    );

    const secondTeamStarts = await runTeamStartingOrderSeries(
      teamTwo,
      teamOne,
      requestedCount,
      difficultyTwo,
      difficultyOne,
      onProgress,
    );

    const teamOneWins = firstTeamStarts.firstWins + secondTeamStarts.secondWins;

    const teamTwoWins = firstTeamStarts.secondWins + secondTeamStarts.firstWins;

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

  async function runAllTeamMatchups(requestedCount, onProgress) {
    const allTeams = [];

    // Build every unique two-fighter combination
    // using only the selected analysis roster.
    for (let i = 0; i < analysisFighters.length; i++) {
      for (let j = i + 1; j < analysisFighters.length; j++) {
        allTeams.push([analysisFighters[i], analysisFighters[j]]);
      }
    }

    if (allTeams.length < 2) {
      alert("You need at least four unlocked fighters to compare teams.");
      return;
    }

    const teamStats = {};
    const matchupStats = createMatchupStats(analysisFighters);
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
              order.first.map(getFighterWithEquippedAttacks),
              order.second.map(getFighterWithEquippedAttacks),
              {
                difficultyOne: order.firstDifficulty,
                difficultyTwo: order.secondDifficulty,
              },
            );

            recordTeamBattle(teamStats, order.first, result, "first");
            recordTeamBattle(teamStats, order.second, result, "second");
            const teamOutcome = getTeamBattleOutcome(result);

            const firstTeamOutcome =
              teamOutcome === "first"
                ? "win"
                : teamOutcome === "second"
                  ? "loss"
                  : "draw";

            const secondTeamOutcome =
              teamOutcome === "second"
                ? "win"
                : teamOutcome === "first"
                  ? "loss"
                  : "draw";

            // Record all four individual cross-team matchups.
            for (const fighter of order.first) {
              for (const opponent of order.second) {
                recordHeadToHead(
                  matchupStats,
                  fighter,
                  opponent,
                  firstTeamOutcome,
                );
              }
            }

            for (const fighter of order.second) {
              for (const opponent of order.first) {
                recordHeadToHead(
                  matchupStats,
                  fighter,
                  opponent,
                  secondTeamOutcome,
                );
              }
            }
            totalBattles++;

            onProgress?.();

            if (totalBattles % 5 === 0) {
              await yieldToBrowser();
            }

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
      matchupRankings: createMatchupRankings(matchupStats),
      totalBattles,
      matchupCount,
      teamCombinationCount: allTeams.length,
      averageRounds:
        totalBattles > 0 ? (totalRounds / totalBattles).toFixed(1) : "0.0",
      lastResult,
    });
    await yieldToBrowser();
  }

  async function runSimulations() {
    const minimumFighters = battleType === "2v2" ? 4 : 2;

    const fightersToSimulate =
      mode === "all" ? analysisFighters : availableFighters;

    if (fightersToSimulate.length < minimumFighters) {
      alert(
        mode === "all"
          ? `Select at least ${minimumFighters} fighters to run this analysis.`
          : battleType === "2v2"
            ? "You need at least four unlocked fighters for 2v2."
            : "You need at least two unlocked fighters to simulate battles.",
      );
      return;
    }

    const requestedCount = Math.min(
      1000,
      Math.max(1, Number(simulationCount) || 1),
    );

    // Calculate exactly how many battles this operation will run.
    const fighterCount = fightersToSimulate.length;
    const uniqueMatchups = (fighterCount * (fighterCount - 1)) / 2;

    let totalBattles;

    if (mode === "custom") {
      // Two starting positions, each tested requestedCount times.
      totalBattles = requestedCount * 2;
    } else if (battleType === "1v1") {
      totalBattles = uniqueMatchups * 2 * requestedCount;
    } else {
      // Every possible two-fighter team.
      const teamCount = uniqueMatchups;

      // Every unique team-versus-team matchup.
      const teamMatchups = (teamCount * (teamCount - 1)) / 2;

      totalBattles = teamMatchups * 2 * requestedCount;
    }

    setRunning(true);
    setResults(null);
    setProgress({
      completed: 0,
      total: totalBattles,
    });

    let completedBattles = 0;

    const handleProgress = () => {
      completedBattles++;

      setProgress({
        completed: completedBattles,
        total: totalBattles,
      });
    };

    try {
      // Give React time to display the progress bar before calculation.
      await yieldToBrowser();

      if (battleType === "1v1") {
        if (mode === "all") {
          await runAllMatchups(requestedCount, handleProgress);
        } else {
          await runCustomSimulations(requestedCount, handleProgress);
        }
      } else {
        if (mode === "all") {
          await runAllTeamMatchups(requestedCount, handleProgress);
        } else {
          await runCustomTeamSimulations(requestedCount, handleProgress);
        }
      }

      // Ensure the progress indicator finishes at exactly 100%.
      setProgress({
        completed: totalBattles,
        total: totalBattles,
      });
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
                : (result.winner ?? "Draw")}
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
          <p>Wild Cards</p>
          <h1>BOT VS BOT</h1>
        </div>

        <button onClick={() => navigate("/watch-mode")}>▶ WATCH BATTLE</button>
      </header>

      <section className="simulator-setup">
        <h2>SIMULATION SETUP</h2>

        <p>
          Run custom battles or compare fighters and teams using repeated
          simulations.
        </p>

        <div className="simulator-mode-buttons">
          <button
            className={activeTab === "1v1" ? "active" : ""}
            onClick={() => {
              setActiveTab("1v1");
              setBattleType("1v1");
              setResults(null);
              setLoadoutResults(null);
            }}
          >
            1V1
          </button>

          <button
            className={activeTab === "2v2" ? "active" : ""}
            onClick={() => {
              setActiveTab("2v2");
              setBattleType("2v2");
              setResults(null);
              setLoadoutResults(null);
            }}
          >
            2V2
          </button>

          <button
            className={activeTab === "loadout" ? "active" : ""}
            onClick={() => {
              setActiveTab("loadout");
              setResults(null);
              setLoadoutResults(null);
            }}
          >
            LOADOUT LAB
          </button>
        </div>

        {activeTab !== "loadout" && <div className="simulator-mode-buttons">
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
        </div>}

        {activeTab === "loadout" ? (
          <div className="loadout-lab">
            <div className="loadout-lab-intro">
              <h3>ATTACK LOADOUT OPTIMIZER</h3>
              <p>
                Choose a fighter, define the unlocked attacks the optimizer may use,
                then select opponents. Every tested combination obeys the fighter's
                attack-slot limit. The winning combination becomes the fighter's equipped loadout.
              </p>
            </div>

            <div className="loadout-lab-controls">
              <div className="loadout-lab-panel">
                <label htmlFor="loadoutFighter">1. SELECT FIGHTER</label>
                <select
                  id="loadoutFighter"
                  value={loadoutFighterId}
                  onChange={(event) => setLoadoutFighterId(event.target.value)}
                  disabled={running}
                >
                  {availableFighters.map((fighter) => (
                    <option key={fighter.id} value={fighter.id}>{getFighterName(fighter)}</option>
                  ))}
                </select>
                <p className="loadout-slot-note">
                  {loadoutSlotLimit} attack slots · {loadoutAttackPool.length} unlocked attacks available
                </p>
              </div>

              <div className="loadout-lab-panel">
                <div className="loadout-panel-heading">
                  <label>2. CHOOSE ELIGIBLE ATTACKS</label>
                  <span>{loadoutSelectedAttacks.length} selected</span>
                </div>
                <p className="loadout-slot-note">
                  The pool can contain more attacks than the slots. Each tested build will equip no more than {loadoutSlotLimit}.
                </p>
                <div className="loadout-choice-list">
                  {loadoutAttackPool.map((attack) => {
                    const key = getAttackKey(attack);
                    return (
                      <label key={key} className="loadout-choice">
                        <input
                          type="checkbox"
                          checked={loadoutAttackKeys.includes(key)}
                          onChange={() => toggleLoadoutAttack(key)}
                          disabled={running}
                        />
                        <span>{attack.name ?? key}</span>
                      </label>
                    );
                  })}
                </div>
                {loadoutSelectedAttacks.length < loadoutSlotLimit && (
                  <p className="loadout-warning">
                    Select at least {loadoutSlotLimit} unlocked attacks to fill this fighter's slots.
                  </p>
                )}
              </div>

              <div className="loadout-lab-panel">
                <div className="loadout-panel-heading">
                  <label>3. SELECT OPPONENTS</label>
                  <span>{loadoutOpponents.length} selected</span>
                </div>
                <div className="loadout-choice-list opponent-choice-list">
                  {availableFighters.filter((fighter) => fighter.id !== loadoutFighterId).map((fighter) => (
                    <label key={fighter.id} className="loadout-choice">
                      <input
                        type="checkbox"
                        checked={loadoutOpponentIds.includes(fighter.id)}
                        onChange={() => toggleLoadoutOpponent(fighter.id)}
                        disabled={running}
                      />
                      <span>{getFighterName(fighter)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="loadout-test-settings">
              <label>
                Candidate combinations
                <input
                  type="number"
                  min="1"
                  max="40"
                  value={loadoutCandidateLimit}
                  onChange={(event) => setLoadoutCandidateLimit(event.target.value)}
                  disabled={running}
                />
              </label>
              <label>
                Battles per starting position
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={loadoutRepeats}
                  onChange={(event) => setLoadoutRepeats(event.target.value)}
                  disabled={running}
                />
              </label>
            </div>

            <button
              className="run-simulation-button"
              onClick={runLoadoutOptimization}
              disabled={running || !loadoutFighter || loadoutSelectedAttacks.length < loadoutSlotLimit || loadoutOpponents.length === 0}
            >
              {running ? "TESTING ATTACK COMBINATIONS..." : "FIND BEST ATTACK COMBINATION"}
            </button>

            {running && progress.total > 0 && (
              <div className="simulation-progress">
                <div className="simulation-progress-header">
                  <span>TESTING LEGAL LOADOUTS AGAINST OPPONENTS...</span>
                  <strong>{progressPercentage}%</strong>
                </div>
                <div className="simulation-progress-track" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin={0} aria-valuemax={100}>
                  <div className="simulation-progress-fill" style={{ width: `${progressPercentage}%` }} />
                </div>
                <p>{progress.completed.toLocaleString()} / {progress.total.toLocaleString()} battles completed</p>
              </div>
            )}

            {loadoutResults && (
              <div className="loadout-results">
                <h3>BEST LOADOUT · {getFighterName(loadoutResults.fighter)}</h3>
                <p className="loadout-best-score">
                  Performance score: <strong>{loadoutResults.best.score.toFixed(1)}%</strong>
                  <span> · {loadoutResults.best.wins} wins / {loadoutResults.best.losses} losses / {loadoutResults.best.draws} draws</span>
                </p>
                <p className="loadout-saved-note">
                  <strong>Saved to equipped slots.</strong> Standard 1v1 and 2v2 simulations now use this legal loadout for this fighter.
                </p>
                <div className="loadout-best-attacks">
                  {loadoutResults.best.attacks.map((attack, index) => (
                    <div key={getAttackKey(attack)}>
                      <span> SLOT {index + 1} </span>
                      <strong>{attack.name ?? getAttackKey(attack)}</strong>
                    </div>
                  ))}
                </div>
                <h4>PERFORMANCE BY OPPONENT</h4>
                <div className="matchup-table-wrapper">
                  <table className="matchup-table">
                    <thead><tr><th>OPPONENT</th><th>WIN RATE</th><th>WINS</th><th>LOSSES</th><th>DRAWS</th></tr></thead>
                    <tbody>
                      {loadoutResults.best.opponentResults.map((opponent) => (
                        <tr key={opponent.id}>
                          <td>{opponent.name}</td><td>{opponent.winRate}%</td><td>{opponent.wins}</td><td>{opponent.losses}</td><td>{opponent.draws}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h4>TOP TESTED COMBINATIONS</h4>
                <div className="loadout-candidate-results">
                  {loadoutResults.candidateResults.slice(0, 5).map((candidate, index) => (
                    <div key={candidate.keys.join("|")} className={index === 0 ? "loadout-candidate-best" : ""}>
                      <strong>#{index + 1} · {candidate.score.toFixed(1)}%</strong>
                      <span>{candidate.attacks.map((attack) => attack.name ?? getAttackKey(attack)).join(" · ")}</span>
                    </div>
                  ))}
                </div>
                <p className="simulation-warning">
                  Tested {loadoutResults.candidatesTested} combinations against {loadoutResults.opponentsTested} opponents.
                  When the full combination count is larger than the candidate budget, the lab samples legal combinations to keep testing responsive.
                </p>
              </div>
            )}
          </div>
        ) : (
          <>
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
              The simulator tests each unique pair of unlocked fighters in both
              starting positions.
            </p>

            <p>
              Fighters selected: <strong>{analysisFighters.length}</strong>
            </p>

            <p>
              Unique matchups:{" "}
              <strong>
                {(analysisFighters.length * (analysisFighters.length - 1)) / 2}
              </strong>
            </p>
          </div>
        )}

        {mode === "all" && battleType === "2v2" && (
          <div className="all-matchups-info">
            <h3>EVERY TWO-FIGHTER TEAM</h3>

            <p>
              The simulator creates every unique pair of unlocked fighters, then
              tests each team against every other team in both starting
              positions.
            </p>

            <p>
              Fighters selected: <strong>{analysisFighters.length}</strong>
            </p>

            <p>
              Possible teams:{" "}
              <strong>
                {(analysisFighters.length * (analysisFighters.length - 1)) / 2}
              </strong>
            </p>

            <p className="simulation-warning">
              This mode can run many battles. Start with 1–10 battles per
              matchup, then increase the count if performance is good.
            </p>
          </div>
        )}

        {mode === "all" && (
          <div className="analysis-fighter-selector">
            <div className="analysis-fighter-selector-header">
              <div>
                <h3>SELECT FIGHTERS TO ANALYZE</h3>

                <p>
                  Choose which unlocked fighters should participate in the
                  matchup simulations.
                </p>
              </div>

              <div className="analysis-selection-actions">
                <button
                  type="button"
                  onClick={selectAllAnalysisFighters}
                  disabled={running}
                >
                  SELECT ALL
                </button>

                <button
                  type="button"
                  onClick={deselectAllAnalysisFighters}
                  disabled={running}
                >
                  DESELECT ALL
                </button>
              </div>
            </div>

            <p className="analysis-selection-count">
              Selected: <strong>{analysisFighters.length}</strong> /{" "}
              {availableFighters.length} unlocked fighters
            </p>

            <div className="analysis-fighter-list">
              {availableFighters.map((fighter) => (
                <label className="analysis-fighter-option" key={fighter.id}>
                  <input
                    type="checkbox"
                    checked={selectedFighterIds.includes(fighter.id)}
                    onChange={() => toggleAnalysisFighter(fighter.id)}
                    disabled={running}
                  />

                  <span>{getFighterName(fighter)}</span>
                </label>
              ))}
            </div>

            {analysisFighters.length < (battleType === "2v2" ? 4 : 2) && (
              <p className="analysis-selection-warning">
                Select at least {battleType === "2v2" ? 4 : 2} fighters to run
                this analysis.
              </p>
            )}
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
            (mode === "all" &&
              analysisFighters.length < (battleType === "2v2" ? 4 : 2)) ||
            (mode === "custom" &&
              availableFighters.length < (battleType === "2v2" ? 4 : 2))
          }
        >
          {running ? "SIMULATING..." : "RUN SIMULATION"}
        </button>

        {running && (
          <div className="simulation-progress">
            <div className="simulation-progress-header">
              <span>CALCULATING MATCHUPS...</span>
              <strong>{progressPercentage}%</strong>
            </div>

            <div
              className="simulation-progress-track"
              role="progressbar"
              aria-valuenow={progressPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="simulation-progress-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>

            <p>
              {progress.completed.toLocaleString()} /{" "}
              {progress.total.toLocaleString()} battles completed
            </p>
          </div>
        )}
          </>
        )}
      </section>

      {activeTab !== "loadout" && results && results.type === "custom" && (
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
              <strong>Bot 1:</strong>{" "}
              {getFighterName(results.selectedFighterOne)}
              {" vs "}
              <strong>Bot 2:</strong>{" "}
              {getFighterName(results.selectedFighterTwo)}
            </p>
          )}

          <p>
            Battles completed: <strong>{results.completed}</strong>
          </p>

          <div className="simulation-stat-grid">
            <div>
              <span>
                {results.battleType === "2v2" ? "TEAM 1 WINS" : "BOT 1 WINS"}
              </span>
              <strong>{results.botOneWins}</strong>
            </div>

            <div>
              <span>
                {results.battleType === "2v2" ? "TEAM 2 WINS" : "BOT 2 WINS"}
              </span>
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
                    <p>
                      Average rounds to win: {test.secondAverageRoundsToWin}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {renderLastBattle(results.lastResult)}
        </section>
      )}

      {activeTab !== "loadout" && results && results.type === "all" && (
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

          {results.matchupRankings && (
            <div className="fighter-matchup-rankings">
              <h3>
                {results.battleType === "2v2"
                  ? "TEAM-BASED FIGHTER MATCHUPS"
                  : "INDIVIDUAL FIGHTER MATCHUPS"}
              </h3>

              <p>
                {results.battleType === "2v2"
                  ? "These records show how fighters perform against opposing fighters based on their teams' overall battle results. Each team result is attributed to all four cross-team fighter pairings."
                  : "Discover which opponents each fighter struggles against and which opponents they defeat most frequently."}
              </p>

              <div className="fighter-matchup-grid">
                {results.matchupRankings.map((fighter) => (
                  <div className="fighter-matchup-card" key={fighter.id}>
                    <h4>{fighter.name}</h4>

                    <div className="fighter-matchup-columns">
                      <div>
                        <h5 className="difficult-opponents-heading">
                          TOUGHEST OPPONENTS
                        </h5>

                        {fighter.mostDifficult.length > 0 ? (
                          <ol className="fighter-matchup-list">
                            {fighter.mostDifficult.map((opponent, index) => (
                              <li key={opponent.id}>
                                <span className="matchup-rank">
                                  #{index + 1}
                                </span>

                                <div>
                                  <strong>{opponent.name}</strong>

                                  <small>{opponent.losses} losses</small>

                                  <small>
                                    W: {opponent.wins} · L: {opponent.losses} ·
                                    D: {opponent.draws}
                                  </small>
                                </div>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="fighter-matchup-empty">
                            No recorded losses.
                          </p>
                        )}
                      </div>

                      <div>
                        <h5 className="favorable-opponents-heading">
                          MOST FAVORABLE
                        </h5>

                        {fighter.mostFavorable.length > 0 ? (
                          <ol className="fighter-matchup-list">
                            {fighter.mostFavorable.map((opponent, index) => (
                              <li key={opponent.id}>
                                <span className="matchup-rank">
                                  #{index + 1}
                                </span>

                                <div>
                                  <strong>{opponent.name}</strong>

                                  <small>{opponent.wins} wins</small>

                                  <small>
                                    W: {opponent.wins} · L: {opponent.losses} ·
                                    D: {opponent.draws}
                                  </small>
                                </div>
                              </li>
                            ))}
                          </ol>
                        ) : (
                          <p className="fighter-matchup-empty">
                            No recorded wins.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="simulation-warning">
            Overall score combines win rate (60%), starting-position performance
            (20%), health remaining after wins (10%), and speed of victory
            (10%). Results depend on the selected AI difficulties and are not a
            definitive measure of character or team balance. Please don't exceed
            with the rounds as that causes the game to load longer. For example,
            30 is recommened on 1v1 while 5 for 2v2.
          </p>

          {renderLastBattle(results.lastResult)}
        </section>
      )}
    </main>
  );
}

function yieldToBrowser() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export default BotSimulator;
