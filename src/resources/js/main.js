/**
 * This is the main script which executes the game.
 * General explanations for the all source code files of the game are following.
 *
 ********************************************************************************************************************
 * This web version of the Pikachu Volleyball is made by
 * reverse engineering the core part of the original Pikachu Volleyball game
 * which is developed by "1997 (C) SACHI SOFT / SAWAYAKAN Programmers" & "1997 (C) Satoshi Takenouchi".
 *
 * "physics.js", "cloud_and_wave.js", and some codes in "view.js" are the results of this reverse engineering.
 * Refer to the comments in each file for the machine code addresses of the original functions.
 ********************************************************************************************************************
 *
 * This web version game is mainly composed of three parts which follows MVC pattern.
 *  1) "physics.js" (Model): The physics engine which takes charge of the dynamics of the ball and the players (Pikachus).
 *                           It is gained by reverse engineering the machine code of the original game.
 *  2) "view.js" (View): The rendering part of the game which depends on pixi.js (https://www.pixijs.com/, https://github.com/pixijs/pixi.js) library.
 *                       Some codes in this part is gained by reverse engineering the original machine code.
 *  3) "pikavolley.js" (Controller): Make the game work by controlling the Model and the View according to the user input.
 *
 * And explanations for other source files are below.
 *  - "cloud_and_wave.js": This is also a Model part which takes charge of the clouds and wave motion in the game. Of course, it is also rendered by "view.js".
 *                         It is also gained by reverse engineering the original machine code.
 *  - "keyboard.js": Support the Controller("pikavolley.js") to get a user input via keyboard.
 *  - "audio.js": The game audio or sounds. It depends on pixi-sound (https://github.com/pixijs/pixi-sound) library.
 *  - "rand.js": For the random function used in the Models ("physics.js", "cloud_and_wave.js").
 *  - "assets_path.js": For the assets (image files, sound files) locations.
 *  - "ui.js": For the user interface (menu bar, buttons etc.) of the html page.
 */
'use strict';
import { settings } from '@pixi/settings';
import { SCALE_MODES } from '@pixi/constants';
import { Renderer, BatchRenderer, autoDetectRenderer } from '@pixi/core';
import { Prepare } from '@pixi/prepare';
import { Container } from '@pixi/display';
import { Loader } from '@pixi/loaders';
import { SpritesheetLoader } from '@pixi/spritesheet';
import { Ticker } from '@pixi/ticker';
import { CanvasRenderer } from '@pixi/canvas-renderer';
import { CanvasSpriteRenderer } from '@pixi/canvas-sprite';
import { CanvasPrepare } from '@pixi/canvas-prepare';
import '@pixi/canvas-display';
import { PikachuVolleyball } from './pikavolley.js';
import { ASSETS_PATH } from './assets_path.js';
import { setUpUI } from './ui.js';

// Reference for how to use Renderer.registerPlugin:
// https://github.com/pixijs/pixijs/blob/af3c0c6bb15aeb1049178c972e4a14bb4cabfce4/bundles/pixi.js/src/index.ts#L27-L34
Renderer.registerPlugin('prepare', Prepare);
Renderer.registerPlugin('batch', BatchRenderer);
// Reference for how to use CanvasRenderer.registerPlugin:
// https://github.com/pixijs/pixijs/blob/af3c0c6bb15aeb1049178c972e4a14bb4cabfce4/bundles/pixi.js-legacy/src/index.ts#L13-L19
CanvasRenderer.registerPlugin('prepare', CanvasPrepare);
CanvasRenderer.registerPlugin('sprite', CanvasSpriteRenderer);
Loader.registerPlugin(SpritesheetLoader);

// Set settings.RESOLUTION to 2 instead of 1 to make the game screen do not look
// much blurry in case of the image rendering mode of 'image-rendering: auto',
// which is like bilinear interpolation, which is used in "soft" game graphic option.
settings.RESOLUTION = 2;
settings.SCALE_MODE = SCALE_MODES.NEAREST;
settings.ROUND_PIXELS = true;

