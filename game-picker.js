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

    this.initializeEventListeners();

    // Hide the clear omits button initially
    this.updateClearOmitsVisibility();
  }

  initializeEventListeners() {
    // Password authentication
    document
      .getElementById('unlock-btn')
      ?.addEventListener('click', () => this.checkPassword());
    document
      .getElementById('access-password')
      ?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.checkPassword();
      });

    // Game picker actions
    document
      .getElementById('pick-random-btn')
      ?.addEventListener('click', () => this.pickRandomGame());
    document
      .getElementById('show-all-btn')
      ?.addEventListener('click', () => this.toggleAllGames());
    document
      .getElementById('refresh-btn')
      ?.addEventListener('click', () => this.loadGameLibraries());
    document
      .getElementById('retry-btn')
      ?.addEventListener('click', () => this.loadGameLibraries());
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
    const passwordInput = document.getElementById('access-password');
    const errorDiv = document.getElementById('password-error');
    const enteredPassword = passwordInput.value.trim();

    if (!enteredPassword) {
      this.showPasswordError('Please enter a password');
      return;
    }

    if (enteredPassword === this.accessPassword) {
      this.isAuthenticated = true;
      this.showGamePicker();
      this.loadGameLibraries();
    } else {
      this.showPasswordError('Incorrect password. Squad members only!');
      passwordInput.value = '';
    }
  }

  showPasswordError(message) {
    const errorDiv = document.getElementById('password-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
      errorDiv.style.display = 'none';
    }, 3000);
  }

  showGamePicker() {
    document.getElementById('password-screen').style.display = 'none';
    document.getElementById('game-picker-interface').style.display = 'block';
  }

  async loadGameLibraries() {
    if (!this.apiKey) {
      this.showError('Steam API key not configured');
      return;
    }

    this.showLoading();

    try {
      this.playerGamesData = []; // Reset player data
      let failedFetches = 0;

      // Fetch games for each Steam ID
      for (let i = 0; i < this.steamIds.length; i++) {
        const steamId = this.steamIds[i];
        const playerName = this.playerNames[steamId] || `Player ${i + 1}`;
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
      if (failedFetches >= this.steamIds.length) {
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
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    const percentage = (completed / this.steamIds.length) * 100;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `${completed}/${this.steamIds.length} players loaded`;

    if (message) {
      document.querySelector('.loading-screen p').textContent = message;
    }
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
    if (commonGamesCount)
      commonGamesCount.textContent = this.commonGames.length;
    if (picksCount) picksCount.textContent = this.picksCount;

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
                ${multiplayerBadge}
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
                <div class="card-actions">
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

    // Update show all button text
    const showBtn = document.getElementById('show-all-btn');
    if (filter === 'multiplayer') {
      showBtn.innerHTML = '<i class="fas fa-list"></i> Show Multiplayer Games';
    } else if (filter === 'singleplayer') {
      showBtn.innerHTML =
        '<i class="fas fa-list"></i> Show Single Player Games';
    } else {
      showBtn.innerHTML = '<i class="fas fa-list"></i> Show All Games';
    }

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
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new GamePicker();
});
