import React, { Component } from 'react';
import Cell from './Cell';
import './Board.css';

export default class Board extends Component {
  constructor(props) {
    super(props);
    this.state = {
      status: 0, // 0 - not started, 1 - in progress, 2 - finished, 3 - paused
      food: {},
      score: 0,
      snake: [],
      direction: 'RIGHT',
      config: {
        refreshRate: 260,
        n: 20 // no of cells
      }
    };
    this.handleGameStatus = this.handleGameStatus.bind(this);
    this.startGame = this.startGame.bind(this);
    this.moveSnake = this.moveSnake.bind(this);
    this.setDirection = this.setDirection.bind(this);
  }
  componentDidMount() {
    document.addEventListener('keydown', this.setDirection);
  }
  handleGameStatus() {
    if (this.state.status === 1) {
      // pause the game
      clearInterval(this.repaintInterval);
      this.setState({
        status: 3
      });
    } else if (this.state.status === 3) {
      // resume the game
      this.repaintInterval = setInterval(
        this.moveSnake,
        this.state.config.refreshRate
      );
      this.setState({
        status: 1
      });
    } else {
      this.startGame();
    }
  }
  startGame() {
    this.setState({
      status: 1,
      score: 0,
      direction: 'RIGHT',
      snake: [{ x: 2, y: 5 }, { x: 2, y: 4 }, { x: 2, y: 3 }]
    });
    this.createFood();
    this.repaintInterval = setInterval(
      this.moveSnake,
      this.state.config.refreshRate
    );
    // this.el.focus(); // For the keydown event to work
  }
  createFood() {
    const x = Math.floor((Math.random() * 100) % this.state.config.n);
    const y = Math.round((Math.random() * 100) % this.state.config.n);
    this.setState({
      food: { x, y }
    });
  }
  checkCollision(head) {
    /* Check for wall & self collision */
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
    if (hasCollision) {
      this.setState({
        status: 2
      });
      clearInterval(this.repaintInterval);
      return true;
    }
    return false;
  }
  moveSnake() {
    const dir = this.state.direction;
    const food = this.state.food;
    let snake = this.state.snake.slice();

    let head = { ...snake[0] };

    /* If there is a collision, then break out */
    if (this.checkCollision(head)) return;

    // Check if food is eaten.
    if (head.x === food.x && head.y === food.y) {
      this.setState({
        score: this.state.score + 1
      });
      this.createFood();
      /* last item need not be popped. that increases the length  */
    } else {
      /* if the food is not eaten, then its popped */
      snake.pop();
    }
    if (dir === 'RIGHT') {
      head.y++;
    } else if (dir === 'LEFT') {
      head.y--;
    } else if (dir === 'UP') {
      head.x--;
    } else if (dir === 'DOWN') {
      head.x++;
    }
    snake.unshift(head);
    this.setState({
      snake: snake
    });
  }
  setDirection({ which: keycode }) {
    // start/pause the game with space.
    if (keycode === 32) this.handleGameStatus();

    const oldDirection = this.state.direction;
    let dir;
    if (keycode === 37 && oldDirection !== 'RIGHT') dir = 'LEFT';
    if (keycode === 38 && oldDirection !== 'DOWN') dir = 'UP';
    if (keycode === 39 && oldDirection !== 'LEFT') dir = 'RIGHT';
    if (keycode === 40 && oldDirection !== 'UP') dir = 'DOWN';

    this.setState({
      direction: dir ? dir : this.state.direction
    });
  }
  render() {
    const noOfCells = this.state.config.n;
    const status = this.state.status;

    let statusClass = `status ${
      status === 0
        ? 'not-started'
        : status === 1
        ? 'in-progress'
        : status === 2
        ? 'finished'
        : 'paused'
    }`;
    let statusLabel = `${
      status === 0
        ? 'Not Started'
        : status === 1
        ? 'In Progress'
        : status === 2
        ? 'Finished'
        : 'Paused'
    }`;
    const scoreClass = `score ${status === 2 ? 'finished' : ''}`;
    const cellIndexes = Array.from(Array(noOfCells).keys());
    const cells = cellIndexes.map(x => {
      return (
        <div key={'row-' + x} className="grid-row">
          {cellIndexes.map(y => {
            const hasFood = x === this.state.food.x && y === this.state.food.y;
            let hasSnake = this.state.snake.filter(s => s.x === x && s.y === y);
            hasSnake = !!(hasSnake.length && hasSnake[0]);
            return (
              <Cell
                coord={x + '-' + y}
                key={x + '' + y}
                hasFood={hasFood}
                hasSnake={hasSnake}
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
            <span style={{ color: 'white' }}>{this.state.score}</span>
          </div>
        </header>
        <div className="board">
          <div className="overlay">
            {/* <button onClick={this.startGame}>Start</button> */}
            <span title="Play" className="play" onClick={this.handleGameStatus}>
              {status === 1 ? (
                <i className="far fa-pause-circle" />
              ) : (
                <i className="far fa-play-circle" />
              )}
            </span>
          </div>
          {cells}
        </div>
      </div>
    );
  }
}
