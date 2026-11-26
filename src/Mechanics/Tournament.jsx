import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { roster } from "./Main Page/CharacterSelection.jsx";
import { getUnlockedCharacters, addCoins } from "./Currency.js";
import { createWatchBattle, nextWatchAction } from "./WatchBattle.js";
import { getCharacterImage } from "./SkinManager.js";
import "./Tournament.css";

const REWARDS = { 1: 100000, 2: 50000, 3: 25000 };
const fighterName = (fighter) => fighter?.data?.name || fighter?.name || "Unknown Fighter";
const fighterImage = (fighter) => fighter ? getCharacterImage(fighter.id, fighter.image) : "";
const copyRounds = (rounds) => rounds.map((round) => round.map((match) => ({
  ...match,
  fighters: [...match.fighters],
})));

function simulateCpuMatch(one, two) {
  const toBot = (fighter) => ({
    ...fighter.data,
    image: fighter.image,
    rosterId: fighter.id,
  });
  const battle = createWatchBattle(toBot(one), toBot(two), "Normal", "Normal");
  let steps = 0;

  while (!battle.finished && steps < 3000) {
    nextWatchAction(battle);
    steps += 1;
  }

  if (!battle.finished) {
    const [first, second] = battle.fighters;
    battle.winner = first.health >= second.health ? first.name : second.name;
  }

  return battle.winner === battle.fighters[0].name ? one : two;
}

function makeTournament(size, player) {
  const pool = roster
    .filter((fighter) => fighter.id !== player.id)
    .sort(() => Math.random() - 0.5);
  const participants = [player, ...pool.slice(0, size - 1)]
    .sort(() => Math.random() - 0.5);
  const rounds = [];
  let matchCount = size / 2;
  let roundNumber = 1;

  while (matchCount >= 1) {
    rounds.push(Array.from({ length: matchCount }, (_, index) => ({
      id: "round-" + roundNumber + "-match-" + (index + 1),
      fighters: roundNumber === 1
        ? [participants[index * 2], participants[index * 2 + 1]]
        : [null, null],
      winner: null,
      isPlayerMatch: roundNumber === 1 && (
        participants[index * 2].id === player.id ||
        participants[index * 2 + 1].id === player.id
      ),
    })));
    matchCount /= 2;
    roundNumber += 1;
  }

  return {
    id: Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
    size,
    player,
    participants,
    rounds,
    currentRound: 0,
    started: false,
    playerEliminated: false,
    complete: false,
    rewardClaimed: false,
  };
}

function simulateRound(round, playerId = null) {
  round.forEach((match) => {
    const includesPlayer = match.fighters.some((fighter) => fighter?.id === playerId);
    if (
      !match.winner &&
      match.fighters[0] &&
      match.fighters[1] &&
      !includesPlayer
    ) {
      match.winner = simulateCpuMatch(match.fighters[0], match.fighters[1]);
    }
  });
}

function buildPlacements(tournament) {
  const rounds = tournament.rounds;
  const finalMatch = rounds[rounds.length - 1][0];
  const champion = finalMatch.winner;
  const runnerUp = finalMatch.fighters.find((fighter) => fighter.id !== champion.id);
  const semifinalRound = rounds[rounds.length - 2];
  const semifinalLosers = semifinalRound
    .map((match) => match.fighters.find((fighter) => fighter.id !== match.winner.id))
    .filter(Boolean);

  const thirdPlaceWinner = simulateCpuMatch(semifinalLosers[0], semifinalLosers[1]);
  const thirdPlaceLoser = semifinalLosers.find((fighter) => fighter.id !== thirdPlaceWinner.id);
  tournament.thirdPlaceMatch = {
    fighters: semifinalLosers,
    winner: thirdPlaceWinner,
  };

  if (tournament.size === 4) {
    return [champion, runnerUp, thirdPlaceWinner, thirdPlaceLoser];
  }

  const quarterfinalLosers = rounds[0]
    .map((match) => match.fighters.find((fighter) => fighter.id !== match.winner.id))
    .filter(Boolean);

  const consolationWinnerA = simulateCpuMatch(quarterfinalLosers[0], quarterfinalLosers[1]);
  const consolationWinnerB = simulateCpuMatch(quarterfinalLosers[2], quarterfinalLosers[3]);
  const consolationLoserA = quarterfinalLosers.find((fighter) =>
    fighter.id !== consolationWinnerA.id &&
    (fighter.id === quarterfinalLosers[0].id || fighter.id === quarterfinalLosers[1].id)
  );
  const consolationLoserB = quarterfinalLosers.find((fighter) =>
    fighter.id !== consolationWinnerB.id &&
    (fighter.id === quarterfinalLosers[2].id || fighter.id === quarterfinalLosers[3].id)
  );
  const fifthPlaceWinner = simulateCpuMatch(consolationWinnerA, consolationWinnerB);
  const seventhPlaceWinner = simulateCpuMatch(consolationLoserA, consolationLoserB);
  const sixthPlace = [consolationWinnerA, consolationWinnerB]
    .find((fighter) => fighter.id !== fifthPlaceWinner.id);
  const eighthPlace = [consolationLoserA, consolationLoserB]
    .find((fighter) => fighter.id !== seventhPlaceWinner.id);

  return [
    champion,
    runnerUp,
    thirdPlaceWinner,
    thirdPlaceLoser,
    fifthPlaceWinner,
    sixthPlace,
    seventhPlaceWinner,
    eighthPlace,
  ];
}

