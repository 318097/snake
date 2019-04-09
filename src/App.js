/* eslint-disable react/jsx-filename-extension */
import React, { Component } from 'react';
import './App.css';

/* Components */
import Board from './components/Board';

// eslint-disable-next-line react/prefer-stateless-function
class App extends Component {
  render() {
    return (
      <div className="container">
        <Board />
      </div>
    );
  }
}

export default App;
