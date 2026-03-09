# Findings & Research: Submittal Architect

## Project Context
- **Objective**: Automate the creation of premium electrical submittal packages.
- **Pain Point**: Manual searching of spec books, manufacturer websites, and PDF merging.

## Research Notes
- **The Description Gap**: Confirmed in `0. Electrical Specifications.pdf`. Manufacturers are listed (e.g., Hubbell, Leviton), but SKUs are nonexistent.
- **Semantic Keywords**: Engine must extract key-value pairs from Part 2 (e.g., "20 Ampere", "125 Volts", "NEMA 3R", "Specification Grade").
- **80% Match Rule**: The scraper must search vendor sites using these extracted technical pairs + Manufacturer name to identify the likely SKU candidate.
- **Vendor Sources**: Targeted sites based on PDF manufacturers: Rexel, CED, etc.
- **Delegated Responsibility**: Not all specs are processed by the user. Some are sent to vendors for their own submittals. The system must track "Who is responsible for this cutsheet?"


## Constraints
- **Massive Manuals**: Must handle 400+ page docs via recursive header scanning.
- **Responsibility Fluidity**: Human must be able to override "Self-Perform" at the individual section level.
- Must allow for manual overrides from local vendor PDFs.
