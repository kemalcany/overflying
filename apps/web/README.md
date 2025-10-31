# Web App

## Bundle Logs (gzipped)

- Initial analyze (pre 3D): 264.57kb
- With Next 16.0.0 and before initial bundle optimisation: 283.62kb
- With Spline package (special next.config.js webpack propoery added to resolve errors): 1.67mb (without these it youw have been): 423kb
- Fix: Removed Spline package completely outside of the repo in order to clear bundle: 297.79kb
- Wip: Figma layout migration (and without Spline): 320.26kb
