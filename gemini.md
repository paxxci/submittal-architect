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
    "ecosystem_strategy": "Strict Decoupling: Submittal Architect (The Factory) and Submittal Tracker (The Logistics Network) must remain independent codebases. Connect via API Bridge for Master Suite users ONLY. Never merge.",
    "persistence_layer": "Supabase (Project ID: ecnrtylraaddmwmatsrs)",
    "shared_drive_path": "G:\\My Drive\\Submittal Architect",
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
- [2026-03-27] Redesigned entire frontend to "The Architect Prism" (Command Center aesthetic).
- [2026-03-27] Implemented side-by-side Workbench for spec/cutsheet verification.
- [2026-03-27] Integrated Supabase for real-time data persistence (projects & spec sections).
- [2026-03-27] Implemented AI Sourcing simulations (Find Cutsheet & Vendor Managed workflows).
- [2026-03-27] Refined dual-checkbox product completion logic with global visual feedback.
- [2026-03-27] Stabilized Architect Workbench alignment and resolved Lightbox rendering defects.
- [2026-03-27] Refactored Lightbox to use React Portals for robust full-screen performance.
- [2026-03-27] Enlarged Lightbox to 98% viewport scale and enforced 100% default PDF zoom.
- [2026-03-28] Finalized "Clean Consistency" (Prisms) workbench UI with integrated Product Stacks.
- [2026-03-28] Implemented "Resilient Sourcing" logic: Meta-data (Reasoning/Proof) now always displays even if direct PDF links are missing.
- [2026-03-28] Resolved critical PDF Preview regressions (State reset on block selection).
- [2026-03-28] Added "Direct PDF Not Found" fallback UI with Vendor Page deep-linking.
