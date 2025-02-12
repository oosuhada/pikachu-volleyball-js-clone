'use strict';

const WIDTH = 432;
const HEIGHT = 304;

const ACTION_LABELS = {
  left: 'LEFT',
  right: 'RIGHT',
  up: 'JUMP',
  down: 'DOWN',
  powerHit: 'SMASH',
};

const KEY_LABELS = {
  ArrowLeft: 'LEFT',
  ArrowRight: 'RIGHT',
  ArrowUp: 'UP',
  ArrowDown: 'DOWN',
  ShiftLeft: 'LSHIFT',
  ShiftRight: 'RSHIFT',
  Enter: 'ENTER',
  Space: 'SPACE',
  Escape: 'ESC',
};

function labelKey(code) {
  return KEY_LABELS[code] || code.replace('Key', '').replace('Digit', '');
}

function fitCanvasToGame(uiCanvas, gameCanvas) {
  uiCanvas.style.width = `${gameCanvas.clientWidth}px`;
  uiCanvas.style.height = `${gameCanvas.clientHeight}px`;
}

export function setUpRetroCanvasUI(pikaVolley, ticker) {
  const container = document.getElementById('game-canvas-container');
  const gameCanvas = document.getElementById('game-canvas');

  const uiCanvas = document.createElement('canvas');
  uiCanvas.id = 'retro-ui-canvas';
  uiCanvas.width = WIDTH;
  uiCanvas.height = HEIGHT;
  uiCanvas.tabIndex = 0;
  uiCanvas.setAttribute('aria-label', 'Pikachu Volleyball game menu');
  container.appendChild(uiCanvas);
  fitCanvasToGame(uiCanvas, gameCanvas);

  const mobileControls = document.createElement('div');
  mobileControls.id = 'mobile-game-controls';
  mobileControls.setAttribute('aria-label', 'Mobile game controls');
  mobileControls.innerHTML = `
    <div class="mobile-dpad" aria-label="Direction pad">
      <button type="button" data-action="up" class="mobile-key up" aria-label="Jump or up">▲</button>
      <button type="button" data-action="left" class="mobile-key left" aria-label="Move left">◀</button>
      <button type="button" data-action="down" class="mobile-key down" aria-label="Down">▼</button>
      <button type="button" data-action="right" class="mobile-key right" aria-label="Move right">▶</button>
    </div>
    <div class="mobile-actions">
      <button type="button" data-action="menu" class="mobile-key menu" aria-label="Menu">MENU</button>
      <button type="button" data-action="smash" class="mobile-key smash" aria-label="Smash or confirm">SMASH</button>
    </div>`;
  container.appendChild(mobileControls);

  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  let lastTouchEndAt = 0;

  function preventBrowserGesture(event) {
    if (!isTouchDevice) return;
    event.preventDefault();
  }

  function preventDoubleTapZoom(event) {
    if (!isTouchDevice) return;
    const now = Date.now();
    if (now - lastTouchEndAt <= 320) {
      event.preventDefault();
    }
    lastTouchEndAt = now;
  }

  document.addEventListener('gesturestart', preventBrowserGesture, { passive: false });
  document.addEventListener('gesturechange', preventBrowserGesture, { passive: false });
  document.addEventListener('gestureend', preventBrowserGesture, { passive: false });
  document.addEventListener('touchmove', preventBrowserGesture, { passive: false });
  document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });

  const ctx = uiCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let panel = null;
  let row = 0;
  let modeRow = 0;
  let capture = null;
  let message = '';
  let returnPanel = null;
  const difficultyValues = ['easy', 'normal', 'hard'];
  let difficultyIndex = Math.max(
    0,
    difficultyValues.indexOf(localStorage.getItem('pikachu-volleyball-cpu-difficulty') || 'normal')
  );
  pikaVolley.setCpuDifficulty(difficultyValues[difficultyIndex]);

  const optionRows = [
    ['GRAPHIC', ['graphic-sharp-btn', 'graphic-soft-btn'], ['SHARP', 'SOFT']],
    ['BGM', ['bgm-on-btn', 'bgm-off-btn'], ['ON', 'OFF']],
    ['SFX', ['stereo-btn', 'mono-btn', 'sfx-off-btn'], ['STEREO', 'MONO', 'OFF']],
    ['SPEED', ['slow-speed-btn', 'medium-speed-btn', 'fast-speed-btn'], ['SLOW', 'NORMAL', 'FAST']],
    ['CPU LEVEL', null, ['EASY', 'NORMAL', 'HARD']],
    ['SCORE', ['winning-score-5-btn', 'winning-score-10-btn', 'winning-score-15-btn'], ['5', '10', '15']],
    ['PRACTICE', ['practice-mode-on-btn', 'practice-mode-off-btn'], ['ON', 'OFF']],
  ];

  function pixelText(text, x, y, size = 8, color = '#ffffff', align = 'left') {
    ctx.save();
    ctx.font = `bold ${size}px monospace`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.fillStyle = '#000000';
    ctx.fillText(text, x + 1, y + 1);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function panelFrame(title) {
    ctx.fillStyle = '#081008';
    ctx.fillRect(42, 34, 348, 236);
    ctx.strokeStyle = '#f4e85c';
    ctx.lineWidth = 2;
    ctx.strokeRect(42.5, 34.5, 347, 235);
    ctx.strokeStyle = '#000000';
    ctx.strokeRect(45.5, 37.5, 341, 229);
    pixelText(title, 216, 47, 12, '#f4e85c', 'center');
  }

  function drawSelector(items, startY, gap = 28, width = 230) {
    items.forEach((item, index) => {
      const y = startY + index * gap;
      if (row === index) {
        ctx.fillStyle = '#f4e85c';
        ctx.fillRect((WIDTH - width) / 2, y - 4, width, 18);
      }
      pixelText(
        `${row === index ? '>' : ' '} ${item}`,
        (WIDTH - width) / 2 + 16,
        y,
        9,
        row === index ? '#081008' : '#ffffff'
      );
    });
  }

  function drawPausePanel() {
    panelFrame('GAME MENU');
    drawSelector(['RESUME', 'RESTART', 'KEY SETTING', 'OPTION', 'ABOUT', 'TITLE'], 78, 27, 246);
    pixelText('UP/DOWN SELECT  Z/ENTER OK', 216, 247, 7, '#cfcfcf', 'center');
  }

  function drawKeyPanel() {
    panelFrame('KEY SETTING');
    const bindings = pikaVolley.getSavedKeyboardBindings();
    const flat = [];
    ['player1', 'player2'].forEach((player, playerIndex) => {
      Object.entries(bindings[player]).forEach(([action, code]) => {
        flat.push({ player, playerIndex, action, code });
      });
    });

    pixelText('1 PLAYER', 68, 69, 9, '#f4e85c');
    pixelText('2 PLAYER', 234, 69, 9, '#f4e85c');

    flat.forEach((item, index) => {
      const col = item.playerIndex;
      const localIndex = index % 5;
      const x = col === 0 ? 58 : 224;
      const y = 91 + localIndex * 26;
      if (row === index) {
        ctx.fillStyle = '#f4e85c';
        ctx.fillRect(x - 7, y - 4, 154, 18);
      }
      pixelText(
        `${ACTION_LABELS[item.action].padEnd(6, ' ')} ${labelKey(item.code)}`,
        x,
        y,
        8,
        row === index ? '#081008' : '#ffffff'
      );
    });

    pixelText('JUMP + SMASH : POWER HIT', 216, 219, 7, '#f4e85c', 'center');
    pixelText('MOVE + SMASH : DIVE', 216, 230, 7, '#f4e85c', 'center');
    pixelText(capture ? 'PRESS NEW KEY...' : 'Z/ENTER CHANGE  R DEFAULT', 216, 241, 7, capture ? '#ff8a5c' : '#cfcfcf', 'center');
    pixelText(message || 'ESC BACK', 216, 252, 7, message ? '#f4e85c' : '#cfcfcf', 'center');
  }

  function selectedOptionLabel(ids, labels) {
    const selectedIndex = ids.findIndex((id) => document.getElementById(id)?.classList.contains('selected'));
    return selectedIndex >= 0 ? labels[selectedIndex] : '-';
  }

  function drawOptionsPanel() {
    panelFrame('OPTION');
    optionRows.forEach(([label, ids, labels], index) => {
      const y = 75 + index * 24;
      if (row === index) {
        ctx.fillStyle = '#f4e85c';
        ctx.fillRect(74, y - 4, 284, 18);
      }
      pixelText(`${row === index ? '>' : ' '} ${label}`, 86, y, 8, row === index ? '#081008' : '#ffffff');
      const value = label === 'CPU LEVEL'
        ? labels[difficultyIndex]
        : selectedOptionLabel(ids, labels);
      pixelText(value, 346, y, 8, row === index ? '#081008' : '#f4e85c', 'right');
    });
    pixelText('LEFT/RIGHT CHANGE  ESC BACK', 216, 247, 7, '#cfcfcf', 'center');
  }

  function drawAboutPanel() {
    panelFrame('PIKACHU VOLLEYBALL');
    const lines = [
      '1P VS CPU',
      '2P LOCAL',
      '',
      'JUMP + SMASH : POWER HIT',
      'MOVE + SMASH : DIVE',
      'SMASH DIRECTION FOLLOWS INPUT',
      '',
      'ESC : GAME MENU',
    ];
    lines.forEach((line, index) => pixelText(line, 216, 82 + index * 18, 8, index < 2 ? '#f4e85c' : '#ffffff', 'center'));
    pixelText('ESC BACK', 216, 247, 7, '#cfcfcf', 'center');
  }

  function drawModeSelector() {
    if (pikaVolley.state !== pikaVolley.menu || pikaVolley.frameCounter <= 70 || panel) return;
    const entries = ['1P  CPU', '2P  LOCAL'];
    entries.forEach((label, index) => {
      const y = 188 + index * 22;
      if (modeRow === index) {
        ctx.fillStyle = 'rgba(0,0,0,0.52)';
        ctx.fillRect(144, y - 3, 144, 16);
      }
      pixelText(`${modeRow === index ? '>' : ' '} ${label}`, 216, y, 9, modeRow === index ? '#f4e85c' : '#ffffff', 'center');
    });
    pixelText('UP/DOWN  Z/ENTER START', 216, 238, 7, '#f4e85c', 'center');
    pixelText('PRESS ESC : MENU', 216, 253, 7, '#ffffff', 'center');
  }

  function drawGameMenuHint() {
    if (!document.body.dataset.gameMode || panel || pikaVolley.state === pikaVolley.menu) return;
    ctx.fillStyle = 'rgba(0,0,0,0.46)';
    ctx.fillRect(337, 286, 89, 13);
    pixelText('ESC : MENU', 421, 289, 7, '#f4e85c', 'right');
  }

  function draw() {
    uiCanvas.dataset.panel = panel || 'none';
    uiCanvas.dataset.titleSelection = modeRow === 0 ? '1p' : '2p';
    uiCanvas.dataset.cpuDifficulty = difficultyValues[difficultyIndex];
    uiCanvas.dataset.gameSpeed = String(pikaVolley.normalFPS);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawModeSelector();
    drawGameMenuHint();
    if (panel === 'pause') drawPausePanel();
    if (panel === 'keys') drawKeyPanel();
    if (panel === 'options') drawOptionsPanel();
    if (panel === 'about') drawAboutPanel();
  }

  function openPanel(next, previous = panel) {
    returnPanel = previous;
    panel = next;
    row = 0;
    capture = null;
    message = '';
    pikaVolley.paused = true;
  }

  function closePanel() {
    panel = null;
    row = 0;
    capture = null;
    message = '';
    returnPanel = null;
    pikaVolley.paused = false;
  }

  function backPanel() {
    if (returnPanel) {
      const previous = returnPanel;
      returnPanel = null;
      panel = previous;
      row = 0;
      capture = null;
      message = '';
      pikaVolley.paused = true;
      return;
    }
    closePanel();
  }

  function goToTitle() {
    delete document.body.dataset.gameMode;
    pikaVolley.frameCounter = 0;
    pikaVolley.noInputFrameCounter = 0;
    pikaVolley.slowMotionFramesLeft = 0;
    pikaVolley.slowMotionNumOfSkippedFrames = 0;
    pikaVolley.view.intro.visible = false;
    pikaVolley.view.game.visible = false;
    pikaVolley.view.fadeInOut.visible = false;
    pikaVolley.view.menu.visible = false;
    pikaVolley.audio.sounds.bgm.stop();
    pikaVolley.state = pikaVolley.menu;
    modeRow = 0;
    closePanel();
  }

  function activatePauseItem() {
    if (row === 0) {
      closePanel();
      return;
    }
    if (row === 1) {
      const mode = document.body.dataset.gameMode === '2p' ? '2p' : '1p';
      pikaVolley.startSelectedMode(mode);
      closePanel();
      return;
    }
    if (row === 2) {
      openPanel('keys', 'pause');
      return;
    }
    if (row === 3) {
      openPanel('options', 'pause');
      return;
    }
    if (row === 4) {
      openPanel('about', 'pause');
      return;
    }
    if (row === 5) {
      goToTitle();
    }
  }

  function startCapture() {
    const bindings = pikaVolley.getSavedKeyboardBindings();
    const flat = [];
    ['player1', 'player2'].forEach((player) => {
      Object.keys(bindings[player]).forEach((action) => flat.push({ player, action }));
    });
    capture = flat[row];
    message = `${ACTION_LABELS[capture.action]} KEY?`;
  }

  function cycleOption(direction) {
    if (optionRows[row][0] === 'CPU LEVEL') {
      difficultyIndex = (difficultyIndex + direction + difficultyValues.length) % difficultyValues.length;
      const difficulty = difficultyValues[difficultyIndex];
      localStorage.setItem('pikachu-volleyball-cpu-difficulty', difficulty);
      pikaVolley.setCpuDifficulty(difficulty);
      message = `CPU LEVEL ${difficulty.toUpperCase()}`;
      return;
    }
    const ids = optionRows[row][1];
    let index = ids.findIndex((id) => document.getElementById(id)?.classList.contains('selected'));
    if (index < 0) index = 0;
    index = (index + direction + ids.length) % ids.length;
    document.getElementById(ids[index])?.click();
  }

  function isTitleReady() {
    return pikaVolley.state === pikaVolley.menu && pikaVolley.frameCounter > 70;
  }

  function dispatchSyntheticKey(type, code) {
    const event = new KeyboardEvent(type, {
      code,
      key: code,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);
  }

  function mobileCodeFor(action) {
    const navigatingUI = Boolean(panel) || isTitleReady();
    if (action === 'menu') return 'Escape';
    if (navigatingUI) {
      if (action === 'up') return 'ArrowUp';
      if (action === 'down') return 'ArrowDown';
      if (action === 'left') return 'ArrowLeft';
      if (action === 'right') return 'ArrowRight';
      if (action === 'smash') return 'KeyZ';
    }
    const bindings = pikaVolley.getSavedKeyboardBindings().player1;
    if (action === 'smash') return bindings.powerHit;
    return bindings[action] || null;
  }

  mobileControls.querySelectorAll('[data-action]').forEach((button) => {
    let activeCode = null;
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.setPointerCapture?.(event.pointerId);
      button.classList.add('pressed');
      activeCode = mobileCodeFor(button.dataset.action);
      if (activeCode) dispatchSyntheticKey('keydown', activeCode);
    });
    const release = (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.classList.remove('pressed');
      if (activeCode) dispatchSyntheticKey('keyup', activeCode);
      activeCode = null;
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('contextmenu', (event) => event.preventDefault());
    button.addEventListener('lostpointercapture', (event) => {
      if (activeCode) release(event);
    });
  });

  window.addEventListener('keydown', (event) => {
    if (capture) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.code === 'Escape') {
        capture = null;
        message = 'CANCELLED';
        return;
      }
      const bindings = pikaVolley.getSavedKeyboardBindings();
      const duplicate = Object.entries(bindings).some(([player, playerBindings]) =>
        Object.entries(playerBindings).some(([action, code]) => code === event.code && !(player === capture.player && action === capture.action))
      );
      if (duplicate) {
        message = 'KEY ALREADY USED';
        return;
      }
      bindings[capture.player][capture.action] = event.code;
      localStorage.setItem('pikachu-volleyball-controls-v1', JSON.stringify(bindings));
      pikaVolley.setKeyboardBindings(bindings);
      message = `${ACTION_LABELS[capture.action]} = ${labelKey(event.code)}`;
      capture = null;
      return;
    }

    if (!panel && isTitleReady()) {
      if (event.code === 'ArrowUp') {
        event.preventDefault();
        event.stopImmediatePropagation();
        modeRow = (modeRow - 1 + 2) % 2;
        return;
      }
      if (event.code === 'ArrowDown') {
        event.preventDefault();
        event.stopImmediatePropagation();
        modeRow = (modeRow + 1) % 2;
        return;
      }
      if (event.code === 'KeyZ' || event.code === 'Enter') {
        event.preventDefault();
        event.stopImmediatePropagation();
        pikaVolley.startSelectedMode(modeRow === 0 ? '1p' : '2p');
        return;
      }
      if (event.code === 'KeyK') {
        event.preventDefault();
        event.stopImmediatePropagation();
        openPanel('keys', null);
        return;
      }
      if (event.code === 'KeyO') {
        event.preventDefault();
        event.stopImmediatePropagation();
        openPanel('options', null);
        return;
      }
      if (event.code === 'KeyH') {
        event.preventDefault();
        event.stopImmediatePropagation();
        openPanel('about', null);
        return;
      }
    }

    if (!panel && event.code === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      openPanel('pause', null);
      return;
    }

    if (!panel) return;

    if (event.code === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      backPanel();
      return;
    }

    const maxRows = panel === 'keys' ? 10 : panel === 'options' ? optionRows.length : panel === 'pause' ? 6 : 1;
    if (event.code === 'ArrowUp') {
      event.preventDefault();
      event.stopImmediatePropagation();
      row = (row - 1 + maxRows) % maxRows;
      return;
    }
    if (event.code === 'ArrowDown') {
      event.preventDefault();
      event.stopImmediatePropagation();
      row = (row + 1) % maxRows;
      return;
    }
    if (panel === 'options' && event.code === 'ArrowLeft') {
      event.preventDefault();
      event.stopImmediatePropagation();
      cycleOption(-1);
      return;
    }
    if (panel === 'options' && event.code === 'ArrowRight') {
      event.preventDefault();
      event.stopImmediatePropagation();
      cycleOption(1);
      return;
    }
    if (panel === 'pause' && (event.code === 'Enter' || event.code === 'KeyZ')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      activatePauseItem();
      return;
    }
    if (panel === 'keys' && (event.code === 'Enter' || event.code === 'KeyZ')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      startCapture();
      return;
    }
    if (panel === 'keys' && event.code === 'KeyR') {
      event.preventDefault();
      event.stopImmediatePropagation();
      const defaults = pikaVolley.getDefaultKeyboardBindings();
      localStorage.setItem('pikachu-volleyball-controls-v1', JSON.stringify(defaults));
      pikaVolley.setKeyboardBindings(defaults);
      message = 'DEFAULT RESTORED';
    }
  }, true);

  uiCanvas.addEventListener('pointerdown', (event) => {
    const rect = uiCanvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) * WIDTH) / rect.width;
    const y = ((event.clientY - rect.top) * HEIGHT) / rect.height;

    if (!panel && isTitleReady()) {
      if (x >= 132 && x <= 300 && y >= 178 && y < 207) {
        modeRow = 0;
        pikaVolley.startSelectedMode('1p');
      } else if (x >= 132 && x <= 300 && y >= 207 && y < 232) {
        modeRow = 1;
        pikaVolley.startSelectedMode('2p');
      }
      return;
    }

    if (panel === 'pause' && x >= 93 && x <= 339 && y >= 69 && y <= 238) {
      const index = Math.max(0, Math.min(5, Math.floor((y - 69) / 27)));
      row = index;
      activatePauseItem();
    }
  });

  window.addEventListener('resize', () => fitCanvasToGame(uiCanvas, gameCanvas));
  ticker.add(draw);
}