function completeRemainingMatches(tournament) {
  for (
    let roundIndex = tournament.currentRound;
    roundIndex < tournament.rounds.length;
    roundIndex += 1
  ) {
    const round = tournament.rounds[roundIndex];

    if (roundIndex > 0) {
      const previousWinners = tournament.rounds[roundIndex - 1]
        .map((match) => match.winner);
      round.forEach((match, index) => {
        if (!match.fighters[0]) {
          match.fighters = [
            previousWinners[index * 2] || null,
            previousWinners[index * 2 + 1] || null,
          ];
        }
      });
    }

    simulateRound(round, tournament.player.id);
  }

  const finalMatch = tournament.rounds[tournament.rounds.length - 1][0];
  if (!finalMatch.winner && finalMatch.fighters[0] && finalMatch.fighters[1]) {
    finalMatch.winner = simulateCpuMatch(finalMatch.fighters[0], finalMatch.fighters[1]);
  }

  tournament.complete = true;
  tournament.placements = buildPlacements(tournament);
  tournament.humanPlacement =
    tournament.placements.findIndex((fighter) => fighter.id === tournament.player.id) + 1 ||
    tournament.size;

  return tournament;
}

function TournamentFighter({
  fighter,
  mystery = false,
  player = false,
  eliminated = false,
  winner = false,
}) {
  return (
    <div className={[
      "wc-tourney-fighter",
      player ? "player-entry" : "",
      eliminated ? "eliminated" : "",
      winner ? "match-winner" : "",
    ].filter(Boolean).join(" ")}>
      <div className="wc-tourney-portrait">
        {mystery
          ? <span>?</span>
          : fighter
            ? <img src={fighterImage(fighter)} alt={fighterName(fighter)} />
            : <span>—</span>}
      </div>
      <span className="wc-tourney-fighter-name">
        {mystery ? "UNKNOWN CONTENDER" : fighter ? fighterName(fighter) : "TO BE DECIDED"}
      </span>
      {player && <small>YOU</small>}
      {winner && <small>WINNER</small>}
    </div>
  );
}

function TournamentMatch({ match, matchIndex, tournament, onEnterMatch }) {
  const playerId = tournament.player.id;
  const first = match.fighters[0];
  const second = match.fighters[1];
  const firstIsPlayer = first?.id === playerId;
  const secondIsPlayer = second?.id === playerId;
  const firstMystery = !first || (!tournament.started && !firstIsPlayer);
  const secondMystery = !second || (!tournament.started && !secondIsPlayer);
  const activePlayerMatch = tournament.started && match.isPlayerMatch && !match.winner;

  return (
    <article className={"wc-tourney-match" + (activePlayerMatch ? " is-player-match" : "")}>
      <div className="wc-tourney-match-heading">
        <span>MATCH {String(matchIndex + 1).padStart(2, "0")}</span>
        <span>{match.winner ? "COMPLETE" : "WINNER ADVANCES"}</span>
      </div>
      <div className="wc-tourney-matchup">
        <TournamentFighter
          fighter={first}
          mystery={firstMystery}
          player={firstIsPlayer}
          eliminated={Boolean(match.winner && match.winner.id !== first?.id)}
          winner={Boolean(match.winner && match.winner.id === first?.id)}
        />
        <span className="wc-tourney-versus">VS</span>
        <TournamentFighter
          fighter={second}
          mystery={secondMystery}
          player={secondIsPlayer}
          eliminated={Boolean(match.winner && match.winner.id !== second?.id)}
          winner={Boolean(match.winner && match.winner.id === second?.id)}
        />
      </div>
      {activePlayerMatch && (
        <button className="wc-tourney-fight-button" onClick={() => onEnterMatch(match)}>
          ENTER MATCH <span>▶</span>
        </button>
      )}
      {match.winner && (
        <div className="wc-tourney-winner-line">
          <span>ADVANCES</span>
          <strong>{fighterName(match.winner)}</strong>
        </div>
      )}
    </article>
  );
}

