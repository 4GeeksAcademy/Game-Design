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

function simulateCpuMatch(one, two) {
  const toBot = (fighter) => ({ ...fighter.data, image: fighter.image, rosterId: fighter.id });
  const battle = createWatchBattle(toBot(one), toBot(two), "Normal", "Normal");
  let steps = 0;
  while (!battle.finished && steps < 3000) {
    nextWatchAction(battle);
    steps += 1;
  }
  if (!battle.finished) {
    const [a, b] = battle.fighters;
    battle.winner = a.health >= b.health ? a.name : b.name;
  }
  return battle.winner === battle.fighters[0].name ? one : two;
}

function makeTournament(size, player) {
  const pool = roster.filter((fighter) => fighter.id !== player.id).sort(() => Math.random() - 0.5);
  const participants = [player, ...pool.slice(0, size - 1)].sort(() => Math.random() - 0.5);
  const rounds = [];
  let count = size / 2;
  let roundNumber = 1;
  while (count >= 1) {
    rounds.push(Array.from({ length: count }, (_, index) => ({
      id: "round-" + roundNumber + "-match-" + (index + 1),
      fighters: roundNumber === 1 ? [participants[index * 2], participants[index * 2 + 1]] : [null, null],
      winner: null,
      isPlayerMatch: roundNumber === 1 && (participants[index * 2].id === player.id || participants[index * 2 + 1].id === player.id),
    })));
    count /= 2;
    roundNumber += 1;
  }
  return { size, player, participants, rounds, currentRound: 0, started: false, playerEliminated: false, complete: false, rewardClaimed: false };
}

function simulateRound(round, playerId = null) {
  round.forEach((match) => {
    if (!match.winner && match.fighters[0] && match.fighters[1] &&
      !match.fighters.some((fighter) => fighter.id === playerId)) {
      match.winner = simulateCpuMatch(match.fighters[0], match.fighters[1]);
    }
  });
}

function getPlacements(tournament) {
  const rounds = tournament.rounds;
  const finalMatch = rounds[rounds.length - 1][0];
  const champion = finalMatch.winner;
  const runnerUp = finalMatch.fighters.find((fighter) => fighter.id !== champion.id);
  const semifinalRound = rounds[rounds.length - 2];
  const semifinalLosers = semifinalRound.map((match) =>
    match.fighters.find((fighter) => fighter.id !== match.winner.id),
  ).filter(Boolean);
  let third = semifinalLosers[0] || null;
  if (semifinalLosers.length === 2) third = simulateCpuMatch(semifinalLosers[0], semifinalLosers[1]);
  const allLosers = [];
  for (let index = rounds.length - 2; index >= 0; index -= 1) {
    rounds[index].forEach((match) => {
      if (match.winner && match.fighters[0] && match.fighters[1]) {
        allLosers.push(match.fighters.find((fighter) => fighter.id !== match.winner.id));
      }
    });
  }
  return [champion, runnerUp, third, ...allLosers].filter((fighter, index, list) =>
    fighter && list.findIndex((item) => item.id === fighter.id) === index
  );
}

function completeRemainingMatches(tournament) {
  for (let roundIndex = tournament.currentRound; roundIndex < tournament.rounds.length; roundIndex += 1) {
    const round = tournament.rounds[roundIndex];
    if (roundIndex > 0) {
      const previousWinners = tournament.rounds[roundIndex - 1].map((match) => match.winner);
      round.forEach((match, index) => {
        if (!match.fighters[0]) match.fighters = [previousWinners[index * 2] || null, previousWinners[index * 2 + 1] || null];
      });
    }
    simulateRound(round, tournament.player.id);
  }
  const finalMatch = tournament.rounds[tournament.rounds.length - 1][0];
  if (!finalMatch.winner && finalMatch.fighters[0] && finalMatch.fighters[1]) {
    finalMatch.winner = simulateCpuMatch(finalMatch.fighters[0], finalMatch.fighters[1]);
  }
  tournament.complete = true;
  tournament.placements = getPlacements(tournament);
  tournament.humanPlacement = tournament.placements.findIndex((fighter) => fighter.id === tournament.player.id) + 1 || tournament.size;
  return tournament;
}

