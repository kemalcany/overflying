# Workflow:

- Add endpoint to API
- Run make openapi-diff to check drift
- Update spec.yaml manually (recommended) OR run make openapi-sync
- Run make codegen to update TS types
- Use types in web app

## Notes

- At the moment, openapi-diff script is stripping a lot of valuable data from the comparison (like description). Introduce them later to improve your tooling.
