import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import mina from "../All_Character_Stats/Mina_AshidoStats.js";
import rockLee from "../All_Character_Stats/Rock_LeeStats.js";
import Usopp from "../All_Character_Stats/UsoppStats.js";
import Chad from "../All_Character_Stats/ChadStats.js";
import Picolo from "../All_Character_Stats/PicoloStats.js";
import TenTen from "../All_Character_Stats/TenTenStats.js";
import Kirishima from "../All_Character_Stats/KirishimaStats.js";
import Ochaco from "../All_Character_Stats/OchacoStats.js";
import Luffy from "../All_Character_Stats/LuffyStats.js";
import Ichigo from "../All_Character_Stats/IchigoStats.js";
import Naruto from "../All_Character_Stats/NarutoStats.js";
import Yoruichi from "../All_Character_Stats/YoruichiStats.js";

import {
  getCoins,
  spendCoins,
  getUnlockedCharacters,
  unlockCharacter,
} from "../Currency.js";

import "./Shop.css";

const fighters = [
  { id: "mina", data: mina, cost: 0, unlockable: false },
  { id: "rockLee", data: rockLee, cost: 0, unlockable: false },

  { id: "usopp", data: Usopp, cost: 250, unlockable: true },
  { id: "chad", data: Chad, cost: 350, unlockable: true },
  { id: "picolo", data: Picolo, cost: 400, unlockable: true },
  { id: "tenten", data: TenTen, cost: 300, unlockable: true },
  { id: "kirishima", data: Kirishima, cost: 350, unlockable: true },
  { id: "ochaco", data: Ochaco, cost: 300, unlockable: true },

  { id: "luffy", data: Luffy, cost: 500, unlockable: true },
  { id: "ichigo", data: Ichigo, cost: 500, unlockable: true },
  { id: "naruto", data: Naruto, cost: 500, unlockable: true },
  { id: "yoruichi", data: Yoruichi, cost: 450, unlockable: true },
];

function Shop() {
  const navigate = useNavigate();

  const [coins, setCoins] = useState(() => getCoins());
  const [unlocked, setUnlocked] = useState(() => getUnlockedCharacters());
  const [message, setMessage] = useState("");

  useEffect(() => {
    const updateCoins = () => setCoins(getCoins());
    const updateUnlocks = () => setUnlocked(getUnlockedCharacters());

    window.addEventListener("coinsUpdated", updateCoins);
    window.addEventListener("unlocksUpdated", updateUnlocks);

    return () => {
      window.removeEventListener("coinsUpdated", updateCoins);
      window.removeEventListener("unlocksUpdated", updateUnlocks);
    };
  }, []);

  const purchaseCharacter = (fighter) => {
    if (unlocked.includes(fighter.id)) {
      setMessage(`${fighter.data.name} is already unlocked.`);
      return;
    }

    const cost = fighter.data.availability?.cost ?? fighter.cost;

    if (coins < cost) {
      setMessage(`Not enough coins to unlock ${fighter.data.name}.`);
      return;
    }

    if (!spendCoins(cost)) {
      setMessage("Not enough coins!");
      return;
    }

    if (unlockCharacter(fighter.id)) {
      setUnlocked(getUnlockedCharacters());
      setMessage(`${fighter.data.name} unlocked successfully!`);
    }
  };

  return (
    <main className="shop-screen">
      <header className="shop-header">
        <button className="shop-back-button" onClick={() => navigate("/")}>
          ← MAIN MENU
        </button>

        <div className="shop-balance">
          <span>◈</span>
          {coins.toLocaleString()} COINS
        </div>
      </header>

      <section className="shop-heading">
        <p>FIGHTERS ARENA MARKETPLACE</p>
        <h1>CHARACTER SHOP</h1>
        <span>Earn coins in battle. Unlock your next fighter.</span>
      </section>

      {message && (
        <p className="shop-message" role="status">
          {message}
        </p>
      )}

      <section className="shop-grid">
        {fighters
          .filter((fighter) => fighter.unlockable)
          .map((fighter) => {
            const isUnlocked = unlocked.includes(fighter.id);
            const cost = fighter.data.availability?.cost ?? fighter.cost;

            return (
              <article
                className={`shop-card ${isUnlocked ? "shop-card-unlocked" : ""}`}
                key={fighter.id}
              >
                <div className="shop-portrait">
                  <img
                    src={fighter.data.image}
                    alt={fighter.data.name}
                    loading="lazy"
                  />

                  {!isUnlocked && (
                    <div
                      className="shop-lock"
                      aria-label={`${fighter.data.name} is locked`}
                    >
                      <svg
                        className="shop-lock-icon"
                        viewBox="0 0 32 36"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                      >
                        {/* Lock shackle */}
                        <path
                          d="M9 15V10C9 5.5 12 3 16 3C20 3 23 5.5 23 10V15"
                          stroke="currentColor"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />

                        {/* Main lock body */}
                        <rect
                          x="4"
                          y="13"
                          width="24"
                          height="20"
                          rx="3"
                          fill="#190711"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        />

                        {/* Keyhole */}
                        <circle cx="16" cy="21" r="2.5" fill="currentColor" />
                        <path
                          d="M16 23V27"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                      </svg>

                      <span className="shop-lock-ribbon">LOCKED</span>
                    </div>
                  )}
                </div>

                <div className="shop-card-info">
                  <h2>{fighter.data.name}</h2>

                  <p>
                    {isUnlocked
                      ? "AVAILABLE TO PLAY"
                      : `${cost.toLocaleString()} COINS`}
                  </p>

                  <button
                    className={`shop-purchase-button ${
                      isUnlocked ? "purchased" : ""
                    }`}
                    disabled={isUnlocked}
                    onClick={() => purchaseCharacter(fighter)}
                  >
                    {isUnlocked ? "UNLOCKED ✓" : "UNLOCK FIGHTER"}
                  </button>
                </div>
              </article>
            );
          })}
      </section>

      <footer className="shop-footer">
        <button className="shop-back-button" onClick={() => navigate(-1)}>
          ← BACK TO PREVIOUS SCREEN
        </button>
      </footer>
    </main>
  );
}

export default Shop;
