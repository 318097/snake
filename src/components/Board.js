/* eslint-disable linebreak-style */
import React, { Component } from 'react';
import openSocket from 'socket.io-client';
import Cell from './Cell';
import './Board.scss';
import statusCodes from '../constants';

const short = require('short-uuid');

let socket;
export default class Board extends Component {
  constructor(props) {
    super(props);
    this.state = {
      url: 'http://localhost:3001',
      status: statusCodes.NOT_STARTED, // 0 - not started, 1 - in progress, 2 - finished, 3 - paused
      food: {},
      grid: [],
      score: 0,
      snake: [],
      message: 'Hit the play button',
      opponentSnake: [],
      gameMode: 'SINGLE',
      uid: short.generate(),
      direction: 'RIGHT',
      config: {
        refreshRate: 300,
        n: 20, // no of cells
      },
    };
  }

  componentDidMount() {
    document.addEventListener('keydown', this.setDirection);
    const grid = Array(this.state.config.n).fill(0).map(() => Array(this.state.config.n).fill(0));
    this.setState({ grid });
  }

  componentWillUnmount() {
    if (this.state.gameMode === 'MULTI') socket.emit('disconnect');
  }

  setGameMode = () => this.setState({ gameMode: this.state.gameMode === 'SINGLE' ? 'MULTI' : 'SINGLE' });