const renderer = autoDetectRenderer({
  width: 432,
  height: 304,
  antialias: false,
  backgroundColor: 0x000000,
  backgroundAlpha: 1,
  // Decided to use only Canvas for compatibility reason. One player had reported that
  // on their browser, where pixi chooses to use WebGL renderer, the graphics are not fine.
  // And the issue had been fixed by using Canvas renderer. And also for the sake of testing,
  // it is more comfortable just to stick with Canvas renderer so that it is unnecessary to switch
  // between WebGL renderer and Canvas renderer.
  forceCanvas: true,
});

const stage = new Container();
const ticker = new Ticker();
const loader = new Loader();

renderer.view.setAttribute('id', 'game-canvas');
document.getElementById('game-canvas-container').appendChild(renderer.view);
renderer.render(stage); // To make the initial canvas painting stable in the Firefox browser.

loader.add(ASSETS_PATH.SPRITE_SHEET);
for (const prop in ASSETS_PATH.SOUNDS) {
  loader.add(ASSETS_PATH.SOUNDS[prop]);
}

setUpInitialUI();

/**
 * Set up the initial UI.
 */
function setUpInitialUI() {
  const loadingBox = document.getElementById('loading-box');
  const progressBar = document.getElementById('progress-bar');
  loader.onProgress.add(() => {
    progressBar.style.width = `${loader.progress}%`;
  });
  loader.onComplete.add(() => {
    loadingBox.classList.add('hidden');
  });

  const aboutBox = document.getElementById('about-box');
  const aboutBtn = document.getElementById('about-btn');
  const closeAboutBtn = document.getElementById('close-about-btn');
  const gameDropdownBtn = document.getElementById('game-dropdown-btn');
  const optionsDropdownBtn = document.getElementById('options-dropdown-btn');
  // @ts-ignore
  gameDropdownBtn.disabled = true;
  // @ts-ignore
  optionsDropdownBtn.disabled = true;
  const closeAboutBox = () => {
    if (!aboutBox.classList.contains('hidden')) {
      aboutBox.classList.add('hidden');
      // @ts-ignore
      aboutBtn.disabled = true;
    }
    aboutBtn.getElementsByClassName('text-play')[0].classList.add('hidden');
    aboutBtn.getElementsByClassName('text-about')[0].classList.remove('hidden');
    aboutBtn.classList.remove('glow');
    closeAboutBtn
      .getElementsByClassName('text-play')[0]
      .classList.add('hidden');
    closeAboutBtn
      .getElementsByClassName('text-close')[0]
      .classList.remove('hidden');
    closeAboutBtn.classList.remove('glow');

    loader.load(setup); // setup is called after loader finishes loading
    loadingBox.classList.remove('hidden');
    aboutBtn.removeEventListener('click', closeAboutBox);
    closeAboutBtn.removeEventListener('click', closeAboutBox);
  };

  aboutBox.classList.add('hidden');
  aboutBtn.getElementsByClassName('text-play')[0].classList.add('hidden');
  aboutBtn.getElementsByClassName('text-about')[0].classList.remove('hidden');
  aboutBtn.classList.remove('glow');
  closeAboutBtn.getElementsByClassName('text-play')[0].classList.add('hidden');
  closeAboutBtn.getElementsByClassName('text-close')[0].classList.remove('hidden');
  loader.load(setup);
}

/**
 * Set up the game and the full UI, and start the game.
 */
function setup() {
  const pikaVolley = new PikachuVolleyball(stage, loader.resources);
  movePageControlsIntoGameCanvas();
  setUpUI(pikaVolley, ticker);
  setUpModeAndControlUI(pikaVolley);
  const menuHints = document.getElementById('retro-menu-hints');
  ticker.add(() => {
    const showMenuHints = pikaVolley.state === pikaVolley.menu && pikaVolley.frameCounter > 70;
    menuHints.classList.toggle('hidden', !showMenuHints);
  });
  start(pikaVolley);
}

function movePageControlsIntoGameCanvas() {
  const gameCanvasContainer = document.getElementById('game-canvas-container');
  const menuBar = document.getElementById('menu-bar');
  const settingsOverlay = document.getElementById('retro-settings-overlay');

  gameCanvasContainer.prepend(menuBar);
  gameCanvasContainer.appendChild(settingsOverlay);
  menuBar.classList.add('in-game-menu-bar');
  settingsOverlay.classList.add('in-game-settings-overlay');
}

