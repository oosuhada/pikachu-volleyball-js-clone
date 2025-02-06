'use strict';

const WIDTH = 432;
const HEIGHT = 304;
const TOP_H = 20;

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
  const legacyMenu = document.getElementById('menu-bar');
  const legacySettings = document.getElementById('retro-settings-overlay');
  legacyMenu.classList.add('hidden');
  legacySettings.classList.add('hidden');

  const uiCanvas = document.createElement('canvas');
  uiCanvas.id = 'retro-ui-canvas';
  uiCanvas.width = WIDTH;
  uiCanvas.height = HEIGHT;
  uiCanvas.tabIndex = 0;
  container.appendChild(uiCanvas);
  fitCanvasToGame(uiCanvas, gameCanvas);

  const ctx = uiCanvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  let panel = null;
  let row = 0;
  let modeRow = 0;
  let capture = null;
  let message = '';
  const tabs = [
    { id: 'game', label: 'GAME', x: 4, w: 54 },
    { id: 'keys', label: 'KEY', x: 61, w: 50 },
    { id: 'options', label: 'OPTION', x: 114, w: 64 },
    { id: 'about', label: 'ABOUT', x: 181, w: 58 },
  ];

  const optionRows = [
    ['GRAPHIC', ['graphic-sharp-btn', 'graphic-soft-btn']],
    ['BGM', ['bgm-on-btn', 'bgm-off-btn']],
    ['SFX', ['stereo-btn', 'mono-btn', 'sfx-off-btn']],
    ['SPEED', ['slow-speed-btn', 'medium-speed-btn', 'fast-speed-btn']],
    ['SCORE', ['winning-score-5-btn', 'winning-score-10-btn', 'winning-score-15-btn']],
    ['PRACTICE', ['practice-mode-on-btn', 'practice-mode-off-btn']],
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

  function drawTopBar() {
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, WIDTH, TOP_H);
    tabs.forEach((tab) => {
      const active = panel === tab.id;
      ctx.fillStyle = active ? '#fff36b' : '#141414';
      ctx.fillRect(tab.x, 3, tab.w, 14);
      ctx.strokeStyle = active ? '#111111' : '#f4f4f4';
      ctx.lineWidth = 1;
      ctx.strokeRect(tab.x + 0.5, 3.5, tab.w - 1, 13);
      pixelText(tab.label, tab.x + tab.w / 2, 6, 7, active ? '#111111' : '#ffffff', 'center');
    });
    pixelText('ESC CLOSE', 425, 6, 7, '#d9d9d9', 'right');
  }

  function panelFrame(title) {
    ctx.fillStyle = 'rgba(5,12,8,0.9)';
    ctx.fillRect(34, 38, 364, 228);
    ctx.strokeStyle = '#fff36b';
    ctx.lineWidth = 2;
    ctx.strokeRect(34.5, 38.5, 363, 227);
    ctx.strokeStyle = '#101010';
    ctx.strokeRect(37.5, 41.5, 357, 221);
    pixelText(title, 216, 49, 13, '#fff36b', 'center');
  }

  function drawGamePanel() {
    panelFrame('GAME MENU');
    const items = ['RESUME', 'PAUSE / RESUME', 'RESTART'];
    items.forEach((item, index) => {
      const y = 95 + index * 36;
      if (row === index) {
        ctx.fillStyle = '#fff36b';
        ctx.fillRect(105, y - 5, 222, 22);
      }
      pixelText(`${row === index ? '▶' : ' '} ${item}`, 120, y, 10, row === index ? '#111111' : '#ffffff');
    });
    pixelText('UP/DOWN SELECT  ·  Z/ENTER OK', 216, 225, 8, '#d7d7d7', 'center');
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
    flat.forEach((item, index) => {
      const col = item.playerIndex;
      const localIndex = index % 5;
      const x = col === 0 ? 58 : 222;
      const y = 88 + localIndex * 27;
      if (row === index) {
        ctx.fillStyle = '#fff36b';
        ctx.fillRect(x - 8, y - 4, 152, 18);
      }
      pixelText(col === 0 && localIndex === 0 ? '1P' : col === 1 && localIndex === 0 ? '2P' : '', x, 69, 9, '#66b9ff');
      pixelText(`${ACTION_LABELS[item.action]}  ${labelKey(item.code)}`, x, y, 8, row === index ? '#111111' : '#ffffff');
    });
    pixelText(capture ? 'PRESS NEW KEY...' : 'ENTER: CHANGE  ·  R: DEFAULT', 216, 229, 8, capture ? '#ff7f55' : '#d7d7d7', 'center');
    if (message) pixelText(message, 216, 245, 7, '#fff36b', 'center');
  }

  function selectedOptionLabel(ids) {
    const selected = ids.find((id) => document.getElementById(id)?.classList.contains('selected'));
    if (!selected) return '-';
    return document.getElementById(selected).textContent.replace('✓', '').trim().toUpperCase();
  }

  function drawOptionsPanel() {
    panelFrame('OPTION');
    optionRows.forEach(([label, ids], index) => {
      const y = 86 + index * 26;
      if (row === index) {
        ctx.fillStyle = '#fff36b';
        ctx.fillRect(74, y - 4, 284, 18);
      }
      pixelText(`${row === index ? '▶' : ' '} ${label}`, 86, y, 8, row === index ? '#111111' : '#ffffff');
      pixelText(selectedOptionLabel(ids), 346, y, 8, row === index ? '#111111' : '#fff36b', 'right');
    });
    pixelText('LEFT/RIGHT CHANGE  ·  ESC CLOSE', 216, 235, 8, '#d7d7d7', 'center');
  }

  function drawAboutPanel() {
    panelFrame('PIKACHU VOLLEYBALL');
    const lines = [
      'BROWSER RETRO CLONE',
      '',
      '1P : VS CPU',
      '2P : LOCAL KEYBOARD',
      '',
      'TITLE SCREEN: UP/DOWN + Z/ENTER',
      'THIS MENU: ESC OR CLICK TOP',
      '',
      '1997-STYLE LOW RESOLUTION UI',
    ];
    lines.forEach((line, index) => pixelText(line, 216, 82 + index * 16, 8, index === 0 ? '#fff36b' : '#ffffff', 'center'));
  }

  function drawModeSelector() {
    if (pikaVolley.state !== pikaVolley.menu || pikaVolley.frameCounter <= 70 || panel) return;
    const entries = [
      ['1P  CPU BATTLE', '1p'],
      ['2P  LOCAL BATTLE', '2p'],
    ];
    entries.forEach(([label], index) => {
      const y = 186 + index * 22;
      if (modeRow === index) {
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(132, y - 3, 168, 16);
      }
      pixelText(`${modeRow === index ? '▶' : ' '} ${label}`, 216, y, 9, modeRow === index ? '#fff36b' : '#ffffff', 'center');
    });
    pixelText('UP/DOWN SELECT · Z/ENTER START', 216, 238, 7, '#fff36b', 'center');
  }

  function draw() {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    drawTopBar();
    drawModeSelector();
    if (panel === 'game') drawGamePanel();
    if (panel === 'keys') drawKeyPanel();
    if (panel === 'options') drawOptionsPanel();
    if (panel === 'about') drawAboutPanel();
  }

  function setPanel(next) {
    panel = panel === next ? null : next;
    row = 0;
    capture = null;
    message = '';
    pikaVolley.paused = !!panel;
  }

  function activateGameItem() {
    if (row === 0) setPanel('game');
    if (row === 1) {
      document.getElementById('pause-btn')?.click();
      panel = null;
    }
    if (row === 2) {
      document.getElementById('restart-btn')?.click();
      panel = null;
      pikaVolley.paused = false;
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
    const ids = optionRows[row][1];
    let index = ids.findIndex((id) => document.getElementById(id)?.classList.contains('selected'));
    if (index < 0) index = 0;
    index = (index + direction + ids.length) % ids.length;
    document.getElementById(ids[index])?.click();
  }

  window.addEventListener('keydown', (event) => {
    if (capture) {
      event.preventDefault();
      event.stopImmediatePropagation();
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

    if (!panel && pikaVolley.state === pikaVolley.menu && pikaVolley.frameCounter > 70) {
      if (event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        event.preventDefault();
        modeRow = event.code === 'ArrowUp' ? (modeRow + 1) % 2 : (modeRow + 1) % 2;
      }
      if (['KeyZ', 'Enter'].includes(event.code)) {
        event.preventDefault();
        pikaVolley.startSelectedMode(modeRow === 0 ? '1p' : '2p');
      }
      return;
    }

    if (!panel) return;
    if (event.code === 'Escape') {
      event.preventDefault();
      panel = null;
      pikaVolley.paused = false;
      return;
    }
    const maxRows = panel === 'keys' ? 10 : panel === 'options' ? optionRows.length : panel === 'game' ? 3 : 1;
    if (event.code === 'ArrowUp') {
      event.preventDefault();
      row = (row - 1 + maxRows) % maxRows;
    }
    if (event.code === 'ArrowDown') {
      event.preventDefault();
      row = (row + 1) % maxRows;
    }
    if (panel === 'options' && event.code === 'ArrowLeft') {
      event.preventDefault();
      cycleOption(-1);
    }
    if (panel === 'options' && event.code === 'ArrowRight') {
      event.preventDefault();
      cycleOption(1);
    }
    if (panel === 'game' && ['Enter', 'KeyZ'].includes(event.code)) {
      event.preventDefault();
      activateGameItem();
    }
    if (panel === 'keys' && ['Enter', 'KeyZ'].includes(event.code)) {
      event.preventDefault();
      startCapture();
    }
    if (panel === 'keys' && event.code === 'KeyR') {
      event.preventDefault();
      const defaults = pikaVolley.getDefaultKeyboardBindings();
      localStorage.setItem('pikachu-volleyball-controls-v1', JSON.stringify(defaults));
      pikaVolley.setKeyboardBindings(defaults);
      message = 'DEFAULT RESTORED';
    }
  }, true);

  uiCanvas.addEventListener('pointerdown', (event) => {
    const rect = uiCanvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * WIDTH / rect.width;
    const y = (event.clientY - rect.top) * HEIGHT / rect.height;
    const tab = tabs.find((item) => x >= item.x && x <= item.x + item.w && y >= 3 && y <= 17);
    if (tab) {
      setPanel(tab.id);
      return;
    }
    if (!panel && pikaVolley.state === pikaVolley.menu && pikaVolley.frameCounter > 70) {
      if (y >= 178 && y < 207) {
        modeRow = 0;
        pikaVolley.startSelectedMode('1p');
      } else if (y >= 207 && y < 232) {
        modeRow = 1;
        pikaVolley.startSelectedMode('2p');
      }
    }
  });

  window.addEventListener('resize', () => fitCanvasToGame(uiCanvas, gameCanvas));
  ticker.add(draw);
}
