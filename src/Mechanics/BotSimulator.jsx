import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { roster } from "./Main Page/CharacterSelection.jsx";
import { getUnlockedCharacters } from "./Currency.js";
import { simulateBattle } from "./BattleSimulator.js";

import "./BotSimulator.css";

const MAX_ROUNDS = 100;

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
    const result = simulateBattle(firstFighter.data, secondFighter.data, {
      difficultyOne: firstDifficulty,
      difficultyTwo: secondDifficulty,
    });

    totalRounds += result.rounds;

    if (result.winner === firstFighter.data.name) {
      firstWins++;
      firstWinnerHealthTotal += result.fighters[0].health;
      firstWinnerRoundsTotal += result.rounds;
    } else if (result.winner === secondFighter.data.name) {
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
    name: fighter.data.name,

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

  const won = result.winner === fighter.data.name;
  const drew = result.winner === null;

  stats.battles++;
  stats.totalRounds += result.rounds;

  if (position === "first") {
    stats.startsFirstBattles++;

    if (won) {
      stats.startsFirstWins++;
    }
  } else {
    stats.startsSecondBattles++;

    if (won) {
      stats.startsSecondWins++;
    }
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

function BotSimulator() {
  const navigate = useNavigate();

  const [unlockedIds, setUnlockedIds] = useState(() => getUnlockedCharacters());

  const [mode, setMode] = useState("custom");
  const [fighterOneId, setFighterOneId] = useState("random");
  const [fighterTwoId, setFighterTwoId] = useState("random");

  const [difficultyOne, setDifficultyOne] = useState("Easy");
  const [difficultyTwo, setDifficultyTwo] = useState("Easy");
  const [simulationCount, setSimulationCount] = useState("100");

  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const updateUnlocks = () => {
      setUnlockedIds(getUnlockedCharacters());
    };

    window.addEventListener("unlocksUpdated", updateUnlocks);

    return () => {
      window.removeEventListener("unlocksUpdated", updateUnlocks);
    };
  }, []);

  const availableFighters = roster.filter((fighter) =>
    unlockedIds.includes(fighter.id),
  );

  function chooseFighter(preferredId, excludedId) {
    const candidates = availableFighters.filter(
      (fighter) => fighter.id !== excludedId,
    );

    if (candidates.length === 0) return null;

    if (preferredId !== "random") {
      const chosen = candidates.find((fighter) => fighter.id === preferredId);

      if (chosen) return chosen;
    }

    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  function runCustomSimulations(requestedCount) {
    const fighterOne = chooseFighter(fighterOneId, null);
    const fighterTwo = chooseFighter(fighterTwoId, fighterOne?.id);

    if (!fighterOne || !fighterTwo) {
      alert("You need at least two available fighters.");
      return;
    }

    // TEST A: Fighter One starts first.
    const fighterOneStarts = runStartingOrderSeries(
      fighterOne,
      fighterTwo,
      requestedCount,
      difficultyOne,
      difficultyTwo,
    );

    // TEST B: Fighter Two starts first.
    // The difficulty settings follow their respective fighters.
    const fighterTwoStarts = runStartingOrderSeries(
      fighterTwo,
      fighterOne,
      requestedCount,
      difficultyTwo,
      difficultyOne,
    );

    // Combine the results while keeping both starting orders separate.
    const botOneWins = fighterOneStarts.firstWins + fighterTwoStarts.secondWins;

    const botTwoWins = fighterOneStarts.secondWins + fighterTwoStarts.firstWins;

    const draws = fighterOneStarts.draws + fighterTwoStarts.draws;

    const completed = fighterOneStarts.completed + fighterTwoStarts.completed;

    const totalRounds =
      Number(fighterOneStarts.averageRounds) * requestedCount +
      Number(fighterTwoStarts.averageRounds) * requestedCount;

    setResults({
      type: "custom",

      selectedFighterOne: fighterOne,
      selectedFighterTwo: fighterTwo,

      botOneWins,
      botTwoWins,
      draws,
      completed,

      averageRounds:
        completed > 0 ? (totalRounds / completed).toFixed(1) : "0.0",

      startingOrderResults: [fighterOneStarts, fighterTwoStarts],

      // Display the last battle from the second test.
      lastResult: fighterTwoStarts.lastResult,
    });
  }

  function runAllMatchups(requestedCount) {
    const fighterStats = {};

    // Create a statistics record for every unlocked fighter.
    for (const fighter of availableFighters) {
      fighterStats[fighter.id] = createFighterRecord(fighter);
    }

    let totalBattles = 0;
    let totalRounds = 0;
    let lastResult = null;
    let matchupCount = 0;

    // Visit every unique pair of fighters.
    for (let i = 0; i < availableFighters.length; i++) {
      for (let j = i + 1; j < availableFighters.length; j++) {
        const fighterOne = availableFighters[i];
        const fighterTwo = availableFighters[j];

        matchupCount++;

        // Test both possible starting orders.
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
            const result = simulateBattle(order.first.data, order.second.data, {
              difficultyOne: order.firstDifficulty,
              difficultyTwo: order.secondDifficulty,
            });

            // Get each fighter's final health.
            // The simulator returns fighters in argument order.
            const firstHealth = result.fighters[0].health;
            const secondHealth = result.fighters[1].health;

            // Update the first fighter's statistics.
            recordFighterBattle(
              fighterStats,
              order.first,
              firstHealth,
              result,
              "first",
            );

            // Update the second fighter's statistics.
            recordFighterBattle(
              fighterStats,
              order.second,
              secondHealth,
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

    // Calculate the leaderboard statistics.
    // Calculate the leaderboard statistics.
    const leaderboard = Object.values(fighterStats)
      .map((fighter) => {
        // 1. Overall win rate.
        const winRate =
          fighter.battles > 0 ? (fighter.wins / fighter.battles) * 100 : 0;

        // 2. Win rate when starting first.
        const firstWinRate =
          fighter.startsFirstBattles > 0
            ? (fighter.startsFirstWins / fighter.startsFirstBattles) * 100
            : 0;

        // 3. Win rate when starting second.
        const secondWinRate =
          fighter.startsSecondBattles > 0
            ? (fighter.startsSecondWins / fighter.startsSecondBattles) * 100
            : 0;

        // Average the two starting positions.
        const startingOrderScore = (firstWinRate + secondWinRate) / 2;

        // 4. Average rounds across all battles.
        const averageRounds =
          fighter.battles > 0 ? fighter.totalRounds / fighter.battles : 0;

        // 5. Average rounds when the fighter wins.
        const averageRoundsToWin =
          fighter.wins > 0 ? fighter.totalRoundsToWin / fighter.wins : null;

        // 6. Average health remaining after victories.
        const averageHealthAfterWins =
          fighter.wins > 0 ? fighter.totalHealthAfterWins / fighter.wins : null;

        // Find the fighter's maximum starting health.
        const fighterData = availableFighters.find(
          (availableFighter) => availableFighter.id === fighter.id,
        );

        const maximumHealth =
          fighterData?.data.maximumHealth ?? fighterData?.data.health ?? 100;

        // Convert remaining health into a percentage.
        const healthScore =
          averageHealthAfterWins !== null && maximumHealth > 0
            ? Math.min(
                100,
                Math.max(0, (averageHealthAfterWins / maximumHealth) * 100),
              )
            : 50;

        // Reward faster wins.
        // A win in 2 rounds scores higher than a win in 5 rounds.
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

        // Combine all four factors into a score out of 100.
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
      // Strongest overall score appears first.
      .sort(
        (a, b) =>
          Number(b.overallScore) - Number(a.overallScore) ||
          Number(b.winRate) - Number(a.winRate) ||
          b.wins - a.wins,
      );

    // Send the completed leaderboard to React so it appears on screen.
    setResults({
      type: "all",
      leaderboard,
      totalBattles,
      matchupCount,
      averageRounds:
        totalBattles > 0 ? (totalRounds / totalBattles).toFixed(1) : "0.0",
      lastResult,
    });
  }

  function runSimulations() {
    if (availableFighters.length < 2) {
      alert("You need at least two unlocked fighters to simulate battles.");
      return;
    }

    const requestedCount = Math.min(
      1000,
      Math.max(1, Number(simulationCount) || 1),
    );

    setRunning(true);
    setResults(null);

    try {
      if (mode === "all") {
        runAllMatchups(requestedCount);
      } else {
        runCustomSimulations(requestedCount);
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

    return (
      <div className="last-simulation">
        <h3>LAST BATTLE</h3>

        <p>
          {result.selectedFighterOne.data.name} vs{" "}
          {result.selectedFighterTwo.data.name}
        </p>

        <p>
          Winner: <strong>{result.winner ?? "Draw"}</strong>
        </p>

        <p>Rounds: {result.rounds}</p>
        <p>End reason: {result.endReason}</p>

        <h3>COMBAT LOG</h3>

        <div className="simulation-log">
          {result.log.map((entry, index) => (
            <div className="combat-log-entry" key={`${entry.round}-${index}`}>
              <p>
                <strong>Round {entry.round}:</strong> {entry.attacker} used{" "}
                {entry.attack} against {entry.defender}
                {" — "}
                {entry.action}, {entry.damage} damage.
              </p>

              <div className="combat-log-health">
                <span>
                  <strong>{entry.attacker}</strong>
                  <span className="health-number">
                    {entry.attackerHealth} HP
                  </span>
                  <span className="mana-number">
                    {entry.attackerMana ?? "—"} MP
                  </span>
                </span>

                <span>
                  <strong>{entry.defender}</strong>
                  <span className="health-number">
                    {entry.defenderHealth} HP
                  </span>
                  <span className="mana-number">
                    {entry.defenderMana ?? "—"} MP
                  </span>
                </span>
              </div>
            </div>
          ))}
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

        <button onClick={() => navigate("/watch-mode")}>▶ WATCH BATTLE</button>
      </header>

      <section className="simulator-setup">
        <h2>SIMULATION SETUP</h2>

        <p>
          Run a custom battle or test every unique matchup between your unlocked
          fighters.
        </p>

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

        {mode === "custom" && (
          <div className="simulator-bots">
            <div className="simulator-bot">
              <h3>BOT 1</h3>

              <label htmlFor="fighterOne">Fighter</label>
              <select
                id="fighterOne"
                value={fighterOneId}
                onChange={(event) => setFighterOneId(event.target.value)}
              >
                <option value="random">Random unlocked fighter</option>
                {availableFighters.map((fighter) => (
                  <option key={fighter.id} value={fighter.id}>
                    {fighter.data.name}
                  </option>
                ))}
              </select>

              <label htmlFor="difficultyOne">Difficulty</label>
              <select
                id="difficultyOne"
                value={difficultyOne}
                onChange={(event) => setDifficultyOne(event.target.value)}
              >
                <option value="Easy">Easy</option>
                <option value="Normal">Normal</option>
                <option value="Hard">Hard</option>
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
                <option value="random">Random unlocked fighter</option>
                {availableFighters.map((fighter) => (
                  <option key={fighter.id} value={fighter.id}>
                    {fighter.data.name}
                  </option>
                ))}
              </select>

              <label htmlFor="difficultyTwo">Difficulty</label>
              <select
                id="difficultyTwo"
                value={difficultyTwo}
                onChange={(event) => setDifficultyTwo(event.target.value)}
              >
                <option value="Easy">Easy</option>
                <option value="Normal">Normal</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>
        )}

        {mode === "all" && (
          <div className="all-matchups-info">
            <h3>EVERY UNLOCKED FIGHTER</h3>
            <p>
              The simulator will test each unique pair of unlocked characters.
              Each fighter uses the difficulty assigned to its side below.
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

            <div className="simulator-bots">
              <div className="simulator-bot">
                <h3>FIRST FIGHTER</h3>
                <label htmlFor="difficultyOneAll">Difficulty</label>
                <select
                  id="difficultyOneAll"
                  value={difficultyOne}
                  onChange={(event) => setDifficultyOne(event.target.value)}
                >
                  <option value="Easy">Easy</option>
                  <option value="Normal">Normal</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>

              <div className="simulator-versus">VS</div>

              <div className="simulator-bot">
                <h3>SECOND FIGHTER</h3>
                <label htmlFor="difficultyTwoAll">Difficulty</label>
                <select
                  id="difficultyTwoAll"
                  value={difficultyTwo}
                  onChange={(event) => setDifficultyTwo(event.target.value)}
                >
                  <option value="Easy">Easy</option>
                  <option value="Normal">Normal</option>
                  <option value="Hard">Hard</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="simulation-count">
          <label htmlFor="simulationCount">
            {mode === "all"
              ? "Battles per matchup (1–1000)"
              : "Number of battles (1–1000)"}
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

        {mode === "all" && (
          <p className="simulation-warning">
            Tip: start with 25–100 battles per matchup. Large tests with many
            unlocked fighters can take longer to finish.
          </p>
        )}

        <button
          className="run-simulation-button"
          onClick={runSimulations}
          disabled={running || availableFighters.length < 2}
        >
          {running ? "SIMULATING..." : "RUN SIMULATION"}
        </button>
      </section>

      {results && results.type === "custom" && (
        <section className="simulation-results">
          <h2>SIMULATION RESULTS</h2>

          <p>
            Battles completed: <strong>{results.completed}</strong>
          </p>

          <div className="simulation-stat-grid">
            <div>
              <span>BOT 1 WINS</span>
              <strong>{results.botOneWins}</strong>
            </div>
            <div>
              <span>BOT 2 WINS</span>
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
              Each starting order was tested{" "}
              <strong>{results.startingOrderResults[0].completed}</strong>{" "}
              times.
            </p>

            <div className="starting-order-grid">
              {results.startingOrderResults.map((test, index) => (
                <div className="starting-order-card" key={index}>
                  <h4>{test.firstFighter.data.name} STARTS FIRST</h4>

                  <p>
                    <strong>{test.firstFighter.data.name}</strong> wins:{" "}
                    {test.firstWins}
                  </p>

                  <p>
                    <strong>{test.secondFighter.data.name}</strong> wins:{" "}
                    {test.secondWins}
                  </p>

                  <p>Draws: {test.draws}</p>

                  <p>Average rounds: {test.averageRounds}</p>

                  <hr />

                  <p>
                    <strong>{test.firstFighter.data.name}</strong>
                  </p>

                  <p>
                    Average HP after wins: {test.firstAverageHealthAfterWins}
                    {test.firstAverageHealthAfterWins !== "N/A" ? " HP" : ""}
                  </p>

                  <p>Average rounds to win: {test.firstAverageRoundsToWin}</p>

                  <hr />

                  <p>
                    <strong>{test.secondFighter.data.name}</strong>
                  </p>

                  <p>
                    Average HP after wins: {test.secondAverageHealthAfterWins}
                    {test.secondAverageHealthAfterWins !== "N/A" ? " HP" : ""}
                  </p>

                  <p>Average rounds to win: {test.secondAverageRoundsToWin}</p>
                </div>
              ))}
            </div>
          </div>

          {renderLastBattle(results.lastResult)}
        </section>
      )}

      {results && results.type === "all" && (
        <section className="simulation-results">
          <h2>MATCHUP LEADERBOARD</h2>

          <p>
            Battles completed: <strong>{results.totalBattles}</strong>
          </p>
          <p>
            Unique matchups tested: <strong>{results.matchupCount}</strong>
          </p>
          <p>
            Overall average rounds: <strong>{results.averageRounds}</strong>
          </p>

          <div className="matchup-table-wrapper">
            <table className="matchup-table">
              <thead>
                <tr>
                  <th>RANK</th>
                  <th>FIGHTER</th>
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
            Win rate is calculated as wins divided by all battles, including
            draws. Results reflect the selected AI difficulties and are not a
            definitive measure of character balance.
          </p>

          {renderLastBattle(results.lastResult)}
        </section>
      )}
    </main>
  );
}

export default BotSimulator;
