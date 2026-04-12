/**
 * Squad Game Picker - Steam Integration
 * Fetches common games from multiple Steam libraries
 */

class GamePicker {
  constructor() {
    this.config = window.GAME_PICKER_CONFIG || {};
    this.steamIds = this.config.STEAM_IDS || [];
    this.playerNames = this.config.PLAYER_NAMES || {};
    this.apiKey = this.config.STEAM_API_KEY;
    this.accessPassword = this.config.ACCESS_PASSWORD;

    this.commonGames = [];
    this.multiplayerGames = [];
    this.singleplayerGames = [];
    this.omittedGames = new Set(); // Games to exclude from random selection
    this.currentFilter = 'multiplayer'; // Default to multiplayer
    this.playerGamesData = []; // Store individual player data
    this.currentPick = null;
    this.picksCount = 0;
    this.isAuthenticated = false;
    this.viewMode = 'grid'; // 'grid' or 'list'
    this.usingMockData = true; // Track if we're using mock data
    this.customPlayerIds = null; // Store custom player IDs
    this.customPlayerNames = null; // Store custom player names

    this.initializeEventListeners();

    // Hide the clear omits button initially
    this.updateClearOmitsVisibility();

    // Always show the game picker and load mock data
    this.showGamePicker();
    this.loadMockData();
  }

  handleRefreshLibraries() {
    if (!this.isAuthenticated) {
      this.showError(
        'Please enter the password first to access real Steam libraries.',
      );
      return;
    }
    this.loadGameLibraries();
  }

  handleRetryAction() {
    if (!this.isAuthenticated) {
      // Reset UI to show mock data instead of error
      this.resetToMockData();
      return;
    }
    this.loadGameLibraries();
  }

  resetToMockData() {
    // Hide error screen and show mock data
    document.getElementById('error-screen').style.display = 'none';
    this.usingMockData = true;
    this.loadMockData();
  }

