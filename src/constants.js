// Game constants for Kaito Adventure (React Native)

export const defaultPlayer = {
  name: "Kaito Brewmaster",
  gold: 5,
  health: 100,
  maxHealth: 100,
  xp: 0,
  level: 1,
  inventory: [
    { name: "Water", quantity: 2 },
    { name: "Herbs", quantity: 1 },
  ],
  inventorySlots: 10,
  rareItems: [],
  recipes: [
    { name: "Herbal Tea", ingredients: ["Water", "Herbs"], type: "sell", baseGold: 20 },
    { name: "Spicy Sake", ingredients: ["Water", "Pepper"], type: "sell", baseGold: 20 },
    { name: "Mist Potion", ingredients: ["Mist Essence", "Herbs"], type: "sell", baseGold: 20 },
    { name: "Golden Elixir", ingredients: ["Golden Herb", "Mist Essence"], type: "sell", baseGold: 50 },
    { name: "Weak Healing Potion", ingredients: ["Water", "Herbs"], type: "heal", healPercent: 0.2, sellValue: 15 },
    { name: "Medium Healing Potion", ingredients: ["Water", "Mist Essence"], type: "heal", healPercent: 0.4, sellValue: 25 },
    { name: "Strong Healing Potion", ingredients: ["Mist Essence", "Shadow Root"], type: "heal", healPercent: 0.6, sellValue: 40 },
    { name: "Lucky Gather Potion", ingredients: ["Herbs", "Golden Herb"], type: "gather", effect: { rareChanceBoost: 0.1, duration: 300000 } },
    { name: "Swift Gather Potion", ingredients: ["Pepper", "Mist Essence"], type: "gather", effect: { cooldownReduction: 0.2, duration: 300000 } },
    { name: "Combat Blade", ingredients: ["Iron Ore", "Wood"], type: "equip", bonus: { damage: 5 } },
    { name: "Steel Axe", ingredients: ["Iron Ore", "Iron Ore"], type: "equip", bonus: { damage: 8 } },
    { name: "Shadow Dagger", ingredients: ["Shadow Root", "Iron Ore"], type: "equip", bonus: { damage: 6 } },
    { name: "Leather Armor", ingredients: ["Herbs", "Wood"], type: "armor", bonus: { defense: 5 }, unlockLevel: 10 },
    { name: "Chainmail", ingredients: ["Iron Ore", "Shadow Root"], type: "armor", bonus: { defense: 10 }, unlockLevel: 10 },
    { name: "Plate Armor", ingredients: ["Iron Ore", "Mist Crystal"], type: "armor", bonus: { defense: 15 }, unlockLevel: 10 },
  ],
  equipment: { weapon: null, armor: null },
  quests: [],
  skills: [
    { name: "Basic Attack", uses: 0, level: 1, effect: { damage: 10 }, tree: "Warrior" },
  ],
  stats: { enemiesDefeated: 0, potionsCrafted: 0, itemsSold: 0, gathers: 0 },
  lastLogin: null,
  dailyTasks: [],
  weeklyTasks: [],
  guild: null,
  avatar: "default",
  trait: null,
};