function TournamentFighter({ fighter, mystery = false, player = false, eliminated = false, champion = false }) {
  return (
    <div className={"wc-tourney-fighter" + (player ? " player-entry" : "") + (eliminated ? " eliminated" : "") + (champion ? " champion" : "")}>
      <div className="wc-tourney-portrait">
        {mystery ? <span>?</span> : fighter ? <img src={fighterImage(fighter)} alt={fighterName(fighter)} /> : <span>—</span>}
      </div>
      <div className="wc-tourney-fighter-name">{mystery ? "MYSTERY FIGHTER" : fighter ? fighterName(fighter) : "TO BE DECIDED"}</div>
      {player && <small>YOU</small>}
      {champion && <small>CHAMPION</small>}
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
  const available = useMemo(() => roster.filter((fighter) => unlockedIds.includes(fighter.id)), [unlockedIds]);
  const selectedFighter = available.find((fighter) => fighter.id === selectedId) || available[0];

  useEffect(() => {
    const result = location.state?.tournamentResult;
    if (!result || !location.state?.tournament || processedMatch.current === result.matchId) return;
    processedMatch.current = result.matchId;
    const updated = {
      ...location.state.tournament,
      rounds: location.state.tournament.rounds.map((round) => round.map((match) => ({ ...match, fighters: [...match.fighters] }))),
    };
    const currentRound = updated.rounds[updated.currentRound];
    const match = currentRound.find((item) => item.id === result.matchId);
    if (!match || match.winner) return;
    const opponent = match.fighters.find((fighter) => fighter.id !== updated.player.id);
    match.winner = result.won ? updated.player : opponent;
    updated.playerEliminated = !result.won;
    simulateRound(currentRound, updated.player.id);

    if (result.won && updated.currentRound < updated.rounds.length - 1) {
      const nextIndex = updated.currentRound + 1;
      const winners = currentRound.map((item) => item.winner);
      const nextRound = updated.rounds[nextIndex];
      nextRound.forEach((item, index) => {
        item.fighters = [winners[index * 2] || null, winners[index * 2 + 1] || null];
        item.isPlayerMatch = item.fighters.some((fighter) => fighter?.id === updated.player.id);
      });
      simulateRound(nextRound, updated.player.id);
      updated.currentRound = nextIndex;
    } else if (result.won) {
      completeRemainingMatches(updated);
    }
    setTournament(updated);
    setShowResults(updated.complete);
    navigate("/tournament", { replace: true, state: { tournament: updated, showResults: updated.complete } });
  }, [location.state, navigate]);

  function generateBracket() {
    if (!selectedFighter) return;
    setRevealing(true);
    const next = makeTournament(size, selectedFighter);
    window.setTimeout(() => {
      setTournament(next);
      setShowResults(false);
      setRevealing(false);
    }, 1400);
  }

  function startTournament() {
    setRevealing(true);
    window.setTimeout(() => {
      setTournament((current) => ({ ...current, started: true }));
      setRevealing(false);
    }, 1200);
  }

  function enterMatch(match) {
    const opponent = match.fighters.find((fighter) => fighter.id !== tournament.player.id);
    navigate("/battle", { state: {
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
    }});
  }

  async function watchRemaining() {
    if (spectating || !tournament) return;
    setSpectating(true);
    const updated = {
      ...tournament,
      rounds: tournament.rounds.map((round) => round.map((match) => ({ ...match, fighters: [...match.fighters] }))),
    };
    const pause = () => new Promise((resolve) => window.setTimeout(resolve, 850));

    for (let roundIndex = updated.currentRound; roundIndex < updated.rounds.length; roundIndex += 1) {
      const round = updated.rounds[roundIndex];
      if (roundIndex > 0) {
        const previousWinners = updated.rounds[roundIndex - 1].map((match) => match.winner);
        round.forEach((match, index) => {
          if (!match.fighters[0]) {
            match.fighters = [previousWinners[index * 2] || null, previousWinners[index * 2 + 1] || null];
          }
        });
      }
      setTournament({ ...updated, rounds: updated.rounds.map((items) => items.map((match) => ({ ...match, fighters: [...match.fighters] }))) });
      await pause();

      for (const match of round) {
        if (match.winner || !match.fighters[0] || !match.fighters[1]) continue;
        match.winner = simulateCpuMatch(match.fighters[0], match.fighters[1]);
        setTournament({ ...updated, rounds: updated.rounds.map((items) => items.map((item) => ({ ...item, fighters: [...item.fighters] }))) });
        await pause();
      }
    }

    updated.complete = true;
    updated.placements = getPlacements(updated);
    updated.humanPlacement = updated.placements.findIndex((fighter) => fighter.id === updated.player.id) + 1 || updated.size;
    setTournament(updated);
    setShowResults(true);
    setSpectating(false);
  }

  function claimReward() {
    const amount = REWARDS[tournament.humanPlacement] || 0;
    if (!tournament.rewardClaimed && amount > 0) {
      addCoins(amount);
      const updated = { ...tournament, rewardClaimed: true };
      setTournament(updated);
      navigate("/tournament", { replace: true, state: { tournament: updated, showResults: true } });
    }
  }

  if (showResults && tournament?.complete) {
    const placement = tournament.humanPlacement;
    const suffix = placement === 1 ? "ST" : placement === 2 ? "ND" : placement === 3 ? "RD" : "TH";
    return (
      <main className="wc-tournament wc-tournament-results">
        <p className="wc-tourney-kicker">WILD CARDS · TOURNAMENT COMPLETE</p>
        <h1>FINAL STANDINGS</h1>
        <div className="wc-podium">
          {[1, 2, 3].map((rank) => {
            const fighter = tournament.placements?.[rank - 1];
            return <div className={"wc-podium-place place-" + rank} key={rank}>
              <span>{rank === 1 ? "♛" : rank === 2 ? "Ⅱ" : "Ⅲ"}</span>
              {fighter && <img src={fighterImage(fighter)} alt={fighterName(fighter)} />}
              <strong>{fighterName(fighter)}</strong><small>{rank === 1 ? "CHAMPION" : rank + " PLACE"}</small>
            </div>;
          })}
        </div>
        <section className="wc-tourney-reward">
          <h2>YOUR RESULT · {placement}{suffix} PLACE</h2>
          <strong>{(REWARDS[placement] || 0).toLocaleString()} COINS</strong>
          {placement === 1 && <p>Plus a future character unlock — awarded when the new fighter is added to the roster.</p>}
          {placement > 3 && <p>Thanks for competing. Reach the podium next time to earn a championship payout.</p>}
          <button onClick={claimReward} disabled={tournament.rewardClaimed || !REWARDS[placement]}>{tournament.rewardClaimed ? "REWARD CLAIMED ✓" : "CLAIM REWARD"}</button>
        </section>
        <button className="wc-tourney-secondary" onClick={() => navigate("/")}>RETURN TO MAIN MENU</button>
      </main>
    );
  }

  if (tournament) {
    const currentMatch = tournament.rounds[tournament.currentRound]?.find((match) => match.isPlayerMatch && !match.winner);
    const roundLabels = tournament.size === 4 ? ["SEMIFINALS", "FINAL"] : ["QUARTERFINALS", "SEMIFINALS", "FINAL"];
    return (
      <main className="wc-tournament">
        <header className="wc-tourney-header">
          <button onClick={() => tournament.playerEliminated ? watchRemaining() : navigate("/")}>{tournament.playerEliminated ? "SKIP TO RESULTS" : "← EXIT"}</button>
          <p>WILD CARDS · GRAND CHAMPIONSHIP</p>
          <span>{tournament.size} FIGHTERS</span>
        </header>
        <h1>CHAMPIONSHIP BRACKET</h1>
        <section className="wc-tourney-player">
          <TournamentFighter fighter={tournament.player} player />
          <div><small>YOUR FIGHTER · STILL IN THE SPOTLIGHT</small><strong>{fighterName(tournament.player)}</strong><p>Your portrait stays visible for the entire tournament.</p></div>
        </section>
        {!tournament.started && (
          <section className="wc-tourney-start-panel">
            <p>YOUR OPPONENTS ARE STILL UNDER WRAPS.</p>
            <button className="wc-tourney-start" onClick={startTournament} disabled={revealing}>
              {revealing ? "REVEALING CONTENDERS..." : "START TOURNAMENT · REVEAL CPU FIGHTERS"}
            </button>
            {revealing && <div className="wc-tourney-reveal"><span>?</span><strong>THE CONTENDERS ARE ENTERING THE ARENA</strong></div>}
          </section>
        )}
        <div className="wc-tourney-rounds">
          {tournament.rounds.map((round, index) => (
            <section className="wc-tourney-round" key={index}>
              <h2>{roundLabels[index] || "ROUND " + (index + 1)}</h2>
              {round.map((match) => (
                <article className="wc-tourney-match" key={match.id}>
                  <TournamentFighter fighter={match.fighters[0]} mystery={!match.fighters[0] || (!tournament.started && match.fighters[0]?.id !== tournament.player.id)} player={match.fighters[0]?.id === tournament.player.id} eliminated={Boolean(match.winner && match.winner.id !== match.fighters[0]?.id)} champion={match.winner?.id === tournament.player.id && tournament.complete} />
                  <div className="wc-tourney-vs">VS</div>
                  <TournamentFighter fighter={match.fighters[1]} mystery={!match.fighters[1] || (!tournament.started && match.fighters[1]?.id !== tournament.player.id)} player={match.fighters[1]?.id === tournament.player.id} eliminated={Boolean(match.winner && match.winner.id !== match.fighters[1]?.id)} champion={match.winner?.id === tournament.player.id && tournament.complete} />
                  {tournament.started && match.isPlayerMatch && !match.winner && <button onClick={() => enterMatch(match)}>FIGHT THIS MATCH ▶</button>}
                  {match.winner && <strong className="wc-tourney-winner">WINNER: {fighterName(match.winner)}</strong>}
                </article>
              ))}
            </section>
          ))}
        </div>
        {tournament.playerEliminated && !tournament.complete && (
          <section className="wc-tourney-spectator">
            <h2>YOUR RUN IS OVER — THE CHAMPIONSHIP CONTINUES</h2>
            <p>Stay and watch the remaining CPU matches determine the final podium, or return to the main menu.</p>
            <button onClick={watchRemaining} disabled={spectating}>{spectating ? "WATCHING CPU MATCHES..." : "WATCH THE REST OF THE TOURNAMENT"}</button>
            <button className="wc-tourney-secondary" onClick={watchRemaining}>SKIP TO FINAL STANDINGS</button>
            <button className="wc-tourney-secondary" onClick={() => {
              setTournament(null);
              setShowResults(false);
              setSpectating(false);
              navigate("/tournament", { replace: true, state: null });
            }}>RESTART TOURNAMENT</button>
          </section>
        )}
      </main>
    );
  }

  return (
    <main className="wc-tournament wc-tournament-setup">
      <header className="wc-tourney-header"><button onClick={() => navigate("/")}>← MAIN MENU</button><p>WILD CARDS · GRAND CHAMPIONSHIP</p><span>TOURNAMENT MODE</span></header>
      <p className="wc-tourney-kicker">ONE FIGHTER. ONE BRACKET. ONE CHAMPION.</p>
      <h1>ENTER THE TOURNAMENT</h1>
      <p className="wc-tourney-intro">Choose your bracket size and fighter. The remaining competitors are drawn from the roster.</p>
      <section className="wc-tourney-size">
        <button className={size === 4 ? "active" : ""} onClick={() => setSize(4)}><strong>4</strong><span>FIGHTERS · 2 ROUNDS</span></button>
        <button className={size === 8 ? "active" : ""} onClick={() => setSize(8)}><strong>8</strong><span>FIGHTERS · 3 ROUNDS</span></button>
      </section>
      <h2>CHOOSE YOUR FIGHTER</h2>
      <div className="wc-tourney-roster">
        {available.map((fighter) => <button key={fighter.id} className={selectedFighter?.id === fighter.id ? "selected" : ""} onClick={() => setSelectedId(fighter.id)}>
          <img src={fighterImage(fighter)} alt={fighterName(fighter)} /><strong>{fighterName(fighter)}</strong>{selectedFighter?.id === fighter.id && <small>SELECTED ✓</small>}
        </button>)}
      </div>
      <section className="wc-tourney-prizes">
        <h2>CHAMPIONSHIP REWARDS</h2>
        <p><strong>1ST</strong> 100,000 COINS + FUTURE CHARACTER</p>
        <p><strong>2ND</strong> 50,000 COINS</p>
        <p><strong>3RD</strong> 25,000 COINS</p>
      </section>
      <button className="wc-tourney-start" disabled={!selectedFighter || revealing} onClick={generateBracket}>{revealing ? "DRAWING THE BRACKET..." : "GENERATE BRACKET ▶"}</button>
      {revealing && <div className="wc-tourney-reveal"><span>?</span><strong>THE CONTENDERS ARE BEING REVEALED</strong></div>}
    </main>
  );
}