  initializeEventListeners() {
    // Modal close events
    document
      .getElementById('close-modal')
      ?.addEventListener('click', () => this.hidePasswordModal());
    document
      .getElementById('password-modal')
      ?.addEventListener('click', (e) => {
        if (e.target.id === 'password-modal') this.hidePasswordModal();
      });
    document
      .getElementById('squad-password')
      ?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.checkPassword();
      });
    document
      .getElementById('unlock-squad')
      ?.addEventListener('click', () => this.checkPassword());

    // Customize players modal events
    document
      .getElementById('close-customize-modal')
      ?.addEventListener('click', () => this.hideCustomizeModal());
    document
      .getElementById('customize-players-modal')
      ?.addEventListener('click', (e) => {
        if (e.target.id === 'customize-players-modal')
          this.hideCustomizeModal();
      });
    document
      .getElementById('reset-to-defaults')
      ?.addEventListener('click', () => this.resetToDefaultPlayers());
    document
      .getElementById('fetch-custom-libraries')
      ?.addEventListener('click', () => this.fetchCustomLibraries());

    // Game picker actions
    document
      .getElementById('pick-random-btn')
      ?.addEventListener('click', () => this.pickRandomGame());
    document
      .getElementById('show-all-btn')
      ?.addEventListener('click', () => this.toggleAllGames());
    document
      .getElementById('refresh-btn')
      ?.addEventListener('click', () => this.handleRefreshLibraries());
    document
      .getElementById('retry-btn')
      ?.addEventListener('click', () => this.handleRetryAction());
    document
      .getElementById('steam-link-btn')
      ?.addEventListener('click', () => this.openSteamPage());

    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const filter = e.target.closest('.filter-tab').dataset.filter;
        this.setFilter(filter);
      });
    });

    // Clear omits
    document
      .getElementById('clear-omits-btn')
      ?.addEventListener('click', () => this.clearOmittedGames());

    // View toggle
    document
      .getElementById('view-toggle-btn')
      ?.addEventListener('click', () => this.toggleViewMode());
  }

  async checkPassword() {
    const passwordInput = document.getElementById('squad-password');
    const errorDiv = document.getElementById('password-error');
    const enteredPassword = passwordInput.value.trim();

    if (!enteredPassword) {
      this.showPasswordError('Please enter a password');
      return;
    }

    if (enteredPassword === this.accessPassword) {
      this.isAuthenticated = true;
      this.usingMockData = false;
      this.hidePasswordModal();
      this.loadGameLibraries(); // Load real data
    } else {
      this.showPasswordError('Incorrect password. Squad members only!');
      passwordInput.value = '';
    }
  }

  showPasswordModal() {
    const passwordModal = document.getElementById('password-modal');
    if (passwordModal) {
      passwordModal.style.display = 'flex';
      // Focus on password input
      const passwordInput = document.getElementById('squad-password');
      if (passwordInput) {
        setTimeout(() => passwordInput.focus(), 100);
      }
    }
  }

  hidePasswordModal() {
    const passwordModal = document.getElementById('password-modal');
    if (passwordModal) {
      passwordModal.style.display = 'none';
    }
    // Clear any error messages
    const errorDiv = document.getElementById('password-error');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }

  showCustomizeError(message) {
    const errorDiv = document.getElementById('customize-error');
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = 'block';
    }
  }

  showCustomizeModal() {
    const modal = document.getElementById('customize-players-modal');
    if (modal) {
      // Pre-fill with current player IDs and names if using custom ones
      if (this.customPlayerIds) {
        this.customPlayerIds.forEach((id, index) => {
          const idInput = document.getElementById(`player-id-${index}`);
          const nameInput = document.getElementById(`player-name-${index}`);
          if (idInput) idInput.value = id;
          if (
            nameInput &&
            this.customPlayerNames &&
            this.customPlayerNames[index]
          ) {
            nameInput.value = this.customPlayerNames[index];
          }
        });
      } else if (window.GAME_PICKER_CONFIG?.steamIds) {
        // Pre-fill with default IDs
        window.GAME_PICKER_CONFIG.steamIds.forEach((id, index) => {
          const idInput = document.getElementById(`player-id-${index}`);
          const nameInput = document.getElementById(`player-name-${index}`);
          if (idInput) idInput.value = id;
          if (nameInput) {
            // Use configured name if available, otherwise default
            const configuredName = Object.keys(
              window.GAME_PICKER_CONFIG.PLAYER_NAMES || {},
            ).find((key) => window.GAME_PICKER_CONFIG.PLAYER_NAMES[key] === id);
            nameInput.value = configuredName || `Player ${index + 1}`;
          }
        });
      }

      modal.style.display = 'flex';
    }
  }

  hideCustomizeModal() {
    const modal = document.getElementById('customize-players-modal');
    if (modal) {
      modal.style.display = 'none';
    }
    // Clear any error messages
    const errorDiv = document.getElementById('customize-error');
    if (errorDiv) {
      errorDiv.style.display = 'none';
    }
  }

  async resetToDefaultPlayers() {
    this.customPlayerIds = null;
    this.customPlayerNames = null;
    this.hideCustomizeModal();
    // Reload with default player IDs
    await this.loadGameLibraries();
  }

  async fetchCustomLibraries() {
    const playerIds = [];
    const playerNames = [];

    // Collect entered player IDs and names
    for (let i = 0; i < 6; i++) {
      const idInput = document.getElementById(`player-id-${i}`);
      const nameInput = document.getElementById(`player-name-${i}`);

      if (idInput && idInput.value.trim()) {
        let playerId = idInput.value.trim();
        let playerName =
          nameInput && nameInput.value.trim()
            ? nameInput.value.trim()
            : `Player ${i + 1}`;

        // Extract Steam ID from profile URL if needed
        if (playerId.includes('steamcommunity.com')) {
          const match = playerId.match(/\/(id|profiles)\/([^\/]+)/);
          if (match) {
            playerId = match[2];
          }
        }

        playerIds.push(playerId);
        playerNames.push(playerName);
      }
    }

    if (playerIds.length < 2) {
      this.showCustomizeError(
        'Please enter at least 2 player IDs to find common games.',
      );
      return;
    }

    this.customPlayerIds = playerIds;
    this.customPlayerNames = playerNames;
    this.hideCustomizeModal();

    // Load libraries with custom player IDs
    await this.loadGameLibraries();
  }

  loadMockData() {
    // Mock player data with realistic Steam-style info
    this.playerGamesData = [
      {
        steamId: 'mock_1',
        playerName: 'Alex',
        games: this.getMockGames(),
      },
      {
        steamId: 'mock_2',
        playerName: 'Jordan',
        games: this.getMockGames(),
      },
      {
        steamId: 'mock_3',
        playerName: 'Casey',
        games: this.getMockGames(),
      },
      {
        steamId: 'mock_4',
        playerName: 'Sam',
        games: this.getMockGames(),
      },
    ];

    // Create mock common games (games all players have)
    this.commonGames = [
      { appid: 730, name: 'Counter-Strike 2', playtime_forever: 8400 },
      { appid: 440, name: 'Team Fortress 2', playtime_forever: 3200 },
      { appid: 570, name: 'Dota 2', playtime_forever: 12600 },
      { appid: 4000, name: "Garry's Mod", playtime_forever: 5400 },
      { appid: 10, name: 'Counter-Strike', playtime_forever: 1800 },
      { appid: 413150, name: 'Stardew Valley', playtime_forever: 4800 },
      { appid: 252490, name: 'Rust', playtime_forever: 7200 },
      { appid: 271590, name: 'Grand Theft Auto V', playtime_forever: 9000 },
      { appid: 70, name: 'Half-Life', playtime_forever: 600 },
      { appid: 220, name: 'Half-Life 2', playtime_forever: 1200 },
      { appid: 304930, name: 'Unturned', playtime_forever: 2400 },
      { appid: 105600, name: 'Terraria', playtime_forever: 6000 },
      {
        appid: 292030,
        name: 'The Witcher 3: Wild Hunt',
        playtime_forever: 3600,
      },
      { appid: 431960, name: 'Wallpaper Engine', playtime_forever: 0 },
      {
        appid: 359550,
        name: "Tom Clancy's Rainbow Six Siege",
        playtime_forever: 4800,
      },
    ];

    // Categorize mock games
    this.categorizeMockGames();

    setTimeout(() => {
      this.showResults();
    }, 500);
  }

  getMockGames() {
    // Generate slightly different playtimes for each player to make it realistic
    const baseGames = [
      { appid: 730, name: 'Counter-Strike 2' },
      { appid: 440, name: 'Team Fortress 2' },
      { appid: 570, name: 'Dota 2' },
      { appid: 4000, name: "Garry's Mod" },
      { appid: 10, name: 'Counter-Strike' },
      { appid: 413150, name: 'Stardew Valley' },
      { appid: 252490, name: 'Rust' },
      { appid: 271590, name: 'Grand Theft Auto V' },
      { appid: 70, name: 'Half-Life' },
      { appid: 220, name: 'Half-Life 2' },
      { appid: 304930, name: 'Unturned' },
      { appid: 105600, name: 'Terraria' },
      { appid: 292030, name: 'The Witcher 3: Wild Hunt' },
      { appid: 431960, name: 'Wallpaper Engine' },
      { appid: 359550, name: "Tom Clancy's Rainbow Six Siege" },
    ];

    return baseGames.map((game) => ({
      ...game,
      playtime_forever: Math.floor(Math.random() * 10000) + 600, // Random hours between 10-176 hours
    }));
  }

  categorizeMockGames() {
    // Manually categorize mock games since we know them
    const multiplayerAppIds = [
      730, 440, 570, 4000, 252490, 271590, 304930, 105600, 359550, 10,
    ];
    const singleplayerAppIds = [413150, 70, 220, 292030, 431960];

    this.multiplayerGames = this.commonGames.filter((game) =>
      multiplayerAppIds.includes(game.appid),
    );

    this.singleplayerGames = this.commonGames.filter((game) =>
      singleplayerAppIds.includes(game.appid),
    );

    console.log('🎮 Mock Data Loaded:');
    console.log(`🔥 ${this.multiplayerGames.length} multiplayer games`);
    console.log(`🎲 ${this.singleplayerGames.length} singleplayer games`);
  }

  showGamePicker() {
    const passwordScreen = document.getElementById('password-screen');
    const gamePickerInterface = document.getElementById(
      'game-picker-interface',
    );

    if (passwordScreen && gamePickerInterface) {
      // Always show the interface, but show password screen overlay if using mock data
      gamePickerInterface.style.display = 'block';

      if (this.usingMockData && !this.isAuthenticated) {
        // Show password screen as an overlay
        passwordScreen.style.display = 'flex';
        passwordScreen.style.position = 'fixed';
        passwordScreen.style.top = '0';
        passwordScreen.style.left = '0';
        passwordScreen.style.right = '0';
        passwordScreen.style.bottom = '0';
        passwordScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        passwordScreen.style.zIndex = '1000';
        passwordScreen.style.justifyContent = 'center';
        passwordScreen.style.alignItems = 'center';
      } else {
        passwordScreen.style.display = 'none';
      }
    }
  }

  async loadGameLibraries() {
    if (!this.apiKey) {
      this.showError('Steam API key not configured');
      return;
    }

    this.showLoading();

    try {
      // Use custom player IDs if available, otherwise use default config
      const steamIds = this.customPlayerIds || this.steamIds;

      if (!steamIds || steamIds.length === 0) {
        this.showError('No Steam IDs configured. Please enter player IDs.');
        return;
      }

      this.playerGamesData = []; // Reset player data
      let failedFetches = 0;

      // Fetch games for each Steam ID
      for (let i = 0; i < steamIds.length; i++) {
        const steamId = steamIds[i];
        let playerName;

        if (this.customPlayerNames && this.customPlayerNames[i]) {
          playerName = this.customPlayerNames[i];
        } else {
          playerName = this.playerNames[steamId] || `Player ${i + 1}`;
        }

        this.updateProgress(i, `Loading ${playerName}...`);

        const games = await this.fetchPlayerGames(steamId);

        if (games.length === 0) {
          failedFetches++;
        }

        // Store player data with Steam ID for reference
        this.playerGamesData.push({
          steamId: steamId,
          playerName: playerName,
          games: games,
        });
      }

      // Check if we have enough data to find common games
      if (failedFetches >= steamIds.length) {
        throw new Error(
          'Failed to load any game libraries. Please check your Steam API key and make sure Steam profiles are public.',
        );
      }

      if (failedFetches > 0) {
        console.warn(
          `⚠️ Failed to load ${failedFetches}/${this.steamIds.length} player libraries`,
        );
      }

      // Find common games (only among successfully loaded libraries)
      const validLibraries = this.playerGamesData
        .filter((player) => player.games.length > 0)
        .map((player) => player.games);
      console.log(
        `🔍 Valid libraries: ${validLibraries.length}/${this.playerGamesData.length}`,
      );

      this.commonGames = await this.findCommonGames(validLibraries);
      console.log(
        `🎯 Final commonGames assignment: ${this.commonGames.length} games`,
      );
      console.log(
        '📋 Common games:',
        this.commonGames.map((g) => g.name),
      );

      this.updateProgress(this.steamIds.length, 'Complete!');

      setTimeout(() => {
        if (failedFetches > 0 && failedFetches < this.steamIds.length) {
          // Show warning but continue
          this.showResults();
          setTimeout(() => {
            alert(
              `⚠️ Warning: Could only load ${this.steamIds.length - failedFetches}/${this.steamIds.length} player libraries. Results may be incomplete.`,
            );
          }, 1000);
        } else {
          this.showResults();
        }
      }, 500);
    } catch (error) {
      console.error('Error loading game libraries:', error);
      this.showError(
        error.message ||
          'Failed to load game libraries. Please check your Steam API key and internet connection.',
      );
    }
  }

  async fetchPlayerGames(steamId) {
    const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${this.apiKey}&steamid=${steamId}&format=json&include_appinfo=true`;

    // List of CORS proxies to try (in order of reliability for production)
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      `https://thingproxy.freeboard.io/fetch/${url}`,
      // Note: cors-anywhere.herokuapp.com requires demo page visit, using as last resort
      `https://cors-anywhere.herokuapp.com/${url}`,
    ];

    for (let i = 0; i < proxies.length; i++) {
      try {
        console.log(
          `Trying proxy ${i + 1}/${proxies.length} for ${steamId.slice(-4)}...`,
        );

        const response = await fetch(proxies[i], {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
          signal: AbortSignal.timeout(15000), // Increased timeout for production
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let gameData;

        // Handle different proxy response formats
        if (proxies[i].includes('allorigins.win')) {
          const data = await response.json();
          if (!data.contents || data.contents.startsWith('Oops')) {
            throw new Error('CORS proxy returned error message');
          }
          gameData = JSON.parse(data.contents);
        } else if (proxies[i].includes('corsproxy.io')) {
          gameData = await response.json();
        } else {
          const text = await response.text();
          gameData = JSON.parse(text);
        }

        if (gameData.response && gameData.response.games) {
          console.log(
            `✅ Successfully fetched ${gameData.response.games.length} games for ${steamId.slice(-4)}`,
          );
          return gameData.response.games;
        }

        return [];
      } catch (error) {
        console.error(`Proxy ${i + 1} failed for ${steamId}:`, error.message);

        // If this is the last proxy, return empty array
        if (i === proxies.length - 1) {
          console.error(`❌ All proxies failed for ${steamId}`);
          return [];
        }

        // Wait longer between retries for production
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    return [];
  }

  async findCommonGames(playerGames) {
    if (playerGames.length === 0) {
      console.log('❌ No player games provided');
      return [];
    }

    // Start with first player's games
    let common = [...playerGames[0]];
    console.log(`🎮 Starting with ${common.length} games from first player`);

    // Filter to only games that all players have
    for (let i = 1; i < playerGames.length; i++) {
      const playerGameIds = new Set(playerGames[i].map((game) => game.appid));
      const beforeCount = common.length;
      common = common.filter((game) => playerGameIds.has(game.appid));
      console.log(
        `🔍 After player ${i + 1}: ${beforeCount} → ${common.length} common games`,
      );
    }

    console.log(`🎯 Found ${common.length} common games before categorization`);

    if (common.length === 0) {
      console.log('❌ No common games found between all players');
      return [];
    }

    // Get detailed game information from Steam Store API
    console.log(
      '🔍 Fetching detailed game information from Steam Store API...',
    );
    try {
      await this.categorizeGamesWithStoreAPI(common);
      console.log('✅ Game categorization completed successfully');
    } catch (error) {
      console.error('❌ Error during game categorization:', error);
      // Still return the common games even if categorization fails
    }

    // Sort by name
    common.sort((a, b) => a.name.localeCompare(b.name));

    console.log(`🎮 Returning ${common.length} common games`);
    return common;
  }

  async categorizeGamesWithStoreAPI(games) {
    this.multiplayerGames = [];
    this.singleplayerGames = [];

    console.log('🎮 Categorizing games using Steam Store API...');

    // Process games in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < games.length; i += batchSize) {
      const batch = games.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (game) => {
          try {
            const gameDetails = await this.fetchGameDetails(game.appid);

            if (gameDetails) {
              const categories = gameDetails.categories || [];

              // Steam category IDs:
              // 1 = Multi-player
              // 2 = Single-player
              // 9 = Co-op
              // 24 = Shared/Split Screen
              // 27 = Cross-Platform Multiplayer
              // 38 = Online Multi-Player
              // 39 = Local Multi-Player

              const hasMultiplayer = categories.some((cat) =>
                [1, 9, 24, 27, 36, 37, 38, 39].includes(cat.id),
              );

              const hasSingleplayer = categories.some((cat) => cat.id === 2);

              let category = 'unknown';

              if (hasMultiplayer) {
                // If it has any multiplayer categories, it's multiplayer
                this.multiplayerGames.push(game);
              } else if (hasSingleplayer) {
                // Only single player
                this.singleplayerGames.push(game);
              } else {
                // No clear category data - use fallback keyword detection
                const keywordCategory = this.categorizeByKeywords(game.name);
                if (keywordCategory === 'multiplayer') {
                  this.multiplayerGames.push(game);
                } else {
                  this.singleplayerGames.push(game);
                }
              }
            } else {
              // Fallback to keyword detection if API fails
              const keywordCategory = this.categorizeByKeywords(game.name);
              if (keywordCategory === 'multiplayer') {
                this.multiplayerGames.push(game);
              } else {
                this.singleplayerGames.push(game);
              }
            }
          } catch (error) {
            console.error(`Error fetching details for ${game.name}:`, error);
            // Fallback to keyword detection
            const keywordCategory = this.categorizeByKeywords(game.name);
            if (keywordCategory === 'multiplayer') {
              this.multiplayerGames.push(game);
            } else {
              this.singleplayerGames.push(game);
            }
          }
        }),
      );

      // Small delay between batches to be respectful to the API
      if (i + batchSize < games.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(
      `🎯 Final Results: ${this.multiplayerGames.length} multiplayer, ${this.singleplayerGames.length} singleplayer`,
    );
    console.log(
      '🔥 Multiplayer games:',
      this.multiplayerGames.map((g) => g.name),
    );
    console.log(
      '🎲 Singleplayer games:',
      this.singleplayerGames.map((g) => g.name),
    );
  }

  async fetchGameDetails(appId) {
    const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=categories`;

    // Use same proxy approach as before
    const proxies = [
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      `https://thingproxy.freeboard.io/fetch/${url}`,
    ];

    for (let i = 0; i < proxies.length; i++) {
      try {
        const response = await fetch(proxies[i], {
          method: 'GET',
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        let data;
        if (proxies[i].includes('allorigins.win')) {
          const result = await response.json();
          if (!result.contents || result.contents.startsWith('Oops')) {
            throw new Error('Proxy error');
          }
          data = JSON.parse(result.contents);
        } else {
          data = await response.json();
        }

        if (data[appId] && data[appId].success && data[appId].data) {
          return data[appId].data;
        }

        return null;
      } catch (error) {
        console.warn(
          `Store API proxy ${i + 1} failed for app ${appId}:`,
          error.message,
        );
        if (i === proxies.length - 1) {
          return null;
        }
      }
    }

    return null;
  }

  categorizeByKeywords(gameName) {
    const multiplayerKeywords = [
      'multiplayer',
      'co-op',
      'cooperative',
      'online',
      'pvp',
      'versus',
      'battle',
      'team',
      'squad',
      'party',
      'clan',
      'guild',
      'mmo',
      'fps',
      'competitive',
      'arena',
      'match',
      'tournament',
      'lobby',
      'server',
      'league',
    ];

    const name = gameName.toLowerCase();
    const hasMultiplayerKeywords = multiplayerKeywords.some((keyword) =>
      name.includes(keyword),
    );

    return hasMultiplayerKeywords ? 'multiplayer' : 'singleplayer';
  }

  showLoading() {
    document.getElementById('loading-screen').style.display = 'block';
    document.getElementById('game-results').style.display = 'none';
    document.getElementById('error-screen').style.display = 'none';
  }

  updateProgress(completed, message) {
    // Progress is now just visual spinner - no text updates needed
  }

  showResults() {
    console.log(
      `🎬 showResults called with ${this.commonGames.length} common games`,
    );
    console.log('🎮 Multiplayer games:', this.multiplayerGames.length);
    console.log('🎲 Singleplayer games:', this.singleplayerGames.length);

    const loadingScreen = document.getElementById('loading-screen');
    const gameResults = document.getElementById('game-results');
    const commonGamesCount = document.getElementById('common-games-count');
    const picksCount = document.getElementById('picks-count');
    const pickerActions = document.querySelector('.picker-actions');
    const omitControls = document.getElementById('omit-controls');
    const gameFilterTabs = document.getElementById('game-filter-tabs');

    if (loadingScreen) loadingScreen.style.display = 'none';
    if (gameResults) gameResults.style.display = 'block';

    // Update stats
    const playersCount = document.getElementById('players-count');
    if (commonGamesCount)
      commonGamesCount.textContent = this.commonGames.length;
    if (picksCount) picksCount.textContent = this.picksCount;
    if (playersCount) {
      const currentPlayerCount = this.customPlayerIds
        ? this.customPlayerIds.length
        : this.steamIds.length;
      playersCount.textContent = currentPlayerCount;
    }

    // Add mock data indicator
    this.updateDataModeIndicator();

    // Show action buttons and filter tabs
    if (this.commonGames.length > 0) {
      console.log('✅ Showing game interface');
      if (pickerActions) pickerActions.style.display = 'flex';
      if (omitControls) omitControls.style.display = 'block';

      // Hide clear omits button initially
      const clearBtn = document.getElementById('clear-omits-btn');
      if (clearBtn) {
        clearBtn.style.display = 'none';
      }

      // Keep filter tabs hidden until show all games is clicked
      if (gameFilterTabs) gameFilterTabs.style.display = 'none';
    } else {
      console.log('❌ No common games, showing error');
      // Hide filter tabs and omit controls when no games
      if (gameFilterTabs) gameFilterTabs.style.display = 'none';
      if (omitControls) omitControls.style.display = 'none';
      this.showError(
        'No common games found! Make sure all Steam profiles are public.',
      );
    }
  }

  showError(message) {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('game-results').style.display = 'none';
    document.getElementById('error-screen').style.display = 'block';
    document.getElementById('error-message').textContent = message;
  }

  pickRandomGame() {
    // Only pick from multiplayer games that aren't omitted
    const availableGames = this.multiplayerGames.filter(
      (game) => !this.omittedGames.has(game.appid),
    );

    if (availableGames.length === 0) {
      alert(
        'No multiplayer games available! Try clearing your omitted games or refresh your libraries.',
      );
      return;
    }

    const randomIndex = Math.floor(Math.random() * availableGames.length);
    this.currentPick = availableGames[randomIndex];
    this.picksCount++;

    this.displayCurrentPick();
    document.getElementById('picks-count').textContent = this.picksCount;
  }

  displayCurrentPick() {
    if (!this.currentPick) return;

    const pickCard = document.getElementById('current-pick');
    const pickImage = document.getElementById('pick-image');
    const pickName = document.getElementById('pick-name');
    const pickGenres = document.getElementById('pick-genres');

    pickName.textContent = this.currentPick.name;

    // Steam header image with fallback
    const appId = this.currentPick.appid;
    pickImage.src = `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/header.jpg`;
    pickImage.alt = this.currentPick.name;

    // Handle image load error
    pickImage.onerror = function () {
      this.style.display = 'none';
      const fallback = this.parentElement.querySelector('.pick-image-fallback');
      if (fallback) {
        fallback.style.display = 'flex';
      } else {
        // Create fallback if it doesn't exist
        const fallbackDiv = document.createElement('div');
        fallbackDiv.className = 'pick-image-fallback';
        fallbackDiv.innerHTML = `
                    <i class="fas fa-gamepad"></i>
                    <span>No Image Available</span>
                `;
        this.parentElement.appendChild(fallbackDiv);
      }
    };

    // Reset image display in case it was hidden before
    pickImage.style.display = 'block';
    const existingFallback = pickImage.parentElement.querySelector(
      '.pick-image-fallback',
    );
    if (existingFallback) {
      existingFallback.style.display = 'none';
    }

    // Get individual player hours for this game
    const playerHours = this.getPlayerHoursForGame(appId);

    // Create hours display
    let hoursHTML = '<div class="player-hours">';
    playerHours.forEach((player) => {
      const hours = Math.floor(player.hours / 60);
      const hoursText = hours > 0 ? `${hours}h` : 'Never played';
      hoursHTML += `
                <div class="player-hour-item">
                    <span class="player-name">${player.name}</span>
                    <span class="player-time ${hours === 0 ? 'never-played' : ''}">${hoursText}</span>
                </div>
            `;
    });
    hoursHTML += '</div>';

    pickGenres.innerHTML = hoursHTML;

    pickCard.style.display = 'block';

    // Add animation
    pickCard.classList.remove('pick-animation');
    setTimeout(() => {
      pickCard.classList.add('pick-animation');
    }, 10);
  }

  getPlayerHoursForGame(appId) {
    const playerHours = [];

    this.playerGamesData.forEach((playerData) => {
      const game = playerData.games.find((g) => g.appid === appId);
      playerHours.push({
        name: playerData.playerName,
        hours: game ? game.playtime_forever || 0 : 0,
      });
    });

    // Sort by hours played (highest first)
    return playerHours.sort((a, b) => b.hours - a.hours);
  }

  toggleAllGames() {
    const gamesList = document.getElementById('all-games-list');
    const showBtn = document.getElementById('show-all-btn');
    const filterTabs = document.getElementById('game-filter-tabs');

    if (gamesList.style.display === 'none') {
      this.displayAllGames();
      gamesList.style.display = 'block';
      filterTabs.style.display = 'block'; // Show filter tabs when games are displayed
      showBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Hide All Games';
    } else {
      gamesList.style.display = 'none';
      filterTabs.style.display = 'none'; // Hide filter tabs when games are hidden
      showBtn.innerHTML = '<i class="fas fa-list"></i> Show All Common Games';
    }
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    const gamesGrid = document.getElementById('games-grid');

    if (this.viewMode === 'list') {
      viewToggleBtn.innerHTML = '<i class="fas fa-th"></i> Grid View';
      gamesGrid.classList.add('list-view');
    } else {
      viewToggleBtn.innerHTML = '<i class="fas fa-list"></i> List View';
      gamesGrid.classList.remove('list-view');
    }

    // Refresh the display if games are currently showing
    const gamesList = document.getElementById('all-games-list');
    if (gamesList.style.display !== 'none') {
      this.displayAllGames();
    }
  }

  displayAllGames() {
    const gamesGrid = document.getElementById('games-grid');
    gamesGrid.innerHTML = '';

    const gamesToShow = this.getFilteredGames();

    // Sort games: games with images first, then games without images
    const sortedGames = [...gamesToShow].sort((a, b) => {
      // For now, we'll assume all games might have images and sort by name
      // The actual image availability will be determined during rendering
      return a.name.localeCompare(b.name);
    });

    gamesToShow.forEach((game) => {
      const gameCard = document.createElement('div');
      gameCard.className = 'game-card';

      // Add omitted class if game is omitted
      if (this.omittedGames.has(game.appid)) {
        gameCard.classList.add('omitted');
      }

      // Add multiplayer indicator
      const isMultiplayer = this.multiplayerGames.some(
        (g) => g.appid === game.appid,
      );
      const multiplayerBadge = isMultiplayer
        ? '<div class="multiplayer-badge"><i class="fas fa-users"></i></div>'
        : '';

      const appId = game.appid;
      const imageUrl = `https://steamcdn-a.akamaihd.net/steam/apps/${appId}/capsule_231x87.jpg`;

      // Get player hours for this game
      const playerHours = this.getPlayerHoursForGame(appId);

      // Create player hours HTML for card
      let hoursHTML = '<div class="card-player-hours">';
      playerHours.forEach((player) => {
        const hours = Math.floor(player.hours / 60);
        const hoursText = hours > 0 ? `${hours}h` : '0h';
        hoursHTML += `
                    <div class="card-hour-item">
                        <span class="card-player-name">${player.name}</span>
                        <span class="card-player-time ${hours === 0 ? 'zero-hours' : ''}">${hoursText}</span>
                    </div>
                `;
      });
      hoursHTML += '</div>';

      gameCard.innerHTML = `
                <div class="game-image-container">
                    <img src="${imageUrl}" alt="${game.name}" loading="lazy" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="game-image-fallback" style="display: none;">
                        <i class="fas fa-gamepad"></i>
                        <span>No Image</span>
                    </div>
                </div>
                <div class="game-title">
                    <h4>${game.name}</h4>
                </div>
                <div class="game-info">
                    ${hoursHTML}
                </div>
                <div class="card-badge-actions">
                    ${multiplayerBadge}
                    <button class="omit-btn" title="${this.omittedGames.has(game.appid) ? 'Include in random' : 'Exclude from random'}">
                        <i class="fas ${this.omittedGames.has(game.appid) ? 'fa-eye' : 'fa-eye-slash'}"></i>
                    </button>
                </div>
            `;

      // Click to select game
      gameCard.addEventListener('click', (e) => {
        // Don't trigger if clicking the omit button
        if (e.target.closest('.omit-btn')) return;

        this.currentPick = game;
        this.displayCurrentPick();

        setTimeout(() => {
          const currentPickElement = document.getElementById('current-pick');
          if (currentPickElement) {
            currentPickElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
        }, 100);
      });

      // Omit button functionality
      const omitBtn = gameCard.querySelector('.omit-btn');
      omitBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleGameOmit(game.appid, gameCard);

        // Update button
        const icon = omitBtn.querySelector('i');
        const isOmitted = this.omittedGames.has(game.appid);
        icon.className = `fas ${isOmitted ? 'fa-eye' : 'fa-eye-slash'}`;
        omitBtn.title = isOmitted ? 'Include in random' : 'Exclude from random';

        // Show/hide clear omits button
        this.updateClearOmitsVisibility();
      });

      gamesGrid.appendChild(gameCard);
    });
  }

  updateClearOmitsVisibility() {
    const clearBtn = document.getElementById('clear-omits-btn');
    if (!clearBtn) return; // Button doesn't exist yet

    if (this.omittedGames.size > 0) {
      clearBtn.style.display = 'inline-block';
    } else {
      clearBtn.style.display = 'none';
    }
  }

  openSteamPage() {
    if (this.currentPick) {
      const steamUrl = `https://store.steampowered.com/app/${this.currentPick.appid}/`;
      window.open(steamUrl, '_blank');
    }
  }

  setFilter(filter) {
    this.currentFilter = filter;

    // Update active tab
    document.querySelectorAll('.filter-tab').forEach((tab) => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');

    // If games list is currently shown, refresh it
    const gamesList = document.getElementById('all-games-list');
    if (gamesList.style.display !== 'none') {
      this.displayAllGames();
    }
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'grid' ? 'list' : 'grid';
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    const gamesGrid = document.getElementById('games-grid');

    if (this.viewMode === 'list') {
      viewToggleBtn.innerHTML = '<i class="fas fa-th"></i> Grid View';
      gamesGrid.classList.add('list-view');
    } else {
      viewToggleBtn.innerHTML = '<i class="fas fa-list"></i> List View';
      gamesGrid.classList.remove('list-view');
    }

    // Refresh the display if games are currently showing
    const gamesList = document.getElementById('all-games-list');
    if (gamesList.style.display !== 'none') {
      this.displayAllGames();
    }
  }

  toggleGameOmit(appId, gameCard) {
    if (this.omittedGames.has(appId)) {
      this.omittedGames.delete(appId);
      gameCard.classList.remove('omitted');
    } else {
      this.omittedGames.add(appId);
      gameCard.classList.add('omitted');
    }
  }

  clearOmittedGames() {
    this.omittedGames.clear();
    document.querySelectorAll('.game-card').forEach((card) => {
      card.classList.remove('omitted');
    });
    // Update all omit buttons
    document.querySelectorAll('.omit-btn').forEach((btn) => {
      const icon = btn.querySelector('i');
      icon.className = 'fas fa-eye-slash';
      btn.title = 'Exclude from random';
    });
    // Hide the clear button
    this.updateClearOmitsVisibility();
  }

  getFilteredGames() {
    if (this.currentFilter === 'multiplayer') {
      return this.multiplayerGames;
    } else if (this.currentFilter === 'singleplayer') {
      return this.singleplayerGames;
    } else {
      return this.commonGames;
    }
  }

  updateDataModeIndicator() {
    const indicator = document.getElementById('data-mode-indicator');
    if (!indicator) return;

    if (this.usingMockData) {
      indicator.innerHTML = `
        <span>🎭 Using demo data</span>
        <button class="unlock-button" onclick="window.gamePicker.showPasswordModal()">
          <i class="fas fa-lock"></i>
          <span>Enter Password for Real Data</span>
        </button>
      `;
      indicator.className = 'data-mode-indicator mock';
    } else {
      indicator.innerHTML = `
        <span>🎮 Showing real Steam libraries</span>
        <button class="unlock-button" onclick="window.gamePicker.showCustomizeModal()">
          <i class="fas fa-users-cog"></i>
          <span>Customize Player Group</span>
        </button>
      `;
      indicator.className = 'data-mode-indicator real';
    }
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.gamePicker = new GamePicker();
});
