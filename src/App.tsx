/// <summary>
/// Componente App.tsx
/// </summary>
import { RouterProvider } from 'react-router-dom';
import router from './router';
import { AuthProvider } from './context/AuthContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import GlobalErrorModal from './components/common/GlobalErrorModal';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RouterProvider router={router} />
        <GlobalErrorModal />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;