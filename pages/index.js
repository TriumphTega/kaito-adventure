{player.skills.map(skill => (
  <Button
    key={skill.name}
    variant="outline-danger"
    onClick={() => {
      if (!combatState || combatState.isAttacking) return;
      const selectedSkill = player.skills.find(s => s.name === skill.name);
      if (!selectedSkill) return;

      setCombatState(prev => ({ ...prev, isAttacking: true }));
      setTimeout(() => {
        setCombatState(prev => {
          if (!prev) return null;
          const traitBonus = player.trait === "warrior" ? 5 : 0;
          const newPlayerHealth = Math.min(prev.playerHealth + selectedSkill.effect.heal, 100);
          const newEnemyHealth = Math.max(prev.enemyHealth - (selectedSkill.effect.damage + traitBonus), 0);
          // Explicitly escape single quotes in the string if needed
          const newLog = [
            ...prev.log,
            `Kaito uses ${skill.name} for ${selectedSkill.effect.damage + traitBonus} damage${selectedSkill.effect.heal ? " and heals " + selectedSkill.effect.heal : ""}!`
          ];

          if (newEnemyHealth <= 0) {
            const dropChance = Math.random() < 0.1;
            const drop = dropChance ? "Mist Essence" : null;
            setPlayer(p => {
              let newInventory = [...p.inventory];
              if (drop) {
                const existingItem = newInventory.find(item => item.name === drop);
                newInventory = existingItem
                  ? newInventory.map(item => item.name === drop ? { ...item, quantity: Math.min(item.quantity + 1, 10) } : item)
                  : [...newInventory, { name: drop, quantity: 1 }];
              }
              const banditQuest = p.quests.find(q => q.id === "defeatBandits" && prev.enemy.name === "Bandit") || p.quests.find(q => q.id === "banditQuest");
              const updatedQuests = banditQuest
                ? p.quests.map(q => q.id === banditQuest.id ? { ...q, progress: Math.min(q.progress + 1, q.target) } : q)
                : p.quests;
              if (banditQuest && banditQuest.progress + 1 >= banditQuest.target) completeQuest(banditQuest.id);
              const enemyTask = p.dailyTasks.find(t => t.id === "defeatEnemies");
              const updatedTasks = enemyTask
                ? p.dailyTasks.map(t => t.id === "defeatEnemies" ? { ...t, progress: Math.min(t.progress + 1, t.target) } : t)
                : p.dailyTasks;
              if (enemyTask && enemyTask.progress + 1 >= enemyTask.target) completeDailyTask("defeatEnemies");
              return {
                ...p,
                gold: p.gold + prev.enemy.gold,
                inventory: newInventory,
                quests: updatedQuests,
                stats: { ...p.stats, enemiesDefeated: p.stats.enemiesDefeated + 1 },
                dailyTasks: updatedTasks,
              };
            });
            updateXP(prev.enemy.gold * 10);
            updateSkillLevel(skill.name);
            setGameMessage(`You defeated ${prev.enemy.name} and earned ${prev.enemy.gold} gold!${drop ? " Dropped: " + drop : ""} (+${prev.enemy.gold * 10} XP)`);
            setCombatResult({ type: "win", message: `Victory! You defeated ${prev.enemy.name}!` });
            setTimeout(() => setModals(m => ({ ...m, combat: false })), 1500);
            playSound("/sounds/victory.mp3");
            return null;
          }

          const finalPlayerHealth = Math.max(newPlayerHealth - prev.enemy.damage, 0);
          newLog.push(`${prev.enemy.name} deals ${prev.enemy.damage} damage to Kaito!`);

          if (finalPlayerHealth <= 0) {
            setPlayer(p => ({ ...p, health: finalPlayerHealth }));
            setGameMessage("You were defeated!");
            setCombatResult({ type: "fail", message: `Defeat! ${prev.enemy.name} overpowered you!` });
            setTimeout(() => setModals(m => ({ ...m, combat: false })), 1500);
            playSound("/sounds/defeat.mp3");
            return null;
          }

          setPlayer(p => ({ ...p, health: finalPlayerHealth }));
          updateXP(15);
          updateSkillLevel(skill.name);
          playSound("/sounds/skill.mp3");
          return { ...prev, playerHealth: finalPlayerHealth, enemyHealth: newEnemyHealth, log: newLog, isAttacking: false };
        });
      }, 1000);
    }}
    disabled={!combatState || combatState?.isAttacking || combatResult}
    className="m-1"
  >
    {skill.name} (Lv {skill.level})
  </Button>
))}