function Podium({ placements, showRewards = false }) {
  const podiumOrder = [2, 1, 3];
  return (
    <div className="wc-podium">
      {podiumOrder.map((rank) => {
        const fighter = placements?.[rank - 1];
        return (
          <article className={"wc-podium-place place-" + rank} key={rank}>
            <div className="wc-podium-rank">
              {rank === 1 ? "♛" : rank === 2 ? "Ⅱ" : "Ⅲ"}
            </div>
            {fighter
              ? <img src={fighterImage(fighter)} alt={fighterName(fighter)} />
              : <div className="wc-podium-empty">?</div>}
            <strong>{fighter ? fighterName(fighter) : (rank === 1 ? "THE CHAMPION" : rank === 2 ? "RUNNER-UP" : "THIRD PLACE")}</strong>
            <span>{rank === 1 ? "CHAMPION" : rank + (rank === 2 ? "ND" : "RD") + " PLACE"}</span>
            {showRewards && (
              <b className="wc-podium-prize">
                {rank === 1 ? "100,000" : rank === 2 ? "50,000" : "25,000"}
                <small>COINS</small>
              </b>
            )}
            {showRewards && rank === 1 && (
              <i className="wc-podium-bonus">+ FUTURE FIGHTER</i>
            )}
          </article>
        );
      })}
    </div>
  );
}

