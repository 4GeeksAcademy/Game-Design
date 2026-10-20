import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { roster } from "./Main Page/CharacterSelection";
import { attackCharacter } from "./Health.js";

// Give each fighter independent stats and attack objects.
function createBattleFighter(id) {
  const selectedFighter = roster.find((fighter) => fighter.id === id);

  if (!selectedFighter?.data) {
    return null;
  }

  const data = selectedFighter.data;

  return {
    ...data,

    id: selectedFighter.id,
    image: selectedFighter.image ?? data.image,

    // Give this fighter independent health and mana values.
    health: data.health,
    maximumHealth: data.maximumHealth ?? data.health,
    mana: data.mana,
    maximumMana: data.maximumMana ?? data.mana,

    // Copy the defense object so it cannot be shared.
    defense:
      typeof data.defense === "object" && data.defense !== null
        ? { ...data.defense }
        : data.defense,

    // Create new attack objects for this specific fighter.
    attacks: (data.attacks ?? []).map((attack) => ({
      ...attack,
      state: true,
      buff: attack.buff ? { ...attack.buff } : attack.buff,
      debuff: attack.debuff ? { ...attack.debuff } : attack.debuff,
    })),

    // Initialize battle-specific state.
    turnFinished: false,
    blocked: false,
  };
}

function FighterPreview({ fighter, isSelected, onClick, team }) {
  const isPlayer = team === "player";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: isSelected
          ? `3px solid ${isPlayer ? "#13d5ff" : "#ff3159"}`
          : "1px solid #444",
        borderRadius: "10px",
        padding: "16px",
        background: isSelected ? "#252525" : "#191919",
        color: "white",
        minWidth: 0,
        width: "100%",
        textAlign: "left",
        cursor: fighter.health <= 0 ? "not-allowed" : "pointer",
        opacity: fighter.health <= 0 ? 0.45 : 1,
        boxShadow: isSelected
          ? `0 0 14px ${isPlayer ? "#13d5ff66" : "#ff315966"}`
          : "none",
      }}
    >
      <h3>
        {fighter.name}
        {isSelected ? " ✓" : ""}
      </h3>

      {fighter.image && (
        <img
          src={fighter.image}
          alt={fighter.name}
          style={{
            width: "100%",
            maxWidth: "150px",
            height: "150px",
            objectFit: "contain",
          }}
        />
      )}

      <p>
        Health: {fighter.health} / {fighter.maximumHealth}
      </p>

      <p>
        Mana: {fighter.mana} / {fighter.maximumMana}
      </p>

      <p>
        Defense:{" "}
        {typeof fighter.defense === "object"
          ? (fighter.defense?.amount ?? 0)
          : (fighter.defense ?? 0)}
      </p>

      <p>Agility: {fighter.agility ?? 0}</p>

      <h4>Attacks</h4>

      {fighter.attacks.map((attack, index) => (
        <p key={`${fighter.id}-${index}`}>
          {attack.name} — Damage: {attack.damage ?? 0}, Mana: {attack.cost ?? 0}
        </p>
      ))}
    </button>
  );
}

