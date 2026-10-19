export function getDamageThreat(damage) {
  if (damage <= 10) {
    return { label: "VERY SAFE", className: "threat-very-safe" };
  }

  if (damage <= 20) {
    return { label: "SAFE", className: "threat-safe" };
  }

  if (damage <= 40) {
    return { label: "MODERATE", className: "threat-moderate" };
  }

  if (damage <= 60) {
    return { label: "HAZARDOUS", className: "threat-hazardous" };
  }

  if (damage <= 90) {
    return { label: "DANGEROUS", className: "threat-dangerous" };
  }

  if (damage <= 130) {
    return { label: "LIFE THREATENING", className: "threat-life-threatening" };
  }

  return { label: "DEATH", className: "threat-death" };
}

export function getSpeedThreat(speed) {
  if (speed <= 5) {
    return { label: "EASY", className: "speed-easy" };
  }

  if (speed <= 15) {
    return { label: "AVOIDABLE", className: "speed-avoidable" };
  }

  if (speed <= 30) {
    return { label: "CHALLENGING", className: "speed-challenging" };
  }

  if (speed <= 60) {
    return { label: "FAST", className: "speed-fast" };
  }

  if (speed <= 90) {
    return { label: "VERY FAST", className: "speed-very-fast" };
  }

  if (speed <= 135) {
    return { label: "UNAVOIDABLE", className: "speed-unavoidable" };
  }

  return { label: "GUARANTEED HIT", className: "speed-guaranteed" };
}
