import React from 'react';
import './Cell.css';

const Cell = props => {
  const x = props.coord.split('-')[0];

  const styles = `
        row-${x}
        row
        grid-cell
        ${props.hasFood ? 'food' : ''}
        ${props.hasSnake ? 'snake' : ''}
    `;
  return <div className={styles} />;
};
export default Cell;
