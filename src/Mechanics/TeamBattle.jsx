import React, { useState } from "react";
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

  const getTargetAssignedToOtherFighter = (fighterId) => {
    return Object.entries(targetAssignments).find(
      ([assignedFighterId, assignedTargetId]) =>
        assignedFighterId !== fighterId &&
        assignedTargetId === targetOpponentId,
    );
  };

  const useAttack = (attackIndex) => {
    const attacker = teams.player.find(
      (fighter) => fighter.id === activePlayerId,
    );

    const defender = teams.opponent.find(
      (fighter) => fighter.id === targetOpponentId,
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

      {/* CPU team appears at the top */}
      <section>
        <h2 style={{ color: "#ff3159" }}>CPU TEAM</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "16px",
          }}
        >
          {teams.opponent.map((fighter) => (
            <FighterPreview
              key={fighter.id}
              fighter={fighter}
              team="opponent"
              isSelected={targetOpponentId === fighter.id}
              onClick={() => {
                if (fighter.health <= 0) return;

                const assignedByOtherFighter = Object.entries(
                  targetAssignments,
                ).some(
                  ([fighterId, targetId]) =>
                    fighterId !== activePlayerId && targetId === fighter.id,
                );

                if (bothOpponentsAlive && assignedByOtherFighter) {
                  setCombatMessage(
                    "Your teammate has already chosen that opponent.",
                  );
                  return;
                }

                setTargetOpponentId(fighter.id);
              }}
            />
          ))}
        </div>
      </section>

      {/* Player team appears at the bottom */}
      <section style={{ marginTop: "32px" }}>
        <h2 style={{ color: "#13d5ff" }}>PLAYER TEAM</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "16px",
          }}
        >
          {teams.player.map((fighter) => (
            <FighterPreview
              key={fighter.id}
              fighter={fighter}
              team="player"
              isSelected={activePlayerId === fighter.id}
              onClick={() => {
                if (fighter.health <= 0) return;

                setActivePlayerId(fighter.id);

                const assignedTarget = targetAssignments[fighter.id];

                if (assignedTarget) {
                  const targetStillAlive = teams.opponent.some(
                    (opponent) =>
                      opponent.id === assignedTarget && opponent.health > 0,
                  );

                  if (targetStillAlive) {
                    setTargetOpponentId(assignedTarget);
                    return;
                  }
                }

                const availableTarget = teams.opponent.find(
                  (opponent) => opponent.health > 0,
                );

                if (availableTarget) {
                  setTargetOpponentId(availableTarget.id);
                }
              }}
            />
          ))}
        </div>
      </section>

      <section style={{ marginTop: "32px" }}>
        <h2 style={{ color: "#13d5ff" }}>
          {teams.player.find((fighter) => fighter.id === activePlayerId)
            ?.name ?? "Player"}
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
