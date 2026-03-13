# Project Memory: Submittal Architect

## Data Schema (Submittal Logic)
```json
{
  "project_scope": {
    "specialization": "Electrical Contracting",
    "phase_1_divisions": ["26", "27", "28"],
    "semantic_discovery": "Identify 'Electrical' intent via keywords in non-standard divisions (e.g. 16, 33)",
    "global_target": "All CSI MasterFormat Divisions",
    "spec_parts": ["Part 1 - General", "Part 2 - Products", "Part 3 - Execution"]
  },
  "logic_rules": {
    "global_discovery": "Recursive Header Scanning (Map 100% of PDF sections to page ranges)",
    "search_methodology": "Semantic Description Matching (Description -> Vendor Search -> SKU Candidate)",
    "source_flexibility": ["Targeted-Vendor (e.g. Plat.com)", "Manufacturer-Direct (e.g. Hubbell.com)", "Open-Web"],
    "primary_vendors": ["https://www.platt.com/", "https://www.northcoast.com/"],
    "primary_brands": ["Hubbell", "Leviton"],
    "compliance_modes": ["Spec-Strict", "Vendor-Prioritized", "PM-Override"],
    "match_threshold": 0.8,
    "confidence_threshold": 0.6,
    "fallback_action": "pivot_to_manufacturer_site",
    "interrogation_flow": "Trigger PM questions for items below confidence_threshold",
    "architecture": "Modular-First (Plug-and-play for new Divisions)",
    "persistence_layer": "Supabase (Project ID: ecnrtylraaddmwmatsrs)",
    "responsibility_mapping": ["Self-Perform", "Vendor-Managed", "Outside-Scope"],
    "orchestration_mode": "Human-in-the-Loop (Initial scope defined by user/AI command per project)"
  },
  "brand": {
    "name": "Submittal Architect",
    "mantra": "Aesthetics meet Automation in Construction.",
    "style": "Premium Editorial"
  }
}
```

## Maintenance Log
- [2026-03-08] Project Initialized.
- [2026-03-08] Defined core logic for Division parsing and 80% match rule.
- [2026-03-08] Implemented Discovery Engine and Section Shredder.
- [2026-03-08] Created Supabase project 'Submittal Architect' and initialized schema.
- [2026-03-08] Built Keyword Map for semantic discovery and Knowledge Bridge for technical trait extraction.
- [2026-03-08] Successfully prototyped Platt.com sourcing for 3/4" ground rods.
- [2026-03-12] Redesigned entire frontend to "The Architect Prism" (Command Center aesthetic).
- [2026-03-12] Implemented side-by-side Workbench for spec/cutsheet verification.
