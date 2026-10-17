import TenTenArenaImage from "../../assets/img/Tenten.jpg";

import ExplodingPineconeImage from "../../assets/img/Attack_IMAGES/ExplodingPinecone.jpeg";
import TabascoStarImage from "../../assets/img/Attack_IMAGES/TabascoStar.jpeg";
import FireBirdStarImage from "../../assets/img/Attack_IMAGES/FireBirdStar.jpeg";
import GasStarImage from "../../assets/img/Attack_IMAGES/GasStar.jpeg";
import FakeHammerImage from "../../assets/img/Attack_IMAGES/FakeHammer.jpeg";

const TenTen = {
  name: "Tenten",
  image: TenTenArenaImage,

  health: 95,
  mana: 85,
  maximumMana: 85,
  manaRegen: 25,
  cooldown: 3,
  maximumCooldown: 3,
  recovery: 1,
  agility: 35,

  defense: {
    amount: 15,
  },

  attacks: [
    {
      id: "tenten-kunai-throw",
      name: "Kunai Throw",
      image: KunaiThrowImage,
      description: "Throws a kunai at the opponent with quick precision.",
      damage: 15,
      speed: 35,
      cost: 5,
      state: true,
    },

    {
      id: "tenten-weapon-barrage",
      name: "Weapon Barrage",
      image: WeaponBarrageImage,
      description:
        "Launches a rapid barrage of shuriken and kunai at the opponent.",
      damage: 25,
      speed: 45,
      cost: 15,
      state: true,
    },

    {
      id: "tenten-explosive-tags",
      name: "Explosive Tags",
      image: ExplosiveTagsImage,
      description:
        "Throws explosive tags that damage the opponent and reduce their agility.",
      damage: 20,
      speed: 30,
      cost: 15,
      state: true,
      debuff: {
        agility: 10,
      },
    },

    {
      id: "tenten-chain-sickle",
      name: "Chain Sickle",
      image: ChainSickleImage,
      description:
        "Attacks with a chained sickle, dealing damage and weakening the opponent's defense.",
      damage: 20,
      speed: 25,
      cost: 15,
      state: true,
      debuff: {
        defense: 5,
      },
    },

    {
      id: "tenten-twin-rising-dragons",
      name: "Twin Rising Dragons",
      image: TwinRisingDragonsImage,
      description:
        "Uses her scrolls to unleash a large wave of weapons against the opponent.",
      damage: 35,
      speed: 40,
      cost: 25,
      state: true,
    },

    {
      id: "tenten-sealing-scroll",
      name: "Sealing Scroll",
      image: SealingScrollImage,
      description:
        "Uses her scroll techniques to recover chakra and prepare for another attack.",
      damage: 0,
      speed: 0,
      cost: 0,
      state: true,
      buff: {
        mana: 15,
      },
    },

    {
      id: "tenten-dragon-weapons",
      name: "Dragon Weapons",
      image: DragonWeaponsImage,
      description:
        "Unleashes a powerful storm of weapons, dealing heavy damage and reducing the opponent's agility.",
      damage: 40,
      speed: 35,
      cost: 30,
      state: true,
      debuff: {
        agility: 15,
      },
    },
  ],
};

export default TenTen;
