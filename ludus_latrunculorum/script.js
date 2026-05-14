const BOARD_WIDTH = 729;
const BOARD_HEIGHT = 729;
const BOARD_SIZE = 8;
const STONES_PER_PLAYER = 20;

const VARIANT_PISO = "piso";
const VARIANT_SENECA = "seneca";

const nodes = [
  { x: 55,  y: 57,  r: 38 }, { x: 142, y: 58,  r: 40 }, { x: 230, y: 57,  r: 40 }, { x: 315, y: 57,  r: 39 },
  { x: 405, y: 58,  r: 42 }, { x: 494, y: 58,  r: 39 }, { x: 582, y: 58,  r: 41 }, { x: 666, y: 57,  r: 37 },

  { x: 55,  y: 144, r: 37 }, { x: 142, y: 144, r: 41 }, { x: 229, y: 144, r: 38 }, { x: 315, y: 144, r: 41 },
  { x: 404, y: 144, r: 38 }, { x: 493, y: 144, r: 39 }, { x: 581, y: 143, r: 38 }, { x: 666, y: 143, r: 38 },

  { x: 54,  y: 232, r: 38 }, { x: 142, y: 233, r: 40 }, { x: 229, y: 232, r: 39 }, { x: 316, y: 232, r: 38 },
  { x: 404, y: 232, r: 41 }, { x: 493, y: 231, r: 39 }, { x: 580, y: 233, r: 39 }, { x: 667, y: 234, r: 37 },

  { x: 57,  y: 322, r: 38 }, { x: 143, y: 322, r: 41 }, { x: 228, y: 319, r: 38 }, { x: 315, y: 320, r: 40 },
  { x: 403, y: 321, r: 40 }, { x: 492, y: 321, r: 39 }, { x: 580, y: 320, r: 40 }, { x: 666, y: 322, r: 38 },

  { x: 54,  y: 409, r: 39 }, { x: 141, y: 410, r: 42 }, { x: 229, y: 409, r: 40 }, { x: 315, y: 410, r: 39 },
  { x: 403, y: 409, r: 40 }, { x: 491, y: 410, r: 40 }, { x: 580, y: 409, r: 40 }, { x: 666, y: 410, r: 39 },

  { x: 54,  y: 493, r: 38 }, { x: 142, y: 495, r: 39 }, { x: 228, y: 495, r: 38 }, { x: 314, y: 496, r: 39 },
  { x: 403, y: 495, r: 38 }, { x: 492, y: 495, r: 39 }, { x: 581, y: 497, r: 39 }, { x: 666, y: 497, r: 36 },

  { x: 52,  y: 582, r: 39 }, { x: 141, y: 582, r: 41 }, { x: 229, y: 584, r: 39 }, { x: 315, y: 583, r: 40 },
  { x: 403, y: 582, r: 40 }, { x: 491, y: 584, r: 41 }, { x: 580, y: 583, r: 41 }, { x: 668, y: 585, r: 39 },

  { x: 54,  y: 671, r: 38 }, { x: 140, y: 670, r: 38 }, { x: 229, y: 670, r: 39 }, { x: 314, y: 670, r: 38 },
  { x: 403, y: 671, r: 40 }, { x: 493, y: 670, r: 38 }, { x: 581, y: 670, r: 38 }, { x: 666, y: 672, r: 38 }
];

let board = Array(64).fill(null);
let currentPlayer = 1;
let placed = { 1: 0, 2: 0 };
let selected = null;
let gameOver = false;
let variant = null;
let hintsEnabled = true;

// Seneca state
let inciti = new Set(); // indices of trapped stones
let pendingRemovals = {
  1: [], // stones player 1 must remove on their turn
  2: []  // stones player 2 must remove on their turn
};
let lastMove = null; // { player, from, to }

const game = document.getElementById("game");
const holesContainer = document.getElementById("holes");
const piecesContainer = document.getElementById("pieces");

const variantText = document.getElementById("variantText");
const variantPicker = document.getElementById("variantPicker");
const choosePisoBtn = document.getElementById("choosePisoBtn");
const chooseSenecaBtn = document.getElementById("chooseSenecaBtn");

const turnText = document.getElementById("turnText");
const countP1Placed = document.getElementById("countP1Placed");
const countP2Placed = document.getElementById("countP2Placed");
const countP1Board = document.getElementById("countP1Board");
const countP2Board = document.getElementById("countP2Board");
const countP1Inciti = document.getElementById("countP1Inciti");
const countP2Inciti = document.getElementById("countP2Inciti");
const toggleHintsBtn = document.getElementById("toggleHintsBtn");
const resetBtn = document.getElementById("resetBtn");

