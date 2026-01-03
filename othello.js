class OthelloGame {
    constructor(difficulty = 'easy') {
        this.board = [];
        this.boardSize = 8;
        this.currentPlayer = 1; // 1: Player (Black), -1: CPU (White)
        this.difficulty = difficulty; // 'easy' or 'hard'
        this.gameOver = false;
        this.canClick = true;
        this.container = document.getElementById('othello-board');
        this.messageEl = document.getElementById('othello-message');
        this.scoreBlackEl = document.getElementById('score-black');
        this.scoreWhiteEl = document.getElementById('score-white');
        
        this.init();
    }

    init() {
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(0));
        // Initial setup
        const mid = this.boardSize / 2;
        this.board[mid-1][mid-1] = -1;
        this.board[mid][mid] = -1;
        this.board[mid-1][mid] = 1;
        this.board[mid][mid-1] = 1;

        this.currentPlayer = 1;
        this.gameOver = false;
        this.canClick = true;
        this.renderBoard();
        this.updateScore();
        this.updateMessage("あなたの番です (黒)");
    }

    renderBoard() {
        this.container.innerHTML = '';
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                const cell = document.createElement('div');
                cell.className = 'othello-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                if (this.board[y][x] !== 0) {
                    const disc = document.createElement('div');
                    disc.className = `othello-disc ${this.board[y][x] === 1 ? 'black' : 'white'}`;
                    cell.appendChild(disc);
                }

                // Show valid moves for player
                if (this.currentPlayer === 1 && this.isValidMove(x, y, 1)) {
                    cell.classList.add('valid-move');
                    cell.addEventListener('click', () => this.handleCellClick(x, y));
                }

                this.container.appendChild(cell);
            }
        }
    }

    handleCellClick(x, y) {
        if (this.gameOver || !this.canClick || this.currentPlayer !== 1) return;

        if (this.placeDisc(x, y, 1)) {
            this.canClick = false;
            this.renderBoard();
            this.updateScore();
            
            if (this.checkGameOver()) return;

            this.currentPlayer = -1;
            this.updateMessage("カッパ思考中...");
            
            setTimeout(() => {
                this.computerMove();
            }, 1000);
        }
    }

    placeDisc(x, y, player) {
        if (!this.isValidMove(x, y, player)) return false;

        const flipped = this.getFlippedDiscs(x, y, player);
        this.board[y][x] = player;
        flipped.forEach(pos => {
            this.board[pos.y][pos.x] = player;
        });
        return true;
    }

    isValidMove(x, y, player) {
        if (this.board[y][x] !== 0) return false;
        return this.getFlippedDiscs(x, y, player).length > 0;
    }

    getFlippedDiscs(x, y, player) {
        const directions = [
            [0, 1], [1, 0], [0, -1], [-1, 0],
            [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];
        let flipped = [];

        directions.forEach(dir => {
            let cx = x + dir[0];
            let cy = y + dir[1];
            let potential = [];

            while (cx >= 0 && cx < this.boardSize && cy >= 0 && cy < this.boardSize) {
                if (this.board[cy][cx] === 0) break;
                if (this.board[cy][cx] === player) {
                    flipped.push(...potential);
                    break;
                }
                potential.push({x: cx, y: cy});
                cx += dir[0];
                cy += dir[1];
            }
        });
        return flipped;
    }

    computerMove() {
        if (this.gameOver) return;

        // Skip if no moves
        const validMoves = this.getAllValidMoves(-1);
        if (validMoves.length === 0) {
            this.updateMessage("カッパはパスしました");
            this.currentPlayer = 1;
            this.canClick = true;
            this.renderBoard();
            
            // Check if player also has no moves -> Game OVer
            if (this.getAllValidMoves(1).length === 0) {
                this.checkGameOver();
            }
            return;
        }

        let bestMove;
        if (this.difficulty === 'easy') {
            // Random move
            const randomIdx = Math.floor(Math.random() * validMoves.length);
            bestMove = validMoves[randomIdx];
        } else {
            // Serious mode
            bestMove = this.getBestMove(validMoves);
        }

        this.placeDisc(bestMove.x, bestMove.y, -1);
        this.renderBoard();
        this.updateScore();
        
        if (this.checkGameOver()) return;

        // Check if player can move
        const playerMoves = this.getAllValidMoves(1);
        if (playerMoves.length === 0) {
            this.updateMessage("あなたの打つ場所がありません。パスです。");
            setTimeout(() => {
                this.computerMove();
            }, 1500);
        } else {
            this.currentPlayer = 1;
            this.canClick = true;
            this.updateMessage("あなたの番です (黒)");
            this.renderBoard(); // Update valid moves hint
        }
    }

    getAllValidMoves(player) {
        let moves = [];
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.isValidMove(x, y, player)) {
                    moves.push({x, y});
                }
            }
        }
        return moves;
    }

    getBestMove(moves) {
        // Simple heuristic: corners > edges > others
        // Avoid X-squares and C-squares near corners if corner not taken (simplified logic)
        
        let bestScore = -Infinity;
        let bestMove = moves[0];

        // Positional weights
        const weights = [
            [100, -20, 10,  5,  5, 10, -20, 100],
            [-20, -50, -2, -2, -2, -2, -50, -20],
            [ 10,  -2, -1, -1, -1, -1,  -2,  10],
            [  5,  -2, -1, -1, -1, -1,  -2,   5],
            [  5,  -2, -1, -1, -1, -1,  -2,   5],
            [ 10,  -2, -1, -1, -1, -1,  -2,  10],
            [-20, -50, -2, -2, -2, -2, -50, -20],
            [100, -20, 10,  5,  5, 10, -20, 100]
        ];

        // Minimax could be added here, but for "Strong" just ensuring he takes good positions is often enough for a mini-game
        // Let's implement a 1-ply search with weights for responsiveness
        
        moves.forEach(move => {
            let score = weights[move.y][move.x];
            // Simulate move to count flips
            const flips = this.getFlippedDiscs(move.x, move.y, -1).length;
            score += flips; // Prefer moves that flip more discs slightly

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        });

        return bestMove;
    }

    updateScore() {
        let black = 0;
        let white = 0;
        for (let y = 0; y < this.boardSize; y++) {
            for (let x = 0; x < this.boardSize; x++) {
                if (this.board[y][x] === 1) black++;
                else if (this.board[y][x] === -1) white++;
            }
        }
        this.scoreBlackEl.textContent = black;
        this.scoreWhiteEl.textContent = white;
        return {black, white};
    }

    updateMessage(msg) {
        this.messageEl.textContent = msg;
    }

    checkGameOver() {
        const movesBlack = this.getAllValidMoves(1).length;
        const movesWhite = this.getAllValidMoves(-1).length;

        if (movesBlack === 0 && movesWhite === 0) {
            this.gameOver = true;
            const score = this.updateScore();
            let msg = "";
            if (score.black > score.white) msg = "あなたの勝ちです！カッパ「参りました...」";
            else if (score.white > score.black) msg = "カッパの勝ちです！カッパ「まだまだ修行が足りぬのう」";
            else msg = "引き分けです！カッパ「良い勝負であった」";
            
            this.updateMessage(msg);
            return true;
        }
        return false;
    }
}

// UI Handling
document.addEventListener('DOMContentLoaded', () => {
    let game;
    const startBtn = document.getElementById('start-game-btn');
    const difficultySelect = document.getElementById('difficulty-select');
    const gameArea = document.getElementById('game-area');

    if (startBtn) {
        startBtn.addEventListener('click', () => {
            const difficulty = difficultySelect.value;
            gameArea.style.display = 'block';
            game = new OthelloGame(difficulty);
            // Scroll to game
            gameArea.scrollIntoView({behavior: 'smooth'});
        });
    }
});
