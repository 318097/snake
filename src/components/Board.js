/* eslint-disable linebreak-style */
import React, { Component } from 'react';
import openSocket from 'socket.io-client';
import Cell from './Cell';
import './Board.css';
import statusCodes from '../constants';

const short = require('short-uuid');

let socket;
export default class Board extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status: statusCodes.NOT_STARTED, // 0 - not started, 1 - in progress, 2 - finished, 3 - paused
      food: {},
      grid: [],
      score: 0,
      snake: [],
      message: '',
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

  setGameStatus = (status) => {
    switch (status) {
      case statusCodes.FINISHED:
      case statusCodes.PAUSED:
        clearInterval(this.repaintInterval);
        break;
      case statusCodes.IN_PROGRESS:
        this.repaintInterval = setInterval(
          this.moveSnake,
          this.state.config.refreshRate
        );
        break;
      default:
        break;
    }
    this.setState({ status });
  }

  toggleGameState = () => {
    const { status: prevStatus } = this.state;
    if (prevStatus === statusCodes.IN_PROGRESS) this.setGameStatus(statusCodes.PAUSED);
    else if (prevStatus === statusCodes.PAUSED) this.setGameStatus(statusCodes.IN_PROGRESS);
    else {
      if (this.state.gameMode === 'MULTI') {
        socket = openSocket.connect('http://localhost:3001');
        console.log('uid: ', this.state.uid);
        socket.emit('join-game', this.state.uid);
        socket.on('start-game', () => {
          console.log('Game started.');
          this.startGame();
        });
        socket.on('game-updates', (updates) => {
          if (updates.type === 'FOOD') {
            console.log('New food:', updates.food);
            this.setState({ food: updates.data });
          } else if (updates.type === 'POSITION') {
            if (this.state.uid !== updates.playerId) this.setState({ opponentSnake: updates.data });
          }
        });
        socket.on('game-over', () => {
          console.log('GAME OVER !!!');
          this.setGameStatus(statusCodes.NOT_STARTED);
          socket.emit('disconnect');
        });
      } else {
        this.startGame();
      }
    }
  }

  setDirection = ({ which: keycode }) => {
    if (keycode === 32) this.toggleGameState(); // start/pause the game with space.

    const { direction: oldDirection } = this.state;
    let newDirection;
    if (keycode === 37 && oldDirection !== 'RIGHT') newDirection = 'LEFT';
    if (keycode === 38 && oldDirection !== 'DOWN') newDirection = 'UP';
    if (keycode === 39 && oldDirection !== 'LEFT') newDirection = 'RIGHT';
    if (keycode === 40 && oldDirection !== 'UP') newDirection = 'DOWN';

    this.setState({
      direction: newDirection ? newDirection : this.state.direction
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
    const { grid, status } = this.state;

    const statusLabel = `${status}`;
    const statusClass = `status ` + statusLabel;
    const scoreClass = `score ${status === statusCodes.FINISHED ? 'finished' : ''}`;

    const cells = grid.map((row, rowIndex) => {
      return (
        <div key={'row-' + rowIndex} className="grid-row">
          {row.map((col, colIndex) => {
            const obj = {
              snake: { color: this.state.color, present: false },
              opponentSnake: { color: this.state.opponentColor, present: false }
            };

            obj.food = rowIndex === this.state.food.x && colIndex === this.state.food.y;
            const hasSnake = this.state.snake.filter(cell => cell.x === rowIndex && cell.y === colIndex);
            obj.snake.present = !!(hasSnake.length && hasSnake[0]);

            if (this.state.gameMode === 'MULTI') {
              let hasOpponentSnake = this.state.opponentSnake.filter(cell => cell.x === rowIndex && cell.y === colIndex);
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
            <span style={{ color: 'white', fontSize: '130%' }}>
              {this.state.score}
            </span>
          </div>
        </header>
        <div className="board">
          <div className="overlay">
            <span style={{ width: '20px', height: '20px', background: this.state.color, display: 'block' }}></span>
            <span title={this.state.gameMode + ' PLAYER'} className="game-mode icon" onClick={() => this.setGameMode()}>
              {
                this.state.gameMode === 'SINGLE' ?
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
          </div>
          {cells}
        </div>
      </div>
    );
  }
}