const winModal = document.getElementById("winModal");
const winMessage = document.getElementById("winMessage");
const playAgainBtn = document.getElementById("playAgainBtn");

function scaleX(x) {
  return (x / BOARD_WIDTH) * game.clientWidth;
}

function scaleY(y) {
  return (y / BOARD_HEIGHT) * game.clientHeight;
}

function scaleR(r) {
  const sx = game.clientWidth / BOARD_WIDTH;
  const sy = game.clientHeight / BOARD_HEIGHT;
  return r * Math.min(sx, sy);
}

function getNodePixel(index) {
  const n = nodes[index];
  return { x: scaleX(n.x), y: scaleY(n.y) };
}

function rcToIndex(row, col) {
  return row * BOARD_SIZE + col;
}

function indexToRC(index) {
  return {
    row: Math.floor(index / BOARD_SIZE),
    col: index % BOARD_SIZE
  };
}

function inBounds(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function getOrthogonalNeighbors(index) {
  const { row, col } = indexToRC(index);
  const out = [];

  if (row > 0) out.push(rcToIndex(row - 1, col));
  if (row < BOARD_SIZE - 1) out.push(rcToIndex(row + 1, col));
  if (col > 0) out.push(rcToIndex(row, col - 1));
  if (col < BOARD_SIZE - 1) out.push(rcToIndex(row, col + 1));

  return out;
}

function isPlacementPhase() {
  return placed[1] < STONES_PER_PLAYER || placed[2] < STONES_PER_PLAYER;
}

function getOpponent(player) {
  return player === 1 ? 2 : 1;
}

function getPlayerStoneCount(player) {
  return board.filter(v => v === player).length;
}

function getIncitiCount(player) {
  let total = 0;
  for (const index of inciti) {
    if (board[index] === player) total++;
  }
  return total;
}

function updatePiecePosition(pieceEl, index) {
  const p = getNodePixel(index);
  pieceEl.style.left = `${p.x}px`;
  pieceEl.style.top = `${p.y}px`;
  pieceEl.dataset.index = String(index);
}

function clearSelection() {
  document.querySelectorAll(".piece.selected").forEach(el => {
    el.classList.remove("selected");
  });
  selected = null;
}

function getPieceElementAt(index) {
  return [...document.querySelectorAll(".piece")].find(
    el => Number(el.dataset.index) === index
  );
}

function refreshPieceStates() {
  document.querySelectorAll(".piece").forEach(piece => {
    const index = Number(piece.dataset.index);
    const player = Number(piece.dataset.player);
    const trapped = inciti.has(index);

    piece.classList.toggle("incitus", trapped);

    if (trapped) {
      piece.src = player === 1 ? "stone1incinitus.png" : "stone2incinitus.png";
    } else {
      piece.src = player === 1 ? "stone1.png" : "stone2.png";
    }
  });
}

function isLeapMove(from, to, player) {
  const a = indexToRC(from);
  const b = indexToRC(to);

  const dr = b.row - a.row;
  const dc = b.col - a.col;

  const orthogonalLeap =
    (Math.abs(dr) === 2 && dc === 0) ||
    (Math.abs(dc) === 2 && dr === 0);

  if (!orthogonalLeap) return false;
  if (board[to] !== null) return false;

  const midRow = a.row + dr / 2;
  const midCol = a.col + dc / 2;
  const midIndex = rcToIndex(midRow, midCol);

  return board[midIndex] === player && !inciti.has(midIndex);
}

function isStepMove(from, to) {
  if (board[to] !== null) return false;
  return getOrthogonalNeighbors(from).includes(to);
}

function repeatsBackAndForth(from, to, player) {
  if (!lastMove) return false;
  return (
    lastMove.player === player &&
    lastMove.from === to &&
    lastMove.to === from
  );
}

function isLegalMove(from, to, player) {
  if (board[from] !== player) return false;
  if (inciti.has(from)) return false;
  if (repeatsBackAndForth(from, to, player)) return false;

  return isStepMove(from, to) || isLeapMove(from, to, player);
}

function getLegalMovesForPiece(index, player) {
  const moves = [];

  const { row, col } = indexToRC(index);
  const candidates = [
    rcToIndex(row - 1, col),
    rcToIndex(row + 1, col),
    rcToIndex(row, col - 1),
    rcToIndex(row, col + 1),
    rcToIndex(row - 2, col),
    rcToIndex(row + 2, col),
    rcToIndex(row, col - 2),
    rcToIndex(row, col + 2)
  ].filter(i => i >= 0 && i < 64);

  for (const target of candidates) {
    const trc = indexToRC(target);
    if (!inBounds(trc.row, trc.col)) continue;
    if (isLegalMove(index, target, player)) moves.push(target);
  }

  return moves;
}

function refreshHoles() {
  document.querySelectorAll(".hole").forEach((holeEl, index) => {
    holeEl.classList.remove("occupied", "valid-target");

    if (!variant || gameOver || board[index] !== null) {
      holeEl.classList.add("occupied");
      return;
    }

    if (!hintsEnabled) {
      return;
    }

    if (isPlacementPhase()) {
      holeEl.classList.add("valid-target");
      return;
    }

    if (selected) {
      if (isLegalMove(selected.from, index, currentPlayer)) {
        holeEl.classList.add("valid-target");
      } else {
        holeEl.classList.add("occupied");
      }
    }
  });
}

function canRemovePendingThisTurn(player) {
  if (variant !== VARIANT_SENECA) return false;
  return getValidPendingRemovals(player).length > 0;
}

function getValidPendingRemovals(player) {
  const valid = [];
  const seen = new Set();

  for (const item of pendingRemovals[player]) {
    if (!item || seen.has(item.victim)) continue;
    seen.add(item.victim);

    if (board[item.victim] !== getOpponent(player)) continue;
    if (!inciti.has(item.victim)) continue;
    if (board[item.guardA] !== player) continue;
    if (board[item.guardB] !== player) continue;
    if (inciti.has(item.guardA) || inciti.has(item.guardB)) continue;

    valid.push(item);
  }

  return valid;
}

function updateStatus() {
  countP1Placed.textContent = placed[1];
  countP2Placed.textContent = placed[2];
  countP1Board.textContent = getPlayerStoneCount(1);
  countP2Board.textContent = getPlayerStoneCount(2);
  countP1Inciti.textContent = getIncitiCount(1);
  countP2Inciti.textContent = getIncitiCount(2);

  variantText.textContent =
    variant === VARIANT_PISO ? "Piso" :
    variant === VARIANT_SENECA ? "Seneca" :
    "Nog niet gekozen";

  if (!variant) {
    turnText.textContent = "Selecteer Piso of Seneca om te starten";
    turnText.className = "value";
    return;
  }

  if (gameOver) {
    turnText.textContent = "Het spel is voorbij";
    turnText.className = "value";
    return;
  }

  if (variant === VARIANT_SENECA && canRemovePendingThisTurn(currentPlayer)) {
    turnText.textContent = `Speler ${currentPlayer}: verwijder eerst 1 geldige incitus`;
    turnText.className = `value player-${currentPlayer}`;
    return;
  }

  if (isPlacementPhase()) {
    turnText.textContent = `Speler ${currentPlayer}: kies een leeg vak om een steen te plaatsen`;
  } else {
    if (!selected) {
      turnText.textContent =
        `Speler ${currentPlayer}: kies een vrije steen om te verplaatsen of te springen`;
    } else {
      turnText.textContent =
        `Speler ${currentPlayer}: verplaats 1 vak of spring over 1 eigen steen`;
    }
  }

  turnText.className = `value player-${currentPlayer}`;
}

function showWinPopup(player) {
  gameOver = true;
  clearSelection();
  refreshHoles();
  updateStatus();

  winMessage.textContent = `Speler ${player} wint!`;
  winModal.classList.remove("hidden");
}

function hideWinPopup() {
  winModal.classList.add("hidden");
}

function hasAnyLegalMove(player) {
  if (!variant) return true;
  if (isPlacementPhase()) return true;
  if (variant === VARIANT_SENECA && canRemovePendingThisTurn(player)) return true;

  for (let i = 0; i < board.length; i++) {
    if (board[i] !== player) continue;
    if (inciti.has(i)) continue;
    if (getLegalMovesForPiece(i, player).length > 0) return true;
  }

  return false;
}

function removeStoneAt(index) {
  board[index] = null;
  inciti.delete(index);

  pendingRemovals[1] = pendingRemovals[1].filter(item => item.victim !== index);
  pendingRemovals[2] = pendingRemovals[2].filter(item => item.victim !== index);

  const piece = getPieceElementAt(index);
  if (piece) piece.remove();
}

function freeIncitiWhoseGuardsFailed() {
  for (const player of [1, 2]) {
    const validVictims = new Set(
      getValidPendingRemovals(player).map(item => item.victim)
    );

    for (const item of pendingRemovals[player]) {
      if (board[item.victim] === null) continue;
      if (!validVictims.has(item.victim)) {
        inciti.delete(item.victim);
      }
    }

    pendingRemovals[player] = pendingRemovals[player].filter(item => {
      return board[item.victim] !== null && validVictims.has(item.victim);
    });
  }

  refreshPieceStates();
}

function getCaptureRecordsFromMove(toIndex, player) {
  const enemy = getOpponent(player);
  const found = [];

  const { row, col } = indexToRC(toIndex);

  const straightChecks = [
    [{ row, col: col + 1 }, { row, col: col + 2 }],
    [{ row, col: col - 1 }, { row, col: col - 2 }],
    [{ row: row + 1, col }, { row: row + 2, col }],
    [{ row: row - 1, col }, { row: row - 2, col }]
  ];

  for (const [mid, far] of straightChecks) {
    if (!inBounds(mid.row, mid.col) || !inBounds(far.row, far.col)) continue;

    const victim = rcToIndex(mid.row, mid.col);
    const guard = rcToIndex(far.row, far.col);

    if (board[victim] !== enemy) continue;
    if (inciti.has(guard)) continue;
    if (board[guard] !== player) continue;

    found.push({
      victim,
      guardA: toIndex,
      guardB: guard
    });
  }

  const cornerChecks = [
    { corner: 0, a: 1, b: 8 },
    { corner: 7, a: 6, b: 15 },
    { corner: 56, a: 48, b: 57 },
    { corner: 63, a: 55, b: 62 }
  ];

  for (const { corner, a, b } of cornerChecks) {
    if (board[corner] !== enemy) continue;

    if (toIndex === a && board[b] === player && !inciti.has(b)) {
      found.push({ victim: corner, guardA: a, guardB: b });
    }

    if (toIndex === b && board[a] === player && !inciti.has(a)) {
      found.push({ victim: corner, guardA: a, guardB: b });
    }
  }

  const unique = new Map();
  for (const item of found) {
    if (!unique.has(item.victim)) unique.set(item.victim, item);
  }

  return [...unique.values()];
}

function applyPisoCaptures(records) {
  for (const rec of records) {
    removeStoneAt(rec.victim);
  }
  refreshPieceStates();
}

function applySenecaTraps(records, player) {
  for (const rec of records) {
    if (board[rec.victim] !== getOpponent(player)) continue;
    inciti.add(rec.victim);

    const exists = pendingRemovals[player].some(item => item.victim === rec.victim);
    if (!exists) {
      pendingRemovals[player].push(rec);
    }
  }

  refreshPieceStates();
}

function checkForEndOfGame() {
  if (!variant) return false;
  if (isPlacementPhase()) return false;

  const opponent = getOpponent(currentPlayer);

  if (getPlayerStoneCount(opponent) <= 1) {
    showWinPopup(currentPlayer);
    return true;
  }

  if (!hasAnyLegalMove(opponent)) {
    showWinPopup(currentPlayer);
    return true;
  }

  return false;
}

function switchPlayer() {
  currentPlayer = getOpponent(currentPlayer);
  clearSelection();
  freeIncitiWhoseGuardsFailed();
  refreshHoles();
  updateStatus();

  if (!isPlacementPhase() && !hasAnyLegalMove(currentPlayer)) {
    showWinPopup(getOpponent(currentPlayer));
  }
}

function finishTurnAfterAction(moveInfo, wasMove) {
  if (wasMove) {
    lastMove = moveInfo;

    const records = getCaptureRecordsFromMove(moveInfo.to, currentPlayer);

    if (variant === VARIANT_PISO) {
      applyPisoCaptures(records);
    } else {
      applySenecaTraps(records, currentPlayer);
    }
  }

  freeIncitiWhoseGuardsFailed();
  refreshHoles();
  updateStatus();

  if (checkForEndOfGame()) return;
  switchPlayer();
}

function createPiece(player, index) {
  const el = document.createElement("img");
  el.src = player === 1 ? "stone1.png" : "stone2.png";
  el.className = "piece";
  el.dataset.player = String(player);
  el.draggable = false;

  updatePiecePosition(el, index);

  el.addEventListener("click", event => {
    event.stopPropagation();

    if (!variant || gameOver) return;

    if (variant === VARIANT_SENECA && canRemovePendingThisTurn(currentPlayer)) {
      const validPending = getValidPendingRemovals(currentPlayer);
      const pieceIndex = Number(el.dataset.index);
      const match = validPending.find(item => item.victim === pieceIndex);

      if (!match) return;

      removeStoneAt(pieceIndex);
      pendingRemovals[currentPlayer] = pendingRemovals[currentPlayer].filter(
        item => item.victim !== pieceIndex
      );
      freeIncitiWhoseGuardsFailed();
      refreshHoles();
      updateStatus();

      if (checkForEndOfGame()) return;
      switchPlayer();
      return;
    }

    if (isPlacementPhase()) return;
    if (Number(el.dataset.player) !== currentPlayer) return;

    const index = Number(el.dataset.index);
    if (inciti.has(index)) return;

    clearSelection();
    el.classList.add("selected");
    selected = {
      el,
      from: index
    };

    refreshHoles();
    updateStatus();
  });

  piecesContainer.appendChild(el);
}

function handleHoleClick(index) {
  if (!variant || gameOver) return;
  if (variant === VARIANT_SENECA && canRemovePendingThisTurn(currentPlayer)) return;

  if (placed[currentPlayer] < STONES_PER_PLAYER) {
    if (board[index] !== null) return;

    board[index] = currentPlayer;
    createPiece(currentPlayer, index);
    placed[currentPlayer]++;

    finishTurnAfterAction(null, false);
    return;
  }

  if (!selected) return;
  if (!isLegalMove(selected.from, index, currentPlayer)) return;

  const from = selected.from;

  board[from] = null;
  board[index] = currentPlayer;

  updatePiecePosition(selected.el, index);
  selected.el.classList.remove("selected");
  selected = null;

  finishTurnAfterAction({ player: currentPlayer, from, to: index }, true);
}

function createHoles() {
  holesContainer.innerHTML = "";

  nodes.forEach((node, index) => {
    const hole = document.createElement("div");
    const x = scaleX(node.x);
    const y = scaleY(node.y);
    const r = Math.max(scaleR(node.r), 16);

    hole.className = "hole";
    hole.style.left = `${x}px`;
    hole.style.top = `${y}px`;
    hole.style.width = `${r * 2}px`;
    hole.style.height = `${r * 2}px`;

    hole.addEventListener("click", () => handleHoleClick(index));

    holesContainer.appendChild(hole);
  });

  refreshHoles();
}

function repositionPieces() {
  document.querySelectorAll(".piece").forEach(pieceEl => {
    const index = Number(pieceEl.dataset.index);
    updatePiecePosition(pieceEl, index);
  });
  refreshPieceStates();
}

function chooseVariant(nextVariant) {
  variant = nextVariant;
  variantPicker.style.display = "none";
  resetGameState();
}

function resetGameState() {
  board = Array(64).fill(null);
  currentPlayer = 1;
  placed = { 1: 0, 2: 0 };
  selected = null;
  gameOver = false;
  inciti = new Set();
  pendingRemovals = { 1: [], 2: [] };
  lastMove = null;

  piecesContainer.innerHTML = "";
  hideWinPopup();
  createHoles();
  refreshPieceStates();
  updateStatus();
}

function resetAll() {
  if (!variant) {
    board = Array(64).fill(null);
    currentPlayer = 1;
    placed = { 1: 0, 2: 0 };
    selected = null;
    gameOver = false;
    inciti = new Set();
    pendingRemovals = { 1: [], 2: [] };
    lastMove = null;
    piecesContainer.innerHTML = "";
    hideWinPopup();
    createHoles();
    updateStatus();
    return;
  }

  resetGameState();
}

choosePisoBtn.addEventListener("click", () => chooseVariant(VARIANT_PISO));
chooseSenecaBtn.addEventListener("click", () => chooseVariant(VARIANT_SENECA));
resetBtn.addEventListener("click", resetAll);
playAgainBtn.addEventListener("click", resetAll);

window.addEventListener("load", () => {
  createHoles();
  updateStatus();
});

window.addEventListener("resize", () => {
  createHoles();
  repositionPieces();
});

toggleHintsBtn.addEventListener("click", () => {
  hintsEnabled = !hintsEnabled;

  toggleHintsBtn.textContent = hintsEnabled
    ? "Zet hints uit"
    : "Zet hints aan";

  refreshHoles();
});