export default function Tournament() {
  const navigate = useNavigate();
  const location = useLocation();
  const [size, setSize] = useState(4);
  const [selectedId, setSelectedId] = useState("");
  const [tournament, setTournament] = useState(location.state?.tournament || null);
  const [revealing, setRevealing] = useState(false);
  const [showResults, setShowResults] = useState(Boolean(location.state?.showResults));
  const [spectating, setSpectating] = useState(false);
  const processedMatch = useRef(null);
  const unlockedIds = getUnlockedCharacters();
  const available = useMemo(
    () => roster.filter((fighter) => unlockedIds.includes(fighter.id)),
    [unlockedIds],
  );
  const selectedFighter = available.find((fighter) => fighter.id === selectedId) || available[0];

  useEffect(() => {
    const result = location.state?.tournamentResult;
    const incomingTournament = location.state?.tournament;
    const resultKey = result && incomingTournament
      ? incomingTournament.id + ":" + result.matchId
      : null;

    if (!result || !incomingTournament || processedMatch.current === resultKey) return;
    processedMatch.current = resultKey;

    const updated = {
      ...incomingTournament,
      rounds: copyRounds(incomingTournament.rounds),
    };
    const currentRound = updated.rounds[updated.currentRound];
    const match = currentRound?.find((item) => item.id === result.matchId);
    if (!match || match.winner) return;

    const opponent = match.fighters.find((fighter) => fighter.id !== updated.player.id);
    if (!opponent) return;

    match.winner = result.won ? updated.player : opponent;
    updated.playerEliminated = !result.won;
    simulateRound(currentRound, updated.player.id);

    if (result.won && updated.currentRound < updated.rounds.length - 1) {
      const nextIndex = updated.currentRound + 1;
      const winners = currentRound.map((item) => item.winner);
      const nextRound = updated.rounds[nextIndex];

      nextRound.forEach((item, index) => {
        item.fighters = [
          winners[index * 2] || null,
          winners[index * 2 + 1] || null,
        ];
        item.isPlayerMatch = item.fighters.some(
          (fighter) => fighter?.id === updated.player.id,
        );
      });

      simulateRound(nextRound, updated.player.id);
      updated.currentRound = nextIndex;
    } else if (result.won) {
      completeRemainingMatches(updated);
    }

    setTournament(updated);
    setShowResults(updated.complete);
    navigate("/tournament", {
      replace: true,
      state: { tournament: updated, showResults: updated.complete },
    });
  }, [location.state, navigate]);

  function generateBracket() {
    if (!selectedFighter || available.length === 0) return;
    setRevealing(true);
    const next = makeTournament(size, selectedFighter);
    window.setTimeout(() => {
      setTournament(next);
      setShowResults(false);
      setRevealing(false);
    }, 1100);
  }

  function startTournament() {
    if (!tournament || revealing) return;
    setRevealing(true);
    window.setTimeout(() => {
      setTournament((current) => current ? { ...current, started: true } : current);
      setRevealing(false);
    }, 900);
  }

  function enterMatch(match) {
    const opponent = match.fighters.find((fighter) => fighter.id !== tournament.player.id);
    if (!opponent) return;

    navigate("/battle", {
      state: {
        gameMode: "tournament",
        tournament,
        tournamentMatchId: match.id,
        playerId: tournament.player.id,
        opponentId: opponent.id,
        teamSize: "1v1",
        difficulty: "Normal",
        teamControl: "single-player",
        localPvP: false,
        playerCount: 1,
        stageBackground: "arena",
      },
    });
  }

  function prepareCpuFinish() {
    if (!tournament) return null;
    const updated = {
      ...tournament,
      started: true,
      playerEliminated: true,
      rounds: copyRounds(tournament.rounds),
    };
    const activeRound = updated.rounds[updated.currentRound];
    const pendingPlayerMatch = activeRound?.find(
      (match) => match.isPlayerMatch && !match.winner,
    );

    if (pendingPlayerMatch) {
      pendingPlayerMatch.winner = pendingPlayerMatch.fighters.find(
        (fighter) => fighter.id !== updated.player.id,
      );
    }

    return completeRemainingMatches(updated);
  }

  async function watchRemaining() {
    if (spectating || !tournament) return;
    setSpectating(true);

    const updated = {
      ...tournament,
      started: true,
      playerEliminated: true,
      rounds: copyRounds(tournament.rounds),
    };
    const activeRound = updated.rounds[updated.currentRound];
    const pendingPlayerMatch = activeRound?.find(
      (match) => match.isPlayerMatch && !match.winner,
    );

    if (pendingPlayerMatch) {
      pendingPlayerMatch.winner = pendingPlayerMatch.fighters.find(
        (fighter) => fighter.id !== updated.player.id,
      );
    }

    const pause = () => new Promise((resolve) => window.setTimeout(resolve, 650));

    for (
      let roundIndex = updated.currentRound;
      roundIndex < updated.rounds.length;
      roundIndex += 1
    ) {
      const round = updated.rounds[roundIndex];

      if (roundIndex > 0) {
        const previousWinners = updated.rounds[roundIndex - 1]
          .map((match) => match.winner);
        round.forEach((match, index) => {
          if (!match.fighters[0]) {
            match.fighters = [
              previousWinners[index * 2] || null,
              previousWinners[index * 2 + 1] || null,
            ];
          }
        });
      }

      setTournament({
        ...updated,
        rounds: copyRounds(updated.rounds),
      });
      await pause();

      for (const match of round) {
        if (match.winner || !match.fighters[0] || !match.fighters[1]) continue;
        match.winner = simulateCpuMatch(match.fighters[0], match.fighters[1]);
        setTournament({
          ...updated,
          rounds: copyRounds(updated.rounds),
        });
        await pause();
      }
    }

    const finished = completeRemainingMatches(updated);
    setTournament(finished);
    setShowResults(true);
    setSpectating(false);
  }

  function leaveTournament() {
    const finished = prepareCpuFinish();
    if (!finished) return;
    setTournament(finished);
    setShowResults(true);
  }

  function restartTournament() {
    setTournament(null);
    setShowResults(false);
    setSpectating(false);
    setSelectedId("");
    navigate("/tournament", { replace: true, state: null });
  }

  function claimReward() {
    const amount = REWARDS[tournament.humanPlacement] || 0;
    if (!tournament.rewardClaimed && amount > 0) {
      addCoins(amount);
      const updated = { ...tournament, rewardClaimed: true };
      setTournament(updated);
      navigate("/tournament", {
        replace: true,
        state: { tournament: updated, showResults: true },
      });
    }
  }

  if (showResults && tournament?.complete) {
    const placement = tournament.humanPlacement;
    const suffix = placement === 1 ? "ST" : placement === 2 ? "ND" : placement === 3 ? "RD" : "TH";
    const reward = REWARDS[placement] || 0;

    return (
      <main className="wc-tournament wc-tournament-results">
        <header className="wc-tourney-header wc-tourney-results-header">
          <span>WILD CARDS</span>
          <span>GRAND CHAMPIONSHIP · FINAL STANDINGS</span>
          <span>TOURNAMENT COMPLETE</span>
        </header>
        <section className="wc-tourney-results-title">
          <p className="wc-tourney-kicker">THE FINAL BELL HAS RUNG</p>
          <h1>THE PODIUM</h1>
          <p>The fighters who earned the top three places.</p>
        </section>
        <section className="wc-tourney-player-strip wc-tourney-result-player">
          <img src={fighterImage(tournament.player)} alt={fighterName(tournament.player)} />
          <div>
            <small>YOUR TOURNAMENT RESULT</small>
            <strong>{fighterName(tournament.player)}</strong>
          </div>
          <span>{placement}{suffix} PLACE</span>
        </section>
        <Podium placements={tournament.placements} showRewards />
        <section className="wc-tourney-reward-receipt">
          <div>
            <span>YOUR FINISH</span>
            <strong>{placement}{suffix} PLACE</strong>
          </div>
          <div>
            <span>CHAMPIONSHIP PAYOUT</span>
            <strong>{reward.toLocaleString()} <small>COINS</small></strong>
          </div>
          {placement === 1 && (
            <p>Plus a future character unlock, added when the new fighter joins the roster.</p>
          )}
          {placement > 3 && (
            <p>Keep training. Your next run could put you on the podium.</p>
          )}
        </section>
        {reward > 0 && (
          <button
            className="wc-tourney-primary-action"
            onClick={claimReward}
            disabled={tournament.rewardClaimed}
          >
            {tournament.rewardClaimed ? "REWARD CLAIMED ✓" : "CLAIM YOUR REWARD"}
          </button>
        )}
        <button className="wc-tourney-new-run" onClick={restartTournament}>
          START A NEW TOURNAMENT <span>↻</span>
        </button>
      </main>
    );
  }

  if (tournament) {
    const roundLabels = tournament.size === 4
      ? ["SEMIFINALS", "FINAL"]
      : ["QUARTERFINALS", "SEMIFINALS", "FINAL"];

    return (
      <main className="wc-tournament wc-tournament-bracket">
        <header className="wc-tourney-header">
          <button className="wc-tourney-exit" onClick={leaveTournament}>
            {tournament.playerEliminated ? "SKIP TO STANDINGS" : "LEAVE & SEE STANDINGS"}
          </button>
          <div className="wc-tourney-header-title">
            <span>WILD CARDS</span>
            <strong>GRAND CHAMPIONSHIP</strong>
          </div>
          <div className="wc-tourney-header-right">
            <span>{tournament.size} CONTENDERS</span>
            {!tournament.started ? (
              <button className="wc-tourney-reveal-button" onClick={startTournament} disabled={revealing}>
                {revealing ? "REVEALING..." : "START TOURNAMENT"}
              </button>
            ) : (
              <span className="wc-tourney-live-state">● TOURNAMENT LIVE</span>
            )}
          </div>
        </header>

        <div className="wc-tourney-bracket-title">
          <div>
            <p className="wc-tourney-kicker">ONE BRACKET · ONE CHAMPION</p>
            <h1>THE ROAD TO THE CROWN</h1>
          </div>
          <section className="wc-tourney-player-strip">
            <img src={fighterImage(tournament.player)} alt={fighterName(tournament.player)} />
            <div>
              <small>YOUR CONTENDER</small>
              <strong>{fighterName(tournament.player)}</strong>
            </div>
            <span>{tournament.playerEliminated ? "ELIMINATED" : "IN THE RUNNING"}</span>
          </section>
        </div>

        <section className="wc-tourney-rounds" aria-label="Tournament bracket">
          {tournament.rounds.map((round, roundIndex) => (
            <section
              className="wc-tourney-round"
              key={roundIndex}
              style={{ flex: round.length }}
            >
              <div className="wc-tourney-round-title">
                <span>ROUND {roundIndex + 1}</span>
                <h2>{roundLabels[roundIndex] || "CHAMPIONSHIP"}</h2>
                <small>{round.length} MATCH{round.length === 1 ? "" : "ES"}</small>
              </div>
              <div className="wc-tourney-round-matches">
                {round.map((match, matchIndex) => (
                  <TournamentMatch
                    key={match.id}
                    match={match}
                    matchIndex={matchIndex}
                    tournament={tournament}
                    onEnterMatch={enterMatch}
                  />
                ))}
              </div>
            </section>
          ))}
        </section>

        {tournament.playerEliminated && !tournament.complete && (
          <section className="wc-tourney-spectator-bar">
            <div>
              <strong>YOUR RUN HAS ENDED</strong>
              <span>See who claims the championship.</span>
            </div>
            <button onClick={watchRemaining} disabled={spectating}>
              {spectating ? "SIMULATING MATCHES..." : "WATCH THE REMAINING MATCHES"}
            </button>
            <button className="wc-tourney-skip-button" onClick={leaveTournament}>
              SKIP TO RESULTS
            </button>
            <button className="wc-tourney-restart-button" onClick={restartTournament}>
              RESTART
            </button>
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="wc-tournament wc-tournament-setup">
      <header className="wc-tourney-header">
        <button className="wc-tourney-exit" onClick={() => navigate("/")}>← MAIN MENU</button>
        <div className="wc-tourney-header-title">
          <span>WILD CARDS</span>
          <strong>GRAND CHAMPIONSHIP</strong>
        </div>
        <span className="wc-tourney-setup-tag">TOURNAMENT MODE</span>
      </header>

      <section className="wc-tourney-setup-title">
        <p className="wc-tourney-kicker">ONE FIGHTER · ONE SHOT AT GLORY</p>
        <h1>ENTER THE TOURNAMENT</h1>
        <p>Choose your bracket size, select your fighter, and fight your way to the crown.</p>
      </section>

      <section className="wc-tourney-size-picker">
        <span className="wc-tourney-section-label">CHAMPIONSHIP FORMAT</span>
        <div>
          <button className={size === 4 ? "active" : ""} onClick={() => setSize(4)}>
            <strong>04</strong><span>FIGHTERS</span><small>2 ROUNDS</small>
          </button>
          <button className={size === 8 ? "active" : ""} onClick={() => setSize(8)}>
            <strong>08</strong><span>FIGHTERS</span><small>3 ROUNDS</small>
          </button>
        </div>
      </section>

      <section className="wc-tourney-character-picker">
        <div className="wc-tourney-section-heading">
          <div>
            <span className="wc-tourney-section-label">CHOOSE YOUR CONTENDER</span>
            <h2>SELECT YOUR FIGHTER</h2>
          </div>
          <span>{available.length} UNLOCKED FIGHTER{available.length === 1 ? "" : "S"}</span>
        </div>
        {available.length > 0 ? (
          <div className="wc-tourney-roster-track">
            {available.map((fighter) => (
              <button
                type="button"
                key={fighter.id}
                className={"wc-tourney-roster-card" + (selectedFighter?.id === fighter.id ? " selected" : "")}
                onClick={() => setSelectedId(fighter.id)}
                aria-pressed={selectedFighter?.id === fighter.id}
              >
                <span className="wc-tourney-roster-image">
                  <img src={fighterImage(fighter)} alt={fighterName(fighter)} />
                  {selectedFighter?.id === fighter.id && <i>✓</i>}
                </span>
                <strong>{fighterName(fighter)}</strong>
                <small>{selectedFighter?.id === fighter.id ? "SELECTED" : "SELECT FIGHTER"}</small>
              </button>
            ))}
          </div>
        ) : (
          <p className="wc-tourney-no-fighters">Unlock a fighter before entering the championship.</p>
        )}
      </section>

      <section className="wc-tourney-prize-section">
        <div className="wc-tourney-section-heading">
          <div>
            <span className="wc-tourney-section-label">THE STAKES</span>
            <h2>CHAMPIONSHIP REWARDS</h2>
          </div>
          <span>CLAIM YOUR PLACE IN HISTORY</span>
        </div>
        <Podium showRewards />
      </section>

      <footer className="wc-tourney-setup-footer">
        <div>
          <strong>{fighterName(selectedFighter)}</strong>
          <span>YOUR CHAMPIONSHIP PICK</span>
        </div>
        <button className="wc-tourney-primary-action" disabled={!selectedFighter || revealing} onClick={generateBracket}>
          {revealing ? "DRAWING THE CONTENDERS..." : "GENERATE BRACKET"} <span>▶</span>
        </button>
      </footer>
    </main>
  );
}
