import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { roster } from "./Main Page/CharacterSelection.jsx";
import { getUnlockedCharacters, addCoins } from "./Currency.js";
import { createWatchBattle, nextWatchAction } from "./WatchBattle.js";
import "./Tournament.css";

const rewards = { 1: 100000, 2: 50000, 3: 25000 };
const nameOf = (fighter) => fighter?.data?.name || fighter?.name || "Unknown Fighter";
const imageOf = (fighter) => fighter?.image || fighter?.data?.image || "";

function simulateCpuMatch(one, two) {
  const toBot = (fighter) => ({ ...fighter.data, image: fighter.image, rosterId: fighter.id });
  const battle = createWatchBattle(toBot(one), toBot(two), "Normal", "Normal");
  let guard = 0;
  while (!battle.finished && guard < 2500) {
    nextWatchAction(battle);
    guard += 1;
  }
  if (!battle.finished) {
    battle.finished = true;
    const a = battle.fighters[0];
    const b = battle.fighters[1];
    battle.winner = a.health >= b.health ? a.name : b.name;
  }
  return battle.winner === battle.fighters[0].name ? one : two;
}

function makeBracket(size, player, available) {
  const pool = available.filter((fighter) => fighter.id !== player.id);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const opponents = shuffled.slice(0, size - 1);
  const participants = [player, ...opponents].sort(() => Math.random() - 0.5);
  const rounds = [];
  let roundSize = size / 2;
  let index = 0;
  rounds.push(Array.from({ length: roundSize }, (_, i) => ({
    id: "r1-" + i,
    fighters: [participants[i * 2], participants[i * 2 + 1]],
    winner: null,
    isPlayerMatch: participants[i * 2].id === player.id || participants[i * 2 + 1].id === player.id,
  })));
  while (roundSize > 1) {
    roundSize /= 2;
    index += 1;
    rounds.push(Array.from({ length: roundSize }, (_, i) => ({
      id: "r" + (index + 1) + "-" + i, fighters: [null, null], winner: null, isPlayerMatch: false,
    })));
  }
  return { size, player, participants, rounds, currentRound: 0, playerEliminated: false, complete: false };
}

function TournamentCard({ fighter, mystery, champion, eliminated, player }) {
  return (
    <div className={"wc-tourney-fighter" + (champion ? " champion" : "") + (eliminated ? " eliminated" : "") + (player ? " player-entry" : "")}>
      <div className="wc-tourney-portrait">
        {mystery ? <span>?</span> : fighter && imageOf(fighter) ? <img src={imageOf(fighter)} alt={nameOf(fighter)} /> : <span>—</span>}
      </div>
      <div className="wc-tourney-fighter-name">{mystery ? "MYSTERY FIGHTER" : fighter ? nameOf(fighter) : "TBD"}</div>
      {player && <small>YOU</small>}
      {champion && <small>CHAMPION</small>}
    </div>
  );
}

