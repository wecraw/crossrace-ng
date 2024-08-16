# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1.] - 2024-08-16

### Added

- Footer component
- Prix to valid word dictionary

### Changed

- Renamed LetterTileComponent to GameComponent

## [0.3.0] - 2024-08-15

### Added

- Countdown until game start for multiplayer
- Ability to start a new game from the same lobby after a win
- New post-game screen with view of winning grid
- "GLAMP" and "GLAM" to valid word dictionary
- favicon

### Changed

- Post-game screen uses dialog instead of alert
- Lobby UI is managed by state in most cases rather than by the component
- Letters are now shuffled at the start of a game, and whenever the grid is reset with the button
- Header styling
- Improved styling for mobile

## [0.2.3] - 2024-08-14

### Added

- Ready up functionality to multiplayer lobby
- Host role tracked by DB, can be transfered
- "SPAM" to valid word dictionary
- Additional styling for share link functionality
- Loading screen on creating lobby
- Additional lobby styles for host, editing name, scaffolding for avatars

### Fixed

- Resetting tiles no longer causes timer to stop

## [0.2.2] - 2024-08-13

### Fixed

- Header styling and reduce vertical padding so timer and reset are available on smaller screens

## [0.2.1] - 2024-08-13

### Fixed

- Overscroll on mobile devices is blocked
