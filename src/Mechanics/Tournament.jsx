import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { roster } from "./Main Page/CharacterSelection.jsx";
import { getUnlockedCharacters, addCoins } from "./Currency.js";
import { createWatchBattle, nextWatchAction } from "./WatchBattle.js";
import { getCharacterImage } from "./SkinManager.js";
import { playGameSound, playUISound } from "../audio/audioManager.js";
import TournamentCpuMatch from "./TournamentCpuMatch.jsx";
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
    ...(fighter.data || fighter),
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

  if (battle.winner) {
    return battle.winner === battle.fighters[0].name ? one : two;
  }
  return battle.fighters[0].health >= battle.fighters[1].health ? one : two;
}

function makeTournament(size, player) {
  // CPU slots stay empty until START TOURNAMENT is pressed.
  // The player is fixed in the left slot of the opening match.
  const participants = [player, ...Array(size - 1).fill(null)];
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
        participants[index * 2]?.id === player.id ||
        participants[index * 2 + 1]?.id === player.id
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

function simulateRound(round) {
  round.forEach((match) => {
    if (!match.winner && match.fighters[0] && match.fighters[1]) {
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
  tournament.thirdPlaceMatch = { fighters: semifinalLosers, winner: thirdPlaceWinner };

  if (tournament.size === 4) {
    return [champion, runnerUp, thirdPlaceWinner, thirdPlaceLoser];
  }

  const quarterfinalLosers = rounds[0]
    .map((match) => match.fighters.find((fighter) => fighter.id !== match.winner.id))
    .filter(Boolean);
  const quarterPairs = [
    quarterfinalLosers.slice(0, 2),
    quarterfinalLosers.slice(2, 4),
  ];
  const consolationWinners = quarterPairs.map((pair) => simulateCpuMatch(pair[0], pair[1]));
  const consolationLosers = quarterPairs.map((pair, index) =>
    pair.find((fighter) => fighter.id !== consolationWinners[index].id),
  );
  const fifthPlaceWinner = simulateCpuMatch(consolationWinners[0], consolationWinners[1]);
  const seventhPlaceWinner = simulateCpuMatch(consolationLosers[0], consolationLosers[1]);
  const sixthPlace = consolationWinners.find((fighter) => fighter.id !== fifthPlaceWinner.id);
  const eighthPlace = consolationLosers.find((fighter) => fighter.id !== seventhPlaceWinner.id);

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

function finishTournamentDraft(tournament) {
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

function completeRemainingMatches(tournament) {
  for (let roundIndex = 0; roundIndex < tournament.rounds.length; roundIndex += 1) {
    const round = tournament.rounds[roundIndex];

    if (roundIndex > 0) {
      const previousWinners = tournament.rounds[roundIndex - 1].map((match) => match.winner);
      round.forEach((match, index) => {
        if (!match.fighters[0] || !match.fighters[1]) {
          match.fighters = [
            previousWinners[index * 2] || null,
            previousWinners[index * 2 + 1] || null,
          ];
          match.isPlayerMatch = match.fighters.some(
            (fighter) => fighter?.id === tournament.player.id,
          );
        }
      });
    }

    if (tournament.playerEliminated) {
      const pendingPlayerMatch = round.find((match) =>
        !match.winner && match.fighters.some((fighter) => fighter?.id === tournament.player.id)
      );
      if (pendingPlayerMatch) {
        pendingPlayerMatch.winner = pendingPlayerMatch.fighters.find(
          (fighter) => fighter.id !== tournament.player.id
        );
      }
    }
    simulateRound(round);
  }

  return finishTournamentDraft(tournament);
}

function TournamentFighter({
  fighter,
  mystery = false,
  player = false,
  eliminated = false,
  winner = false,
  revealing = false,
}) {
  return (
    <div className={[
      "wc-tourney-fighter",
      player ? "player-entry" : "",
      eliminated ? "eliminated" : "",
      winner ? "match-winner" : "",
      revealing ? "is-revealing" : "",
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

function TournamentMatch({
  match,
  matchIndex,
  tournament,
  revealing,
  previewFighters,
  onEnterMatch,
}) {
  const playerId = tournament.player.id;
  const first = match.fighters[0];
  const second = match.fighters[1];
  const firstIsPlayer = first?.id === playerId;
  const secondIsPlayer = second?.id === playerId;
  const shownFirst = revealing && !firstIsPlayer ? previewFighters?.[0] || first : first;
  const shownSecond = revealing && !secondIsPlayer ? previewFighters?.[1] || second : second;
  const firstMystery = !shownFirst || (!tournament.started && !revealing && !firstIsPlayer);
  const secondMystery = !shownSecond || (!tournament.started && !revealing && !secondIsPlayer);
  const activePlayerMatch = tournament.started && match.isPlayerMatch && !match.winner;

  return (
    <article className={"wc-tourney-match" + (activePlayerMatch ? " is-player-match" : "")}>
      <div className="wc-tourney-match-heading">
        <span>MATCH {String(matchIndex + 1).padStart(2, "0")}</span>
        <span>{match.winner ? "COMPLETE" : revealing ? "DRAWING CONTENDERS" : "WINNER ADVANCES"}</span>
      </div>
      <div className="wc-tourney-matchup">
        <TournamentFighter
          fighter={shownFirst}
          mystery={firstMystery}
          player={firstIsPlayer}
          eliminated={Boolean(match.winner && match.winner.id !== first?.id)}
          winner={Boolean(match.winner && match.winner.id === first?.id)}
          revealing={revealing && !firstIsPlayer}
        />
        <span className="wc-tourney-versus">VS</span>
        <TournamentFighter
          fighter={shownSecond}
          mystery={secondMystery}
          player={secondIsPlayer}
          eliminated={Boolean(match.winner && match.winner.id !== second?.id)}
          winner={Boolean(match.winner && match.winner.id === second?.id)}
          revealing={revealing && !secondIsPlayer}
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
  const [revealPreview, setRevealPreview] = useState(null);
  const [showResults, setShowResults] = useState(Boolean(location.state?.showResults));
  const [showEliminationScreen, setShowEliminationScreen] = useState(false);
  const [activeCpuMatch, setActiveCpuMatch] = useState(null);
  const [spectating, setSpectating] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const processedMatch = useRef(null);
  const activeCpuResolveRef = useRef(null);
  const skipCpuQueueRef = useRef(false);
  const revealIntervalRef = useRef(null);
  const celebrationPlayedRef = useRef("");
  const unlockedIds = getUnlockedCharacters();
  const unlockedKey = unlockedIds.join("|");
  const available = useMemo(
    () => roster.filter((fighter) => unlockedIds.includes(fighter.id)),
    [unlockedKey],
  );
  const cpuPool = useMemo(
    () => roster.filter((fighter) =>
      !fighter.isFestivalSecret || unlockedIds.includes(fighter.id)
    ),
    [unlockedKey],
  );
  const selectedFighter = available.find((fighter) => fighter.id === selectedId) || available[0];

  function publishTournament(next) {
    setTournament({
      ...next,
      rounds: copyRounds(next.rounds),
    });
  }

  function completeTournament(next) {
    const finished = finishTournamentDraft(next);
    setTournament(finished);
    setShowEliminationScreen(false);
    setShowResults(true);
    setSpectating(false);
    navigate("/tournament", {
      replace: true,
      state: { tournament: finished, showResults: true },
    });
  }

  async function playCpuRound(round, roundIndex, playerId) {
    const pending = round.filter((match) =>
      !match.winner &&
      match.fighters[0] &&
      match.fighters[1] &&
      !match.fighters.some((fighter) => fighter.id === playerId)
    );

    for (let index = 0; index < pending.length; index += 1) {
      if (skipCpuQueueRef.current) return false;
      const match = pending[index];
      const winner = await new Promise((finishMatch) => {
        activeCpuResolveRef.current = finishMatch;
        setActiveCpuMatch({
          match,
          roundIndex,
          matchNumber: index + 1,
          totalMatches: pending.length,
        });
      });

      if (skipCpuQueueRef.current) return false;

      match.winner = winner || simulateCpuMatch(match.fighters[0], match.fighters[1]);
      setTournament((current) => current ? {
        ...current,
        rounds: copyRounds(current.rounds).map((items, itemRoundIndex) =>
          itemRoundIndex === roundIndex
            ? items.map((item) => item.id === match.id ? { ...item, winner: match.winner } : item)
            : items
        ),
      } : current);
      setActiveCpuMatch(null);
      await new Promise((done) => window.setTimeout(done, 260));
    }

    return true;
  }
  async function advanceAfterPlayerResult(draft, playerStillIn) {
    skipCpuQueueRef.current = false;
    setSpectating(!playerStillIn);

    for (let roundIndex = draft.currentRound; roundIndex < draft.rounds.length; roundIndex += 1) {
      const round = draft.rounds[roundIndex];

      if (roundIndex > 0) {
        const previousWinners = draft.rounds[roundIndex - 1].map((match) => match.winner);
        round.forEach((match, index) => {
          if (!match.fighters[0] || !match.fighters[1]) {
            match.fighters = [
              previousWinners[index * 2] || null,
              previousWinners[index * 2 + 1] || null,
            ];
          }
          match.isPlayerMatch = !draft.playerEliminated && match.fighters.some(
            (fighter) => fighter?.id === draft.player.id,
          );
        });
      }

      draft.currentRound = roundIndex;
      publishTournament(draft);
      const completedCpuMatches = await playCpuRound(round, roundIndex, draft.player.id);
      if (!completedCpuMatches || skipCpuQueueRef.current) return;

      const nextHumanMatch = round.find((match) =>
        match.isPlayerMatch &&
        !match.winner &&
        match.fighters.some((fighter) => fighter?.id === draft.player.id)
      );

      publishTournament(draft);
      if (playerStillIn && nextHumanMatch) {
        setSpectating(false);
        setShowEliminationScreen(false);
        navigate("/tournament", {
          replace: true,
          state: { tournament: draft, showResults: false },
        });
        return;
      }

      if (roundIndex === draft.rounds.length - 1) {
        completeTournament(draft);
        return;
      }
    }
  }

  async function processPlayerResult(incomingTournament, result) {
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
    publishTournament(updated);

    if (!result.won) {
      setShowEliminationScreen(true);
      setSpectating(false);
      navigate("/tournament", {
        replace: true,
        state: { tournament: updated, showResults: false },
      });
      return;
    }

    playUISound("victory");
    await advanceAfterPlayerResult(updated, true);
  }

  useEffect(() => {
    const result = location.state?.tournamentResult;
    const incomingTournament = location.state?.tournament;
    const resultKey = result && incomingTournament
      ? incomingTournament.id + ":" + result.matchId
      : null;

    if (!result || !incomingTournament || processedMatch.current === resultKey) return;
    processedMatch.current = resultKey;
    processPlayerResult(incomingTournament, result).catch((error) => {
      console.error("[Wild Cards Tournament] Could not process match result:", error);
      setShowEliminationScreen(true);
      setSpectating(false);
    });
  }, [location.state]);

  useEffect(() => () => {
    window.clearInterval(revealIntervalRef.current);
  }, []);

  useEffect(() => {
    if (!showResults || !tournament?.complete || celebrationPlayedRef.current === tournament.id) return;
    celebrationPlayedRef.current = tournament.id;
    playUISound("victory");
    const timer = window.setTimeout(() => playUISound("unlock"), 550);
    return () => window.clearTimeout(timer);
  }, [showResults, tournament?.complete, tournament?.id]);

  function generateBracket() {
    if (!selectedFighter || cpuPool.filter((fighter) => fighter.id !== selectedFighter.id).length < size - 1) return;
    skipCpuQueueRef.current = false;
    processedMatch.current = null;
    celebrationPlayedRef.current = "";
    setShowEliminationScreen(false);
    setRevealing(true);
    playUISound("confirm");
    const next = makeTournament(size, selectedFighter);
    window.setTimeout(() => {
      setTournament(next);
      setShowResults(false);
      setRevealPreview(null);
      setRevealing(false);
      playUISound("confirm");
    }, 1000);
  }

  function createRevealPreview() {
    if (!tournament) return null;
    const pool = cpuPool.filter((fighter) => fighter.id !== tournament.player.id);
    const previews = {};

    tournament.rounds[0].forEach((match) => {
      previews[match.id] = match.fighters.map((fighter) => {
        if (fighter?.id === tournament.player.id) return fighter;
        return pool[Math.floor(Math.random() * pool.length)] || fighter;
      });
    });
    return previews;
  }

  function startTournament() {
    if (!tournament || revealing || tournament.started) return;
    setRevealing(true);
    playUISound("confirm");
    let step = 0;
    window.clearInterval(revealIntervalRef.current);

    // The actual CPU draw happens now, not when the empty bracket was generated.
    const selectedCpu = [...cpuPool]
      .filter((fighter) => fighter.id !== tournament.player.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, tournament.size - 1);
    const finalParticipants = [
      tournament.player,
      selectedCpu[0],
      ...selectedCpu.slice(1).sort(() => Math.random() - 0.5),
    ];

    revealIntervalRef.current = window.setInterval(() => {
      setRevealPreview(createRevealPreview());
      playUISound("click");
      step += 1;

      if (step >= 6) {
        window.clearInterval(revealIntervalRef.current);
        revealIntervalRef.current = null;
        setRevealPreview(null);
        setTournament((current) => {
          if (!current) return current;
          const firstRound = current.rounds[0].map((match, index) => ({
            ...match,
            fighters: [finalParticipants[index * 2], finalParticipants[index * 2 + 1]],
            isPlayerMatch: [finalParticipants[index * 2], finalParticipants[index * 2 + 1]]
              .some((fighter) => fighter?.id === current.player.id),
          }));
          return {
            ...current,
            participants: finalParticipants,
            rounds: [firstRound, ...current.rounds.slice(1)],
            started: true,
          };
        });
        setRevealing(false);
        playUISound("victory");
      }
    }, 350);
  }

  function enterMatch(match) {
    const opponent = match.fighters.find((fighter) => fighter.id !== tournament.player.id);
    if (!opponent) return;

    playUISound("confirm");
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

  function finishWatchedCpuMatch(winner) {
    const finishMatch = activeCpuResolveRef.current;
    activeCpuResolveRef.current = null;
    setActiveCpuMatch(null);
    finishMatch?.(winner);
  }

  async function watchRemaining() {
    if (!tournament || spectating) return;
    setShowEliminationScreen(false);
    await advanceAfterPlayerResult({
      ...tournament,
      started: true,
      rounds: copyRounds(tournament.rounds),
    }, false);
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

  function leaveTournament() {
    if (!tournament) return;
    skipCpuQueueRef.current = true;
    window.clearInterval(revealIntervalRef.current);
    revealIntervalRef.current = null;
    setRevealPreview(null);
    setRevealing(false);
    if (activeCpuMatch && activeCpuResolveRef.current) {
      const winner = simulateCpuMatch(
        activeCpuMatch.match.fighters[0],
        activeCpuMatch.match.fighters[1],
      );
      activeCpuResolveRef.current(winner);
      activeCpuResolveRef.current = null;
      setActiveCpuMatch(null);
    }
    const finished = prepareCpuFinish();
    if (!finished) return;
    setTournament(finished);
    setShowEliminationScreen(false);
    setShowResults(true);
    setSpectating(false);
    navigate("/tournament", {
      replace: true,
      state: { tournament: finished, showResults: true },
    });
  }

  function restartTournament() {
    skipCpuQueueRef.current = true;
    window.clearInterval(revealIntervalRef.current);
    revealIntervalRef.current = null;
    activeCpuResolveRef.current?.(null);
    activeCpuResolveRef.current = null;
    setActiveCpuMatch(null);
    setRestarting(true);
    setTimeout(() => {
      setTournament(null);
      setShowResults(false);
      setShowEliminationScreen(false);
      setSpectating(false);
      setRevealPreview(null);
      setRevealing(false);
      setRestarting(false);
      setSelectedId("");
      setSize(4);
      processedMatch.current = null;
      navigate("/tournament", { replace: true, state: null });
    }, 480);
  }

  function claimReward() {
    const amount = REWARDS[tournament.humanPlacement] || 0;
    if (!tournament.rewardClaimed && amount > 0) {
      addCoins(amount);
      playGameSound("purchase");
      const updated = { ...tournament, rewardClaimed: true };
      setTournament(updated);
      navigate("/tournament", {
        replace: true,
        state: { tournament: updated, showResults: true },
      });
    }
  }

  if (activeCpuMatch && tournament) {
    const roundLabels = tournament.size === 4
      ? ["SEMIFINALS", "FINAL"]
      : ["QUARTERFINALS", "SEMIFINALS", "FINAL"];
    return (
      <TournamentCpuMatch
        match={activeCpuMatch.match}
        player={tournament.player}
        playerEliminated={tournament.playerEliminated}
        roundLabel={roundLabels[activeCpuMatch.roundIndex] || "CHAMPIONSHIP"}
        matchNumber={activeCpuMatch.matchNumber}
        onComplete={finishWatchedCpuMatch}
        onLeaveTournament={leaveTournament}
      />
    );
  }

  if (showResults && tournament?.complete) {
    const placement = tournament.humanPlacement;
    const suffix = placement === 1 ? "ST" : placement === 2 ? "ND" : placement === 3 ? "RD" : "TH";
    const reward = REWARDS[placement] || 0;

    return (
      <main className={"wc-tournament wc-tournament-results" + (restarting ? " is-restarting" : "")}>
        <div className="wc-tourney-confetti" aria-hidden="true">
          {Array.from({ length: 24 }, (_, index) => (
            <i
              key={index}
              style={{
                left: ((index * 37) % 100) + "%",
                animationDelay: ((index % 8) * -0.37) + "s",
                animationDuration: (3.2 + (index % 5) * 0.42) + "s",
              }}
            />
          ))}
        </div>
        <div className="wc-tourney-crown-light" aria-hidden="true" />
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
      <main className={"wc-tournament wc-tournament-bracket" + (restarting ? " is-restarting" : "")}>
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

        {revealing && (
          <div className="wc-tourney-reveal-status" role="status">
            <span className="wc-tourney-reveal-spinner" />
            <strong>THE CONTENDERS ARE BEING DRAWN</strong>
          </div>
        )}

        <section className="wc-tourney-rounds" aria-label="Tournament bracket">
          {tournament.rounds.map((round, roundIndex) => (
            <section className="wc-tourney-round" key={roundIndex} style={{ flex: round.length }}>
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
                    revealing={revealing}
                    previewFighters={revealPreview?.[match.id]}
                    onEnterMatch={enterMatch}
                  />
                ))}
              </div>
            </section>
          ))}
        </section>

        {tournament.playerEliminated && showEliminationScreen && !tournament.complete && (
          <section className="wc-tourney-elimination-panel">
            <div className="wc-tourney-elimination-mark">K.O.</div>
            <div>
              <strong>YOUR RUN HAS ENDED</strong>
              <span>The championship is still alive. Choose how you want to finish the tournament.</span>
            </div>
            <button className="wc-tourney-watch-button" onClick={watchRemaining} disabled={spectating}>
              {spectating ? "STARTING WATCH MODE..." : "WATCH REMAINING MATCHES"}
            </button>
            <button className="wc-tourney-skip-button" onClick={leaveTournament}>
              LEAVE & SEE RESULTS
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
    <main className={"wc-tournament wc-tournament-setup" + (restarting ? " is-restarting" : "")}>
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