export default function Tournament() {
  const navigate = useNavigate();
  const location = useLocation();
  const saved = location.state?.tournament;
  const [size, setSize] = useState(4);
  const [selectedId, setSelectedId] = useState("");
  const [tournament, setTournament] = useState(saved || null);
  const [revealing, setRevealing] = useState(false);
  const [notice, setNotice] = useState("");
  const unlocked = getUnlockedCharacters();
  const available = useMemo(() => roster.filter((fighter) => unlocked.includes(fighter.id) && !fighter.isFestivalSecret || unlocked.includes(fighter.id)), [unlocked]);
  const player = roster.find((fighter) => fighter.id === selectedId) || available[0];

  function revealBracket() {
    if (!player) return;
    setRevealing(true);
    const next = makeBracket(size, player, roster);
    window.setTimeout(() => {
      setTournament(next);
      setRevealing(false);
    }, 1500);
  }

  function startPlayerMatch(match) {
    const opponent = match.fighters.find((fighter) => fighter && fighter.id !== tournament.player.id);
    navigate("/battle", { state: {
      gameMode: "tournament", tournament, tournamentMatchId: match.id,
      playerId: tournament.player.id, opponentId: opponent.id,
      teamSize: "1v1", difficulty: "Normal", teamControl: "single-player",
      localPvP: false, playerCount: 1, stageBackground: "arena",
    }});
  }

  function resolveAfterPlayer(result) {
    const updated = { ...tournament, rounds: tournament.rounds.map((round) => round.map((match) => ({ ...match, fighters: [...match.fighters] }))) };
    const match = updated.rounds[0].find((item) => item.id === result.matchId);
    const opponent = match.fighters.find((fighter) => fighter.id !== updated.player.id);
    const winner = result.won ? updated.player : opponent;
    match.winner = winner;
    updated.playerEliminated = !result.won;
    const firstRound = updated.rounds[0];
    firstRound.forEach((item) => {
      if (item.winner || item.isPlayerMatch) return;
      item.winner = simulateCpuMatch(item.fighters[0], item.fighters[1]);
    });
    let advancing = firstRound.map((item) => item.winner);
    for (let r = 1; r < updated.rounds.length; r += 1) {
      const round = updated.rounds[r];
      round.forEach((item, i) => {
        item.fighters = [advancing[i * 2] || null, advancing[i * 2 + 1] || null];
        if (item.fighters[0] && item.fighters[1]) {
          item.winner = simulateCpuMatch(item.fighters[0], item.fighters[1]);
        }
      });
      advancing = round.map((item) => item.winner);
    }
    updated.complete = true;
    const champion = updated.rounds[updated.rounds.length - 1][0].winner;
    const placements = [champion];
    for (let r = updated.rounds.length - 2; r >= 0; r -= 1) {
      const losers = updated.rounds[r].filter((item) => item.winner).map((item) => item.fighters.find((fighter) => fighter.id !== item.winner.id));
      placements.push(...losers);
    }
    updated.placements = placements.filter(Boolean);
    updated.placements = [...new Map(updated.placements.map((fighter) => [fighter.id, fighter])).values()];
    const humanPosition = updated.placements.findIndex((fighter) => fighter.id === updated.player.id) + 1;
    updated.humanPlacement = humanPosition || updated.size;
    setTournament(updated);
    navigate("/tournament", { replace: true, state: { tournament: updated, showResults: true } });
  }

  function leaveOrWatch() {
    if (!tournament) return;
    const firstMatch = tournament.rounds[0].find((match) => match.isPlayerMatch);
    if (!firstMatch?.winner) {
      const opponent = firstMatch.fighters.find((fighter) => fighter.id !== tournament.player.id);
      resolveAfterPlayer({ matchId: firstMatch.id, won: false, opponent });
    }
  }

  function claimReward() {
    const placement = tournament.humanPlacement;
    const amount = rewards[placement] || 0;
    if (!tournament.rewardClaimed && amount > 0) {
      addCoins(amount);
      setTournament({ ...tournament, rewardClaimed: true });
    }
  }

  if (location.state?.showResults && tournament?.complete) {
    const placement = tournament.humanPlacement;
    return (
      <main className="wc-tournament wc-tournament-results">
        <p className="wc-tourney-kicker">WILD CARDS · TOURNAMENT COMPLETE</p>
        <h1>FINAL STANDINGS</h1>
        <div className="wc-podium">
          {[1, 2, 3].map((rank) => {
            const fighter = tournament.placements?.[rank - 1];
            return <div className={"wc-podium-place place-" + rank} key={rank}>
              <span>{rank === 1 ? "♛" : rank === 2 ? "Ⅱ" : "Ⅲ"}</span>
              {fighter && imageOf(fighter) && <img src={imageOf(fighter)} alt={nameOf(fighter)} />}
              <strong>{nameOf(fighter)}</strong><small>{rank === 1 ? "CHAMPION" : rank + " PLACE"}</small>
            </div>;
          })}
        </div>
        <section className="wc-tourney-reward">
          <h2>YOUR RESULT · {placement}{placement === 1 ? "ST" : placement === 2 ? "ND" : placement === 3 ? "RD" : "TH"} PLACE</h2>
          <strong>{(rewards[placement] || 0).toLocaleString()} COINS</strong>
          {placement === 1 && <p>Plus a future character unlock — coming when the new fighter is added to the roster.</p>}
          <button onClick={claimReward} disabled={tournament.rewardClaimed}>{tournament.rewardClaimed ? "REWARD CLAIMED ✓" : "CLAIM REWARD"}</button>
        </section>
        <button className="wc-tourney-secondary" onClick={() => navigate("/")}>RETURN TO MAIN MENU</button>
      </main>
    );
  }

  if (tournament) {
    return (
      <main className="wc-tournament">
        <header className="wc-tourney-header">
          <button onClick={() => navigate("/")}>← EXIT</button>
          <p>WILD CARDS · GRAND CHAMPIONSHIP</p>
          <span>{tournament.size} FIGHTERS</span>
        </header>
        <h1>CHAMPIONSHIP BRACKET</h1>
        <section className="wc-tourney-player">
          <TournamentCard fighter={tournament.player} player />
          <div><small>YOUR FIGHTER</small><strong>{nameOf(tournament.player)}</strong><p>Stay in the spotlight. Your portrait remains here throughout the tournament.</p></div>
        </section>
        <div className="wc-tourney-rounds">
          {tournament.rounds.map((round, r) => (
            <section className="wc-tourney-round" key={r}>
              <h2>{["QUARTERFINALS", "SEMIFINALS", "CHAMPIONSHIP"][3 - tournament.rounds.length + r] || (r === tournament.rounds.length - 1 ? "FINAL" : "ROUND " + (r + 1))}</h2>
              {round.map((match) => <article className="wc-tourney-match" key={match.id}>
                <TournamentCard fighter={match.fighters[0]} mystery={!match.fighters[0] && !match.winner} eliminated={Boolean(match.winner && match.winner.id !== match.fighters[0]?.id)} player={match.fighters[0]?.id === tournament.player.id} champion={match.winner?.id === tournament.player.id} />
                <div className="wc-tourney-vs">VS</div>
                <TournamentCard fighter={match.fighters[1]} mystery={!match.fighters[1] && !match.winner} eliminated={Boolean(match.winner && match.winner.id !== match.fighters[1]?.id)} player={match.fighters[1]?.id === tournament.player.id} champion={match.winner?.id === tournament.player.id} />
                {match.isPlayerMatch && !match.winner && <button onClick={() => startPlayerMatch(match)}>ENTER THE ARENA ▶</button>}
                {match.winner && <strong className="wc-tourney-winner">WINNER: {nameOf(match.winner)}</strong>}
              </article>)}
            </section>
          ))}
        </div>
        {tournament.playerEliminated && <section className="wc-tourney-spectator">
          <h2>YOUR RUN IS OVER — THE CHAMPIONSHIP CONTINUES</h2>
          <p>Watch the remaining CPU matches resolve and see who takes the crown.</p>
          <button onClick={leaveOrWatch}>WATCH FINAL STANDINGS</button>
        </section>}
        {notice && <p>{notice}</p>}
      </main>
    );
  }

  return (
    <main className="wc-tournament wc-tournament-setup">
      <header className="wc-tourney-header"><button onClick={() => navigate("/")}>← MAIN MENU</button><p>WILD CARDS · GRAND CHAMPIONSHIP</p><span>TOURNAMENT MODE</span></header>
      <p className="wc-tourney-kicker">ONE FIGHTER. ONE BRACKET. ONE CHAMPION.</p>
      <h1>ENTER THE TOURNAMENT</h1>
      <p className="wc-tourney-intro">Compete against a field of randomly selected CPU fighters. Win every round to become champion.</p>
      <section className="wc-tourney-size">
        <button className={size === 4 ? "active" : ""} onClick={() => setSize(4)}><strong>4</strong><span>FIGHTERS · 2 ROUNDS</span></button>
        <button className={size === 8 ? "active" : ""} onClick={() => setSize(8)}><strong>8</strong><span>FIGHTERS · 3 ROUNDS</span></button>
      </section>
      <h2>CHOOSE YOUR FIGHTER</h2>
      <div className="wc-tourney-roster">
        {available.map((fighter) => <button key={fighter.id} className={selectedId === fighter.id ? "selected" : ""} onClick={() => setSelectedId(fighter.id)}>
          <img src={imageOf(fighter)} alt={nameOf(fighter)} /><strong>{nameOf(fighter)}</strong>{selectedId === fighter.id && <small>SELECTED ✓</small>}
        </button>)}
      </div>
      <section className="wc-tourney-prizes">
        <h2>CHAMPIONSHIP REWARDS</h2>
        <p><strong>1ST</strong> 100,000 COINS + FUTURE CHARACTER</p>
        <p><strong>2ND</strong> 50,000 COINS</p>
        <p><strong>3RD</strong> 25,000 COINS</p>
      </section>
      <button className="wc-tourney-start" disabled={!player || revealing} onClick={revealBracket}>{revealing ? "DRAWING THE BRACKET..." : "GENERATE BRACKET ▶"}</button>
      {revealing && <div className="wc-tourney-reveal"><span>?</span><strong>THE CONTENDERS ARE BEING REVEALED</strong></div>}
    </main>
  );
}