export default function TeamBattle() {
  const [combatMessage, setCombatMessage] = useState(
    "Choose your fighter and target.",
  );
  const location = useLocation();
  const [targetAssignments, setTargetAssignments] = useState({});

  const { playerTeamIds = [], opponentTeamIds = [] } = location.state ?? {};

  const [teams, setTeams] = useState(() => ({
    player: playerTeamIds.map(createBattleFighter),
    opponent: opponentTeamIds.map(createBattleFighter),
  }));

  const [activePlayerId, setActivePlayerId] = useState(
    () => playerTeamIds[0] ?? null,
  );

  const [targetOpponentId, setTargetOpponentId] = useState(
    () => opponentTeamIds[0] ?? null,
  );

  const hasValidTeams =
    teams.player.length === 2 &&
    teams.opponent.length === 2 &&
    teams.player.every(Boolean) &&
    teams.opponent.every(Boolean);

  const bothOpponentsAlive = teams.opponent.every(
    (fighter) => fighter.health > 0,
  );

  const [phase, setPhase] = useState("selecting");
  const [roundTargets, setRoundTargets] = useState({});

  const getTargetAssignedToOtherFighter = (fighterId) => {
    return Object.entries(targetAssignments).find(
      ([assignedFighterId, assignedTargetId]) =>
        assignedFighterId !== fighterId &&
        assignedTargetId === targetOpponentId,
    );
  };

  useEffect(() => {
    if (phase !== "cpu-selecting") return;

    const timer = setTimeout(() => {
      const livingCPU = teams.opponent.filter((fighter) => fighter.health > 0);

      const livingPlayers = teams.player.filter(
        (fighter) => fighter.health > 0,
      );

      const availablePlayers = [...livingPlayers];
      const cpuTargets = {};

      // Each CPU fighter randomly chooses an available player.
      for (const cpu of livingCPU) {
        if (availablePlayers.length === 0) break;

        const randomIndex = Math.floor(Math.random() * availablePlayers.length);

        const chosenPlayer = availablePlayers.splice(randomIndex, 1)[0];

        cpuTargets[cpu.id] = chosenPlayer.id;
      }

      setRoundTargets((previous) => ({
        ...previous,
        ...cpuTargets,
      }));

      setPhase("fighting");
      setCombatMessage("Both teams have selected their targets. Fight!");
    }, 3000);

    return () => clearTimeout(timer);
  }, [phase, teams.player, teams.opponent]);

  const selectRoundTarget = (fighterId, opponentId) => {
    const fighter = teams.player.find((fighter) => fighter.id === fighterId);

    const opponent = teams.opponent.find(
      (fighter) => fighter.id === opponentId,
    );

    if (!fighter || !opponent) return;
    if (fighter.health <= 0 || opponent.health <= 0) return;

    const anotherFighterHasTarget = Object.entries(roundTargets).some(
      ([assignedFighterId, assignedOpponentId]) =>
        assignedFighterId !== fighterId && assignedOpponentId === opponentId,
    );

    if (anotherFighterHasTarget) {
      setCombatMessage(
        `${opponent.name} is already assigned to your teammate this round.`,
      );
      return;
    }

    setRoundTargets((previous) => ({
      ...previous,
      [fighterId]: opponentId,
    }));

    setCombatMessage(`${fighter.name} will fight ${opponent.name} this round.`);
  };

  const confirmPlayerTargets = () => {
    const livingPlayers = teams.player.filter((fighter) => fighter.health > 0);

    const livingOpponents = teams.opponent.filter(
      (fighter) => fighter.health > 0,
    );

    const requiredTargets = Math.min(
      livingPlayers.length,
      livingOpponents.length,
    );

    const selectedTargets = livingPlayers.filter(
      (fighter) =>
        roundTargets[fighter.id] &&
        livingOpponents.some(
          (opponent) => opponent.id === roundTargets[fighter.id],
        ),
    ).length;

    if (selectedTargets < requiredTargets) {
      setCombatMessage("Choose your available targets before continuing.");
      return;
    }

    setPhase("cpu-selecting");
    setCombatMessage("Your targets are locked! CPU is choosing...");
  };

  const useAttack = (attackIndex) => {
    const attacker = teams.player.find(
      (fighter) => fighter.id === activePlayerId,
    );

    const defender = teams.opponent.find(
  (fighter) => fighter.id === roundTargets[activePlayerId]
);

    if (!attacker || !defender) return;

    if (attacker.health <= 0) {
      setCombatMessage("A defeated fighter cannot attack.");
      return;
    }

    if (defender.health <= 0) {
      setCombatMessage("Choose an opponent who is still standing.");
      return;
    }

    if (
      bothOpponentsAlive &&
      Object.entries(targetAssignments).some(
        ([fighterId, assignedTargetId]) =>
          fighterId !== attacker.id && assignedTargetId === defender.id,
      )
    ) {
      setCombatMessage(
        "Your teammate has already chosen that opponent. Select the other opponent.",
      );
      return;
    }

    if (attacker.health <= 0 || defender.health <= 0) {
      setCombatMessage("A defeated fighter cannot participate.");
      return;
    }

    const attack = attacker.attacks[attackIndex];

    if (!attack || attack.state !== true) {
      setCombatMessage("That attack has already been used.");
      return;
    }

    const result = attackCharacter(attack, attacker, defender);

    if (!result) {
      setCombatMessage("Not enough mana to use that attack!");
      return;
    }
    setTargetAssignments((previous) => ({
      ...previous,
      [attacker.id]: defender.id,
    }));

    setCombatMessage(
      `${attacker.name} used ${attack.name} on ${defender.name}!`,
    );

    // Trigger a React update after the combat values change.
    setTeams({
      player: [...teams.player],
      opponent: [...teams.opponent],
    });
  };

  if (!hasValidTeams) {
    return (
      <div style={{ color: "white", padding: "24px" }}>
        <h2>Unable to load the 2v2 teams</h2>
        <p>
          Return to character selection and choose two fighters for each team.
        </p>
        <p>Player team: {playerTeamIds.join(", ") || "No fighters selected"}</p>
        <p>
          Opponent team: {opponentTeamIds.join(", ") || "No fighters selected"}
        </p>
      </div>
    );
  }

  return (
    <main
      style={{
        background: "#101010",
        color: "white",
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <h1 style={{ textAlign: "center" }}>2v2 Team Battle — Test Screen</h1>

      {phase !== "fighting" && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#191919",
              color: "white",
              border: "2px solid #13d5ff",
              borderRadius: "16px",
              padding: "28px",
              width: "min(90%, 500px)",
              maxHeight: "85vh",
              overflowY: "auto",
              textAlign: "center",
            }}
          >
            <h2>Choose Your Opponents</h2>
            <p>Select one opponent for each living teammate.</p>

            {teams.player
              .filter((fighter) => fighter.health > 0)
              .map((fighter) => (
                <div
                  key={fighter.id}
                  style={{
                    marginBottom: "20px",
                    padding: "12px",
                    border: "1px solid #444",
                    borderRadius: "10px",
                  }}
                >
                  <h3>{fighter.name}</h3>

                  {teams.opponent
                    .filter((opponent) => opponent.health > 0)
                    .map((opponent) => {
                      const claimedByTeammate = Object.entries(
                        roundTargets,
                      ).some(
                        ([assignedFighterId, assignedOpponentId]) =>
                          assignedFighterId !== fighter.id &&
                          assignedOpponentId === opponent.id,
                      );

                      const selected = roundTargets[fighter.id] === opponent.id;

                      return (
                        <button
                          key={opponent.id}
                          type="button"
                          disabled={claimedByTeammate}
                          onClick={() =>
                            selectRoundTarget(fighter.id, opponent.id)
                          }
                          style={{
                            display: "block",
                            width: "100%",
                            marginTop: "8px",
                            padding: "12px",
                            borderRadius: "8px",
                            border: selected
                              ? "2px solid #13d5ff"
                              : "1px solid #555",
                            background: selected ? "#163746" : "#252525",
                            color: "white",
                            cursor: claimedByTeammate
                              ? "not-allowed"
                              : "pointer",
                            opacity: claimedByTeammate ? 0.45 : 1,
                          }}
                        >
                          {opponent.name}
                          {selected ? " ✓ Selected" : ""}
                          {claimedByTeammate ? " — Teammate's target" : ""}
                        </button>
                      );
                    })}
                </div>
              ))}

            <button
              type="button"
              disabled={phase !== "selecting"}
              onClick={confirmPlayerTargets}
            >
              {phase === "selecting"
                ? "Confirm Targets"
                : "CPU is selecting..."}
            </button>

            <p>{combatMessage}</p>
          </div>
        </div>
      )}

      {/* CPU TEAM */}
      <section>
        <h2>CPU TEAM</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "12px",
          }}
        >
          {teams.opponent.map((fighter) => (
            <FighterPreview
              key={fighter.id}
              fighter={fighter}
              team="opponent"
              isSelected={roundTargets[fighter.id] != null}
              onClick={() => {}}
            />
          ))}
        </div>
      </section>

      {/* PLAYER TEAM */}
      <section>
        <h2>PLAYER TEAM</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "12px",
          }}
        >
          {teams.player.map((fighter) => (
            <FighterPreview
              key={fighter.id}
              fighter={fighter}
              team="player"
              isSelected={fighter.id === activePlayerId}
              onClick={() => {
                if (fighter.health <= 0) return;
                setActivePlayerId(fighter.id);
                const assignedTarget = roundTargets[fighter.id];
                if (assignedTarget) {
                  setTargetOpponentId(assignedTarget);
                }
              }}
            />
          ))}
        </div>
      </section>

      {/* ACTIVE PLAYER'S ATTACKS */}
      <section>
        <h2>
          {teams.player.find((fighter) => fighter.id === activePlayerId)?.name}
          's Attacks
        </h2>

        <p>{combatMessage}</p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "12px",
          }}
        >
          {(
            teams.player.find((fighter) => fighter.id === activePlayerId)
              ?.attacks ?? []
          ).map((attack, index) => (
            <button
              key={`${activePlayerId}-${index}`}
              type="button"
              disabled={
                phase !== "fighting" ||
                attack.state !== true ||
                (teams.player.find((fighter) => fighter.id === activePlayerId)
                  ?.mana ?? 0) < (attack.cost ?? 0)
              }
              onClick={() => useAttack(index)}
            >
              <strong>{attack.name}</strong>
              <p>Damage: {attack.damage ?? 0}</p>
              <p>Mana cost: {attack.cost ?? 0}</p>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
