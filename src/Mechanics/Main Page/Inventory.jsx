
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { roster } from "./CharacterSelection.jsx";
import { getUnlockedCharacters } from "../Currency.js";

import "./Inventory.css";

function Inventory() {
  const navigate = useNavigate();

  // Load the player's unlocked characters.
  const [unlockedIds, setUnlockedIds] = useState(
    () => getUnlockedCharacters()
  );

  // Track the character currently being viewed.
  const [selectedCharacterId, setSelectedCharacterId] = useState(null);

  // Refresh the collection whenever a character is unlocked.
  useEffect(() => {
    const updateUnlocks = () => {
      setUnlockedIds(getUnlockedCharacters());
    };

    window.addEventListener("unlocksUpdated", updateUnlocks);

    return () => {
      window.removeEventListener("unlocksUpdated", updateUnlocks);
    };
  }, []);

  // Only display characters the player owns.
  const ownedCharacters = roster.filter((fighter) =>
    unlockedIds.includes(fighter.id)
  );

  // Find the selected character using their ID.
  const selectedCharacter =
    ownedCharacters.find(
      (fighter) => fighter.id === selectedCharacterId
    ) ?? null;

  // Automatically select the first owned character.
  useEffect(() => {
    if (ownedCharacters.length === 0) {
      setSelectedCharacterId(null);
      return;
    }

    const selectionStillOwned = ownedCharacters.some(
      (fighter) => fighter.id === selectedCharacterId
    );

    if (!selectionStillOwned) {
      setSelectedCharacterId(ownedCharacters[0].id);
    }
  }, [unlockedIds, selectedCharacterId]);

  return (
    <main className="inventory-screen">
      <header className="inventory-header">
        <button
          className="inventory-back-button"
          onClick={() => navigate("/")}
        >
          ← BACK
        </button>

        <div className="inventory-title">
          <p>YOUR COLLECTION</p>
          <h1>INVENTORY</h1>
        </div>
      </header>

      <nav className="inventory-navigation">
        <button className="inventory-tab active">
          CHARACTERS
        </button>

        <button className="inventory-tab">
          SKIN GALLERY
        </button>

        <button className="inventory-tab" disabled>
          ATTACKS
          <span>COMING SOON</span>
        </button>
      </nav>

      <section className="inventory-content">
        <div className="inventory-welcome">
          <h2>YOUR FIGHTERS</h2>

          <p>
            Select a character to explore their attacks,
            available costumes, and customization options.
          </p>

          <span className="inventory-character-count">
            {ownedCharacters.length} FIGHTERS OWNED
          </span>
        </div>

        {/* OWNED CHARACTER COLLECTION */}
        <section className="inventory-character-section">
          <div className="inventory-section-heading">
            <h3>CHARACTER COLLECTION</h3>

            <span>
              {ownedCharacters.length} OWNED
            </span>
          </div>

          {ownedCharacters.length > 0 ? (
            <div className="inventory-character-grid">
              {ownedCharacters.map((fighter) => (
                <button
                  key={fighter.id}
                  type="button"
                  className={`inventory-character-card ${
                    selectedCharacterId === fighter.id
                      ? "selected"
                      : ""
                  }`}
                  onClick={() =>
                    setSelectedCharacterId(fighter.id)
                  }
                >
                  <div className="inventory-character-image">
                    <img
                      src={fighter.image}
                      alt={fighter.data.name}
                    />
                  </div>

                  <div className="inventory-character-info">
                    <strong>{fighter.data.name}</strong>
                    <span>{fighter.description}</span>
                  </div>

                  {selectedCharacterId === fighter.id && (
                    <span className="inventory-selected-label">
                      SELECTED
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="inventory-empty">
              <span>⚔</span>
              <h3>NO FIGHTERS FOUND</h3>
              <p>Unlock a character to add them to your collection.</p>
            </div>
          )}
        </section>

        {/* SELECTED CHARACTER DETAILS */}
        {selectedCharacter && (
          <section className="inventory-character-details">
            <div className="inventory-details-heading">
              <p>CHARACTER PROFILE</p>
              <h2>{selectedCharacter.data.name}</h2>
              <span>{selectedCharacter.description}</span>
            </div>

            <div className="inventory-details-layout">
              <div className="inventory-details-portrait">
                <img
                  src={selectedCharacter.image}
                  alt={selectedCharacter.data.name}
                />
              </div>

              <div className="inventory-details-content">
                <h3>COMBAT INFORMATION</h3>

                <div className="inventory-character-stats">
                  <div>
                    <span>HEALTH</span>
                    <strong>
                      {selectedCharacter.data.health}
                    </strong>
                  </div>

                  <div>
                    <span>MANA</span>
                    <strong>
                      {selectedCharacter.data.maximumMana}
                    </strong>
                  </div>

                  <div>
                    <span>AGILITY</span>
                    <strong>
                      {selectedCharacter.data.agility}
                    </strong>
                  </div>
                </div>

                <h3>AVAILABLE ATTACKS</h3>

                <div className="inventory-attacks-list">
                  {Array.isArray(selectedCharacter.data.attacks) &&
                    selectedCharacter.data.attacks.map((attack) => (
                      <div
                        className="inventory-attack-item"
                        key={attack.name}
                      >
                        <strong>{attack.name}</strong>

                        <span>
                          {attack.damage ?? 0} DAMAGE
                        </span>
                      </div>
                    ))}
                </div>

                <div className="inventory-skins-placeholder">
                  <h3>CHARACTER SKINS</h3>
                  <p>
                    Your obtainable and equipped skins will appear here.
                  </p>
                  <span>SKIN CUSTOMIZATION COMING SOON</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

export default Inventory;
