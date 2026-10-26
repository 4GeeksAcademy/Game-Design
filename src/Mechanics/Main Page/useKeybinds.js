import { useEffect, useRef } from "react";
import { loadKeybinds, normalizeKey } from "./keybinds";

export default function useKeybinds(bindings, onAction, enabled = true) {
  const actionRef = useRef(onAction);
  actionRef.current = onAction;

  useEffect(() => {
    if (!enabled) return undefined;

    const handleKeyDown = (event) => {
      // Ignore key presses while typing in a field or capturing a setting.
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      const key = normalizeKey(event.key);
      if (!key) return;

      const keybinds = loadKeybinds();

      for (const playerId of ["player1", "player2"]) {
        const player = keybinds[playerId];

        const attackIndex = player.attacks.findIndex(
          (boundKey) => normalizeKey(boundKey) === key,
        );

        if (
  attackIndex !== -1 &&
  (bindings.attacks === true || bindings.attacks?.[attackIndex])
) {
          event.preventDefault();
          actionRef.current("attack", attackIndex, playerId);
          return;
        }

        for (const action of ["finishTurn", "defend", "evade", "takeDamage"]) {
          if (
            normalizeKey(player[action]) === key &&
            bindings[action]
          ) {
            event.preventDefault();
           actionRef.current(action, undefined, playerId);
            return;
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [bindings, enabled]);
}