function setUpModeAndControlUI(pikaVolley) {
  const settingsOverlay = document.getElementById('retro-settings-overlay');
  const gameCanvasContainer = document.getElementById('game-canvas-container');
  const settingsGrid = document.getElementById('retro-settings-grid');
  const settingsMessage = document.getElementById('retro-settings-message');
  const settingsBtn = document.getElementById('retro-key-settings-btn');
  const closeSettingsBtn = document.getElementById('retro-close-settings-btn');
  const resetSettingsBtn = document.getElementById('retro-reset-settings-btn');
  let capture = null;

  const labels = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    ShiftLeft: 'L Shift',
    ShiftRight: 'R Shift',
    Enter: 'Enter',
    Space: 'Space',
  };
  const actionLabels = {
    left: '왼쪽',
    right: '오른쪽',
    up: '점프',
    down: '아래',
    powerHit: '스매시',
  };
  const keyLabel = (code) => labels[code] || code.replace('Key', '').replace('Digit', '');
  const readBindings = () => pikaVolley.getSavedKeyboardBindings();

  const renderSettings = () => {
    const bindings = readBindings();
    settingsGrid.innerHTML = ['player1', 'player2']
      .map((player) => {
        const title = player === 'player1' ? 'Player 1' : 'Player 2';
        const buttons = Object.entries(bindings[player])
          .map(
            ([action, code]) => `
              <button class="retro-key-bind" type="button" data-player="${player}" data-action="${action}">
                <span>${actionLabels[action]}</span>
                <kbd>${keyLabel(code)}</kbd>
              </button>
            `
          )
          .join('');
        return `<section class="retro-key-column"><h3>${title}</h3>${buttons}</section>`;
      })
      .join('');

    settingsGrid.querySelectorAll('.retro-key-bind').forEach((button) => {
      button.addEventListener('click', () => {
        capture = { player: button.dataset.player, action: button.dataset.action };
        settingsMessage.textContent = `${button.querySelector('span').textContent}에 사용할 키를 누르세요.`;
        button.classList.add('capturing');
      });
    });
  };

  document.querySelectorAll('[data-retro-mode]').forEach((button) => {
    button.addEventListener('click', () => {
      pikaVolley.startSelectedMode(button.dataset.retroMode);
    });
  });

  settingsBtn.addEventListener('click', () => {
    pikaVolley.paused = true;
    settingsMessage.textContent = '바꾸고 싶은 조작을 클릭한 뒤 새 키를 누르세요.';
    renderSettings();
    settingsOverlay.classList.remove('hidden');
  });

  closeSettingsBtn.addEventListener('click', () => {
    capture = null;
    settingsOverlay.classList.add('hidden');
    pikaVolley.paused = false;
  });

  resetSettingsBtn.addEventListener('click', () => {
    const defaults = pikaVolley.getDefaultKeyboardBindings();
    localStorage.setItem('pikachu-volleyball-controls-v1', JSON.stringify(defaults));
    pikaVolley.setKeyboardBindings(defaults);
    settingsMessage.textContent = '기본 키 배치로 복원했습니다.';
    renderSettings();
  });

  window.addEventListener(
    'keydown',
    (event) => {
      if (!capture) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const bindings = readBindings();
      const duplicate = Object.entries(bindings).some(([player, playerBindings]) =>
        Object.entries(playerBindings).some(
          ([action, code]) =>
            code === event.code && !(player === capture.player && action === capture.action)
        )
      );
      if (duplicate) {
        settingsMessage.textContent = `${keyLabel(event.code)} 키는 이미 다른 조작에 사용 중입니다.`;
        return;
      }
      bindings[capture.player][capture.action] = event.code;
      localStorage.setItem('pikachu-volleyball-controls-v1', JSON.stringify(bindings));
      pikaVolley.setKeyboardBindings(bindings);
      settingsMessage.textContent = `${actionLabels[capture.action]} 키를 ${keyLabel(event.code)}로 변경했습니다.`;
      capture = null;
      renderSettings();
    },
    true
  );
}

/**
 * Start the game.
 * @param {PikachuVolleyball} pikaVolley
 */
function start(pikaVolley) {
  ticker.maxFPS = pikaVolley.normalFPS;
  ticker.add(() => {
    pikaVolley.gameLoop();
    renderer.render(stage);
  });
  ticker.start();
}
