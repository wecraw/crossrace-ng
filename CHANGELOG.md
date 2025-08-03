# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.2] - 2025-8-3

### Fixed

- A bug which occasionally caused the game started message to not disappear
- A bug which prevented players from transitioning to daily or practice mode if they had started a multiplayer game

## [0.10.1] - 2025-7-30

### Fixed

- A bug which caused players' letters to disappear after refreshing their board following a disconnect

## [0.10.0] - 2025-7-29

### Added

- Ability to "react" to words in the post game lobby

### Changed

- Simplified "repeat game" flow for versus. Players are no longer taken back to the lobby.
- Leaderboard functions as a playerlist

### Fixed

- Improvements to versus mode stability

## [0.9.1] - 2025-7-27

### Fixed

- A rare visual bug for players that join a lobby with a game in progress

## [0.9.0] - 2025-7-27

### Changed

- Menu flow and styles
- Animations in game (pulse on new correct word, drag and drop animations + general refactor)
- Migrate servers to GCP, refactor websockets connection on frontend
- Greatly improved reconnect behavior and overall robustness with disconnects

## [0.7.1] - 2024-10-23

### Fixed

- Capitalization

## [0.7.0] - 2024-10-23

### Added

- Players can now choose their color and emoji in versus lobbies
- Session leadboards in versus
- "BLING" to valid word dictionary

### Changed

- Refactored usage of game state so that it is more centralized and easier to manage
- Refactored websocket connection management so that it persists between routes and supports reconnecting
- "Challenge a friend" copy changed to "Share"
- "Let's play!" copy changed to "Play!"
- Changed route names to better reflect the underlying game state (solo -> endless)
- Letters always start in the same order for all game types
- Tutorial dialog now shows pagination dots
- Refactored versus menu styles
- Redesigned versus lobby
- Redesigned versus post-game dialog
- Redesigned room code and share UI
- Hamburger menu is now used for all breakpoints
- Crown in lobby given to last game's winner instead of host
- Timer style

### Fixed

- Cursor state for tiles on main menu
- Blocked editing of the grid after the game has ended

## [0.6.5] - 2024-08-29

- Dismissing postgame modal in versus returns you to the lobby

## [0.6.4] - 2024-08-29

- Daily puzzle release time fix

## [0.6.3] - 2024-08-24

### Fixed

- Endless mode properly rerolls the seed for each game

## [0.6.2] - 2024-08-22

### Fixed

- Prevent double tap to zoom behavior on mobile devices

## [0.6.1] - 2024-08-21

### Changed

- Removed animation from main menu logo to support smoother transitions in the menus

## [0.6.0] - 2024-08-21

### Added

- Daily challenge mode! Everyone tries to set their best time in the same daily puzzle. You only get one chance, so be fast!

### Fixed

- Joining an invalid lobby handling, now redirects to homepage

## [0.5.2] - 2024-08-20

### Added

- Pregame lobby before challenge games start

## [0.5.1] - 2024-08-20

### Fixed

- Hover state properly removed on drop

## [0.5.0] - 2024-08-20

### Added

- Challenge mode! After a single player game, challenge your friends to the same puzzle.
- Ability to join games in progress, players are kept in the lobby to await next game
- Hover state for dropping tiles

### Changed

- Post game dialog styles
- Post game for single player
- Loading strategy for game to minimize initial load time
- Share icon
- Timer format
- New players have fade in on join
- Better copy link feedback

### Fixed

- Word validation behavior
- Grid position now resets properly
- UI inconsistencies when player list was pushed for lobby
- Handling for win conflicts in close games

## [0.4.8] - 2024-08-19

### Fixed

- Local name editing behavior + UI improved

## [0.4.6] - 2024-08-19

### Added

- New puzzles, now with double and even triple letters!
- Blog to valid word dictionary
- More explanatory copy in the MP tutorial

### Changed

- Made the grid a bit lighter

## [0.4.4] - 2024-08-17

### Fixed

- Timer stays on screen after solo game

## [0.4.3] - 2024-08-17

### Changed

- Tweaked tutorial animations and styling
- Routing strategy when in game

## [0.4.2] - 2024-08-17

### Fixed

- Letters initializing incorrectly

## [0.4.1] - 2024-08-17

### Added

- Feedback on starting game for host

### Fixed

- Playing again in solo mode

## [0.4.0] - 2024-08-17

### Added

- Tutorials
- Spork, spendy, lovey, frowny to valid word dictionary

### Changed

- Dramatic changes to header and main menu styles
- Version now at bottom of home page

### Removed

- Footer component

### Fixed

- Creating game while already in lobby no longer returns you to the old lobby
- Lambda fix: if a player joins an empty lobby, they automatically get host
- Share should only trigger on mobile devices now

## [0.3.4] - 2024-08-16

### Changed

- Increase grid size for game and postgame

## [0.3.3] - 2024-08-16

### Changed

- Mobile now uses native share functionality

## [0.3.2] - 2024-08-16

### Changed

- Broke lobby down into two components, versus (the create or join experience) and lobby (the waiting room)
- Websocket service now uses subject instead of repeat subject to prevent multiple connections and duplicate messages
- Game start and seed for multiplayer games now managed by game state

## [0.3.1] - 2024-08-16

### Added

- Footer component
- Prix to valid word dictionary

### Changed

- Renamed LetterTileComponent to GameComponent
- Loading strategy for game component to improve loading experience when entering a game

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
