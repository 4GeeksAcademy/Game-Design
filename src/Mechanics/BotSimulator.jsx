import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { roster } from "./Main Page/CharacterSelection.jsx";
import { getUnlockedCharacters } from "./Currency.js";
import { simulateBattle } from "./BattleSimulator.js";

import "./BotSimulator.css";

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
    let botOneWins = 0;
    let botTwoWins = 0;
    let draws = 0;
    let totalRounds = 0;
    let lastResult = null;

    // Select each fighter once for the entire batch.
    const fighterOne = chooseFighter(fighterOneId, null);
    const fighterTwo = chooseFighter(fighterTwoId, fighterOne?.id);

    if (!fighterOne || !fighterTwo) {
      alert("You need at least two available fighters.");
      return;
    }

    // Run the same matchup repeatedly.
    for (let i = 0; i < requestedCount; i++) {
      const result = simulateBattle(fighterOne.data, fighterTwo.data, {
        difficultyOne,
        difficultyTwo,
      });

      if (result.winner === fighterOne.data.name) {
        botOneWins++;
      } else if (result.winner === fighterTwo.data.name) {
        botTwoWins++;
      } else {
        draws++;
      }

      totalRounds += result.rounds;

      lastResult = {
        ...result,
        selectedFighterOne: fighterOne,
        selectedFighterTwo: fighterTwo,
      };
    }

    const completed = botOneWins + botTwoWins + draws;

    setResults({
      type: "custom",
      botOneWins,
      botTwoWins,
      draws,
      completed,
      averageRounds: completed > 0 ? (totalRounds / completed).toFixed(1) : "0",
      lastResult,
    });
  }

  function runAllMatchups(requestedCount) {
    const fighterStats = {};

    for (const fighter of availableFighters) {
      fighterStats[fighter.id] = {
        id: fighter.id,
        name: fighter.data.name,
        wins: 0,
        losses: 0,
        draws: 0,
        battles: 0,
        totalRounds: 0,
      };
    }

    let totalBattles = 0;
    let totalRounds = 0;
    let lastResult = null;
    let matchupCount = 0;

    // Each pair is tested once: A vs B, but not B vs A again.
    for (let i = 0; i < availableFighters.length; i++) {
      for (let j = i + 1; j < availableFighters.length; j++) {
        const fighterOne = availableFighters[i];
        const fighterTwo = availableFighters[j];

        matchupCount++;

        for (let battle = 0; battle < requestedCount; battle++) {
          const result = simulateBattle(fighterOne.data, fighterTwo.data, {
            difficultyOne,
            difficultyTwo,
          });

          const statsOne = fighterStats[fighterOne.id];
          const statsTwo = fighterStats[fighterTwo.id];

          statsOne.battles++;
          statsTwo.battles++;

          statsOne.totalRounds += result.rounds;
          statsTwo.totalRounds += result.rounds;

          totalBattles++;
          totalRounds += result.rounds;

          if (result.winner === fighterOne.data.name) {
            statsOne.wins++;
            statsTwo.losses++;
          } else if (result.winner === fighterTwo.data.name) {
            statsTwo.wins++;
            statsOne.losses++;
          } else {
            statsOne.draws++;
            statsTwo.draws++;
          }

          lastResult = {
            ...result,
            selectedFighterOne: fighterOne,
            selectedFighterTwo: fighterTwo,
          };
        }
      }
    }

    const leaderboard = Object.values(fighterStats)
      .map((fighter) => ({
        ...fighter,
        winRate:
          fighter.battles > 0
            ? ((fighter.wins / fighter.battles) * 100).toFixed(1)
            : "0.0",
        averageRounds:
          fighter.battles > 0
            ? (fighter.totalRounds / fighter.battles).toFixed(1)
            : "0.0",
      }))
      .sort((a, b) => Number(b.winRate) - Number(a.winRate) || b.wins - a.wins);

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
                  {entry.attacker}: {entry.attackerHealth} HP
                </span>

                <span>
                  {entry.defender}: {entry.defenderHealth} HP
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
                  <th>#</th>
                  <th>FIGHTER</th>
                  <th>WIN RATE</th>
                  <th>WINS</th>
                  <th>LOSSES</th>
                  <th>DRAWS</th>
                  <th>AVG. ROUNDS</th>
                </tr>
              </thead>
              <tbody>
                {results.leaderboard.map((fighter, index) => (
                  <tr key={fighter.id}>
                    <td>{index + 1}</td>
                    <td>{fighter.name}</td>
                    <td>{fighter.winRate}%</td>
                    <td>{fighter.wins}</td>
                    <td>{fighter.losses}</td>
                    <td>{fighter.draws}</td>
                    <td>{fighter.averageRounds}</td>
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
