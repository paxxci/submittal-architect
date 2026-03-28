/**
 * NEC Handbook Reference Logic
 * 
 * Provides industry-standard electrical definitions and NEC-mandated 
 * product traits to the AI Engine for high-precision sourcing.
 */
const NECHandbook = {
    standard_mappings: {
        "Fittings": ["Connector", "Coupling", "Bushing", "Locknut", "Box Connector", "Hub"],
        "Raceway": ["Conduit", "Tubing", "Pipe", "EMT", "RMC", "IMC", "PVC"],
        "Wiring Devices": ["Switch", "Receptacle", "Outlet", "Dimmer", "GFCI"],
        "Supports": ["Hanger", "Strut", "Clamp", "Strap", "J-Hook"]
    },
    nec_traits: {
        "Wet Locations": ["NEMA 4X", "Liquid-tight", "Raintight", "Gasketed", "IP66"],
        "Grounding": ["Green Screw", "Self-Grounding", "Bonding Jumper"],
        "Plenum": ["Low Smoke", "Plenum-Rated", "FT6"],
        "Hazardous": ["Class I Div 1", "Explosion-Proof"]
    },
    common_manufacturers: {
        "Raco": { 
            type: "Fittings", 
            catalog: {
                "1222": "1/2\" Rigid Conduit Connector (Steel)",
                "1223": "3/4\" Rigid Conduit Connector (Steel)",
                "1224": "1\" Rigid Conduit Connector (Steel)",
                "1225": "1-1/4\" Rigid Conduit Connector (Steel)",
                "1230": "2\" Rigid Conduit Connector (Steel)"
            }
        },
        "Hubbell": { type: "Wiring Devices", quality: "Premium" },
        "Allied": { type: "Raceway", quality: "Standard" },
        "Leviton": { type: "Wiring Devices", quality: "Standard" }
    }
};

module.exports = NECHandbook;
