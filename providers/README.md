# Data provider adapters

The display player only reads the JSON files in `data/`. Adapters belong in this directory and should normalize an external source into the data shape documented in `docs/content-management.md`; the generator then writes static JSON for the player.

Each future adapter should expose an asynchronous `fetchData(options)` operation and return one or more named arrays such as `results`, `masterpoints`, `slams`, and `events`.

Planned adapters:

- **CSV files:** parse club-exported CSV files into the normalized records.
- **Pianola:** map a supported Pianola export or API response; credentials must only be used in a trusted local/CI environment, never in the signage player.
- **BridgeScore:** map a supported BridgeScore export/API response.
- **Custom REST API:** fetch and normalize data in the generator environment.

No external integration is configured in this first version. Provider-specific credentials and API access need to be supplied by the club before an adapter can be implemented safely.
