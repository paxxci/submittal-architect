/**
 * Electrical Keyword Map
 * 
 * Used for semantic recognition of electrical scope within non-standard 
 * CSI divisions or poorly labeled spec books.
 */

const ELECTRICAL_KEYWORDS = [
    // General Labels
    "ELECTRICAL",
    "POWER",
    "LIGHTING",
    "GROUNDING",
    "COMMUNICATIONS",
    "BONDING",

    // Equipment/Distribution
    "PANELBOARD",
    "SWITCHBOARD",
    "TRANSFORMER",
    "GENERATOR",
    "TRANSFER SWITCH",
    "UPS",
    "MOTOR STARTER",
    "DISCONNECT",
    "BUSWAY",

    // Raceway/Wiring
    "CONDUIT",
    "RACEWAY",
    "WIRING DEVICE",
    "CABLE TRAY",
    "BUILDING WIRE",
    "JUMPER",

    // Systems
    "FIRE ALARM",
    "SECURITY SYSTEM",
    "ACCESS CONTROL",
    "DATA CABLING",
    "FIBER OPTIC",
    "LOW VOLTAGE"
];

module.exports = ELECTRICAL_KEYWORDS;
