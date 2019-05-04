import React from 'react';
import './Cell.css';

const Cell = ({ coord, obj }) => {
  const xCoord = coord.split('-')[0];
  const cellBackground =
    obj.snake.present ?
      'snake' : obj.opponentSnake.present ?
        'opponent-snake' : obj.food ?
          'food' : '';

  let classes = `
        row-${xCoord}
        row
        grid-cell
        ${cellBackground}
    `;
  return <div
    className={classes} >
  </div>;
};
export default Cell;