export const towns = [
  {
    name: "Sakura Village",
    ingredients: ["Water", "Herbs", "Wood"],
    rareIngredients: [{ name: "Golden Herb", chance: 0.1 }],
    gatherCooldown: 0.5,
    rewardMultiplier: 1,
    demand: { "Herbal Tea": 1.0, "Spicy Sake": 0.8, "Mist Potion": 0.5, "Golden Elixir": 1.5 },
    npcOffers: [{ ingredient: "Pepper", price: 5 }, { ingredient: "Mist Essence", price: 7 }],
    npcs: [
      { name: "Hana the Herbalist", dialogue: "Greetings! I need Herbs for my remedies. Can you gather 5 for me?", quest: { id: "herbQuest", description: "Gather 5 Herbs for Hana", progress: 0, target: 5, reward: { gold: 60, xp: 60 } } },
    ],
  },
  {
    name: "Iron Port",
    ingredients: ["Pepper", "Sugar", "Iron Ore"],
    rareIngredients: [{ name: "Iron Shard", chance: 0.1 }],
    gatherCooldown: 1,
    rewardMultiplier: 2,
    demand: { "Herbal Tea": 0.7, "Spicy Sake": 1.2, "Mist Potion": 0.9, "Golden Elixir": 1.2 },
    npcOffers: [{ ingredient: "Water", price: 5 }, { ingredient: "Shadow Root", price: 8 }],
    npcs: [
      { name: "Captain Toru", dialogue: "Ahoy! We need a sturdy Combat Blade for our next voyage. Craft one for us!", quest: { id: "bladeQuest", description: "Craft a Combat Blade for Toru", progress: 0, target: 1, reward: { gold: 80, xp: 80 } } },
    ],
  },
  {
    name: "Mist Hollow",
    ingredients: ["Mist Essence", "Shadow Root"],
    rareIngredients: [{ name: "Mist Crystal", chance: 0.2 }],
    gatherCooldown: 2,
    rewardMultiplier: 4,
    demand: { "Herbal Tea": 0.6, "Spicy Sake": 0.9, "Mist Potion": 1.5, "Golden Elixir": 1.8 },
    npcOffers: [{ ingredient: "Herbs", price: 6 }, { ingredient: "Sugar", price: 5 }],
    npcs: [
      { name: "Mystic Rei", dialogue: "The shadows grow restless. Defeat 3 Bandits to restore peace.", quest: { id: "banditQuest", description: "Defeat 3 Bandits for Rei", progress: 0, target: 3, reward: { gold: 100, xp: 100 } } },
    ],
  },
];

export const allIngredients = ["Water", "Herbs", "Pepper", "Sugar", "Mist Essence", "Shadow Root", "Iron Ore", "Wood", "Golden Herb", "Iron Shard", "Mist Crystal"];
export const rareItems = ["Golden Herb", "Iron Shard", "Mist Crystal"];

export const weatherTypes = [
  { type: "sunny", gatherBonus: null, combatModifier: 1.0, demandBonus: { "Spicy Sake": 1.1 } },
  { type: "rainy", gatherBonus: { ingredient: "Water", chance: 0.5 }, combatModifier: 0.9, demandBonus: { "Herbal Tea": 1.2 } },
  { type: "foggy", gatherBonus: { ingredient: "Mist Essence", chance: 0.3 }, combatModifier: 0.8, demandBonus: { "Mist Potion": 1.3 } },
];

export const enemies = [
  { name: "Bandit", health: 80, damage: 10, gold: 10, drop: "Shadow Root", dropChance: 0.2 },
  { name: "Shadow Ninja", health: 60, damage: 15, gold: 15, drop: "Mist Essence", dropChance: 0.3 },
  { name: "Golem", health: 120, damage: 8, gold: 20, drop: "Iron Ore", dropChance: 0.25 },
];

export const skillTrees = {
  Warrior: [
    { name: "Double Strike", uses: 0, level: 0, effect: { damage: 10 }, cost: { gold: 50 } },
    { name: "Stun", uses: 0, level: 0, effect: { damage: 5, stunChance: 0.2 }, cost: { gold: 75 } },
  ],
  Herbalist: [
    { name: "Efficient Brewing", uses: 0, level: 0, effect: { costReduction: 0.2 }, cost: { gold: 50 } },
    { name: "Potent Mix", uses: 0, level: 0, effect: { healBonus: 10 }, cost: { gold: 75 } },
  ],
  Explorer: [
    { name: "Quick Gather", uses: 0, level: 0, effect: { cooldownReduction: 0.1 }, cost: { gold: 50 } },
    { name: "Lucky Find", uses: 0, level: 0, effect: { rareChance: 0.05 }, cost: { gold: 75 } },
  ],
}; 