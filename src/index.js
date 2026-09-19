import React from 'react';
import ReactDOM from 'react-dom/client';
import './app.css';
import App from './app';
import AppErrorBoundary from './components/AppErrorBoundary';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);
