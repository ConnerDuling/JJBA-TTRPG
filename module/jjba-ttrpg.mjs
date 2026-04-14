// Import document classes.
import { JJBAActor } from './documents/actor.mjs';
import { JJBAItem } from './documents/item.mjs';
// Import sheet classes.
import { JJBAActorSheet } from './sheets/actor-sheet.mjs';
import { JJBAItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { JJBA_TTRPG } from './helpers/config.mjs';

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.jjbattrpg = {
    JJBAActor,
    JJBAItem,
    rollItemMacro,
  };

  // Add custom constants for configuration.
  CONFIG.JJBA_TTRPG = JJBA_TTRPG;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: '1d20 + @abilities.dex.mod',
    decimals: 2,
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = JJBAActor;
  CONFIG.Item.documentClass = JJBAItem;

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('jjba-ttrpg', JJBAActorSheet, {
    makeDefault: true,
    label: 'JJBA_TTRPG.SheetLabels.Actor',
  });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('jjba-ttrpg', JJBAItemSheet, {
    makeDefault: true,
    label: 'JJBA_TTRPG.SheetLabels.Item',
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.jjbattrpg.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'jjba-ttrpg.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}

// Utility function to get Stand Parameter
function getStandParameterValues(index, field) {
  const parameterTable = [
    {
      "Index": 0,
      "Rank": "E",
      "Description" : "Pitiful",
      "Dice": "1d6",
      "Modifier": -5
    },
    {
      "Index": 1,
      "Rank": "D",
      "Description" : "Weak",
      "Dice": "2d6kh1",
      "Modifier": -3
    },
    {
      "Index": 2,
      "Rank": "C",
      "Description" : "Average",
      "Dice": "2d6",
      "Modifier": +1
    },
    {
      "Index": 3,
      "Rank": "B",
      "Description" : "Good",
      "Dice": "3d6kh2",
      "Modifier": +3
    },
    {
      "Index": 4,
      "Rank": "A",
      "Description" : "Exceptional",
      "Dice": "3d6",
      "Modifier": +5
    }
  ]
  

  return parameterTable[index][field]
}