  saveGameState = () => {
    const gameResults = {
      playerId: this.state.uid,
      score: this.state.score,
      mode: this.state.gameMode
    }
    fetch(`${this.state.url}/api/snake/game-results`, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gameResults)
    }).then(result => console.log('Updated Successfully'));
  }

  setGameStatus = (status) => {
    let message;
    switch (status) {
      case statusCodes.FINISHED:
        message = 'Game Over!';
        clearInterval(this.repaintInterval);
        this.saveGameState();
        break;
      case statusCodes.PAUSED:
        message = 'Paused';
        clearInterval(this.repaintInterval);
        break;
      case statusCodes.IN_PROGRESS:
        message = 'In progress...'
        this.repaintInterval = setInterval(
          this.moveSnake,
          this.state.config.refreshRate
        );
        break;
      default:
        break;
    }
    this.setState({ status, message });
  }

  toggleGameState = () => {
    const { status: prevStatus, url } = this.state;
    if (prevStatus === statusCodes.IN_PROGRESS) this.setGameStatus(statusCodes.PAUSED);
    else if (prevStatus === statusCodes.PAUSED) this.setGameStatus(statusCodes.IN_PROGRESS);
    else {
      if (this.state.gameMode === 'MULTI') {
        socket = openSocket.connect(url);
        console.log('uid: ', this.state.uid);
        this.setState({ message: 'Waiting for opponent...' });
        socket.emit('join-game', this.state.uid);
        socket.on('start-game', () => {
          console.log('Game started.');
          this.setState({ message: 'Starting game...' });
          setTimeout(() => this.startGame(), 1000);
        });
        socket.on('game-updates', (updates) => {
          if (updates.type === 'FOOD') {
            // console.log('New food:', updates.food);
            this.setState({ food: updates.data });
          } else if (updates.type === 'POSITION') {
            if (this.state.uid !== updates.playerId) this.setState({ opponentSnake: updates.data });
          }
        });
        socket.on('game-over', () => {
          this.saveGameState();
          this.setState({ message: 'Game Over!' });
          this.setGameStatus(statusCodes.NOT_STARTED);
          socket.emit('disconnect');
        });
      } else {
        this.startGame();
      }
    }
  }

  setDirection = ({ which: keycode }) => {
    if (keycode === 32 && this.state.gameMode === 'SINGLE') this.toggleGameState(); // start/pause the game with space.

    const { direction: oldDirection } = this.state;
    let newDirection;
    if (keycode === 37 && oldDirection !== 'RIGHT') newDirection = 'LEFT';
    else if (keycode === 38 && oldDirection !== 'DOWN') newDirection = 'UP';
    else if (keycode === 39 && oldDirection !== 'LEFT') newDirection = 'RIGHT';
    else if (keycode === 40 && oldDirection !== 'UP') newDirection = 'DOWN';

    this.setState({
      direction: newDirection ? newDirection : oldDirection
    });
  }

  createFood = () => {
    const x = Math.floor((Math.random() * 100) % this.state.config.n);
    const y = Math.round((Math.random() * 100) % this.state.config.n);
    return { x, y };
  }

  checkCollision = (head) => {
    /* Wall collision */
    let hasCollision = false;
    if (
      head.x <= -1 ||
      head.x >= this.state.config.n ||
      head.y <= -1 ||
      head.y >= this.state.config.n
    ) {
      hasCollision = true;
    }
    /* Self collision */
    const body = this.state.snake.slice(1);
    for (let i = 0; i < body.length; i++) {
      if (head.x === body[i].x && head.y === body[i].y) {
        hasCollision = true;
        break;
      }
    }
    return hasCollision;
  }

  moveSnake = () => {
    let snake = this.state.snake.slice();
    let { food, direction, score, gameMode, uid } = this.state;

    let head = { ...snake[0] };

    if (this.checkCollision(head)) {
      this.setGameStatus(statusCodes.FINISHED);
      if (gameMode === 'MULTI') {
        socket.emit('player-dead', uid);
      }
      return;
    }
    // Check if food is eaten.
    if (head.x === food.x && head.y === food.y) {
      score++;
      if (gameMode === 'SINGLE') food = this.createFood();
      else {
        socket.emit('game-status', { data: food, type: 'FOOD' });
        food = {};
      }
    } else {
      snake.pop(); /* if the food is not eaten, then its popped */
    }
    if (direction === 'RIGHT') {
      head.y++;
    } else if (direction === 'LEFT') {
      head.y--;
    } else if (direction === 'UP') {
      head.x--;
    } else if (direction === 'DOWN') {
      head.x++;
    }
    snake.unshift(head);
    this.setState({
      snake,
      food,
      score,
    });
    if (this.state.gameMode === 'MULTI') {
      socket.emit('game-status', { data: snake, playerId: this.state.uid, type: 'POSITION' });
    }
  }

  startGame = () => {
    this.setState({
      status: statusCodes.IN_PROGRESS,
      score: 0,
      message: 'In progress...',
      direction: 'RIGHT',
      snake: [{ x: 2, y: 5 }, { x: 2, y: 4 }],
      food: this.state.gameMode === 'SINGLE' ? this.createFood() : socket.emit('game-status', { type: 'FOOD' }),
    });
    this.repaintInterval = setInterval(
      this.moveSnake,
      this.state.config.refreshRate
    );
  }

  render() {
    const { grid, status, food, snake, gameMode, opponentSnake, score, message } = this.state;

    const statusLabel = `${status}`;
    const statusClass = `status ` + statusLabel;
    const scoreClass = `score ${status === statusCodes.FINISHED ? 'finished' : ''}`;

    const scoreCard = {
      player1: { name: 'You', score, color: 'green' },
      player2: { name: 'Opponent', score: 0, color: 'red' }
    };

    const cells = grid.map((row, rowIndex) => {
      return (
        <div key={'row-' + rowIndex} className="grid-row">
          {row.map((_, colIndex) => {
            const obj = {
              snake: { present: false },
              opponentSnake: { present: false }
            };

            obj.food = rowIndex === food.x && colIndex === food.y;
            const hasSnake = snake.filter(cell => cell.x === rowIndex && cell.y === colIndex);
            obj.snake.present = !!(hasSnake.length && hasSnake[0]);

            if (gameMode === 'MULTI') {
              let hasOpponentSnake = opponentSnake.filter(cell => cell.x === rowIndex && cell.y === colIndex);
              obj.opponentSnake.present = !!(hasOpponentSnake.length && hasOpponentSnake[0]);
            }

            return (
              <Cell
                coord={rowIndex + '-' + colIndex}
                key={'row' + rowIndex + '-col' + colIndex}
                obj={obj}
              />
            );
          })}
        </div>
      );
    });

    return (
      <div className="content">
        <header>
          <h3>
            S<span style={{ color: 'white' }}>n</span>ake{' '}
            <span title={statusLabel} className={statusClass} />
          </h3>
          <div className={scoreClass}>
            S<span style={{ color: 'white' }}>c</span>ore:{' '}
            <span style={{ color: 'white', fontSize: '135%' }}>
              {score}
            </span>
          </div>
        </header>
        <section>
          <div className="board">
            {cells}
          </div>
          <div className="sidebar">
            <Card mode={gameMode} scoreCard={scoreCard} message={message} />
          </div>

          <span title={gameMode + ' PLAYER'} className="game-mode icon" onClick={() => this.setGameMode()}>
            {
              gameMode === 'SINGLE' ?
                (<i className="fas fa-dice-one"></i>) :
                (<i className="fas fa-dice-two"></i>)
            }
          </span>

          <span title="Play" className="play icon" onClick={this.toggleGameState}>
            {
              status === statusCodes.IN_PROGRESS ?
                (<i className="far fa-pause-circle" />) :
                (<i className="far fa-play-circle" />)
            }
          </span>
        </section>
      </div>
    );
  }
}

const Card = ({ mode, scoreCard, message }) => {
  return (
    <React.Fragment>
      <div className="block">
        <div className="hint">Mode:</div>
        <div className="text">{mode === 'SINGLE' ? 'Single Player' : 'Multi Player'}</div>
      </div>

      <div className="block">
        <div className="hint">Message:</div>
        <div className="text">{message}</div>
      </div>

      <div className="block">
        <div className="hint">Scorecard</div>
        <div className="text">
          <span>
            {scoreCard.player1.name ? scoreCard.player1.name : 'Player 1'}
          </span>
          <span style={{ fontSize: '120%' }}>{': ' + scoreCard.player1.score}</span>
        </div>

        <div className="text">
          <span>
            {scoreCard.player2.name ? scoreCard.player2.name : 'Player 2'}
            <span style={{ fontSize: '120%' }}>{': ' + scoreCard.player2.score}</span>
          </span>
        </div>
      </div>
    </React.Fragment>
  );
};