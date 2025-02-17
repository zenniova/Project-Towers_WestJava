import React, { Suspense, lazy } from 'react';
import { RootProvider } from './contexts/RootProvider';
import LoadingIndicator from './components/LoadingIndicator';
import './styles/Dashboard.css';

// Lazy load main components
const Dashboard = lazy(() => import('./components/Dashboard'));

function App() {
  return (
    <RootProvider>
      <div className="App">
        <Suspense fallback={<LoadingIndicator message="Loading application..." />}>
          <Dashboard />
        </Suspense>
      </div>
    </RootProvider>
  );
}

export default App; 